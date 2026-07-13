import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyTransaction, checkChargeStatus, mapPaystackChannel } from "@/lib/paystack";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60000, maxRequests: 30 });

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request);
    const { allowed } = await limiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Reference is required" },
        { status: 400 }
      );
    }

    let status: string;
    let channel: string | undefined;

    if (reference.startsWith("CARD-")) {
      const result = await verifyTransaction(reference);
      status = result.data.status;
      channel = result.data.channel;
    } else {
      try {
        const result = await checkChargeStatus(reference);
        status = result.data.status;
      } catch {
        const payment = await prisma.payment.findUnique({ where: { reference } });
        status = payment?.status === "SUCCESS" ? "success" : (payment?.status === "FAILED" ? "failed" : "pending");
      }
    }

    if (status === "success") {
      const payment = await prisma.payment.findUnique({
        where: { reference },
        include: { order: true },
      });

      if (payment && payment.status !== "SUCCESS") {
        const orderData = await prisma.order.findUnique({
          where: { id: payment.orderId },
          select: { salespersonId: true, orderNumber: true },
        });

        const isPOS = !!orderData?.salespersonId;
        const newStatus = isPOS ? "COMPLETED" : "PROCESSING";

        await prisma.payment.update({
          where: { reference },
          data: {
            status: "SUCCESS",
            method: mapPaystackChannel(channel || "mobile_money"),
            paidAt: new Date(),
          },
        });

        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: newStatus },
        });

        await prisma.auditLog.create({
          data: {
            action: "PAYMENT_VERIFIED",
            details: `Payment ${reference} verified for order ${orderData?.orderNumber}.`,
          },
        });
      }

      return NextResponse.json({ status: "success" });
    }

    if (status === "failed") {
      const failedPayment = await prisma.payment.findUnique({
        where: { reference },
        select: { orderId: true },
      });

      if (failedPayment) {
        await prisma.order.update({
          where: { id: failedPayment.orderId },
          data: { status: "FAILED" },
        });
      }

      await prisma.payment.updateMany({
        where: { reference, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Paystack verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
