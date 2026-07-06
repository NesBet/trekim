import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { reference, metadata, status } = event.data;

      if (status === "success" && metadata?.orderId) {
        const payment = await prisma.payment.findUnique({
          where: { reference },
          include: { order: true },
        });

        if (payment && payment.status !== "SUCCESS") {
          await prisma.payment.update({
            where: { reference },
            data: {
              status: "SUCCESS",
              paidAt: new Date(),
              mpesaReceipt: event.data.receipt?.number || null,
            },
          });

          await prisma.order.update({
            where: { id: metadata.orderId },
            data: { status: "CONFIRMED" },
          });

          await prisma.auditLog.create({
            data: {
              userId: metadata.userId,
              action: "PAYMENT_WEBHOOK",
              details: `Webhook: Payment ${reference} confirmed for order ${metadata.orderNumber}`,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
