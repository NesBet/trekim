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
          data: { status: "CONFIRMED" },
        });

        await prisma.auditLog.create({
          data: {
            action: "PAYMENT_VERIFIED",
            details: `Payment ${reference} verified successfully for order ${payment.order.orderNumber}`,
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
