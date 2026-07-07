import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction, mapPaystackChannel } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Reference is required" },
        { status: 400 }
      );
    }

    const result = await verifyTransaction(reference);
    const { status, channel } = result.data;

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
            method: mapPaystackChannel(channel),
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
            details: `Payment ${reference} verified for order ${orderData?.orderNumber}. Status set to ${newStatus} (${isPOS ? "POS" : "Online"}).`,
          },
        });
      }

      return NextResponse.json({ status: "success" });
    }

    await prisma.payment.updateMany({
      where: { reference, status: "PENDING" },
      data: { status: "FAILED" },
    });

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Paystack verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
