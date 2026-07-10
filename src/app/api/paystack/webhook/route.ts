import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPaystackChannel } from "@/lib/paystack";

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
    const eventData = event.data;
    const reference = eventData.reference;
    const metadata = eventData.metadata || {};
    const status = eventData.status;
    const channel = eventData.channel || eventData?.authorization?.channel;

    if (event.event === "charge.success" && status === "success") {
      if (!reference) {
        return NextResponse.json({ received: true });
      }

      const payment = await prisma.payment.findUnique({
        where: { reference },
      });

      if (payment && payment.status !== "SUCCESS") {
        const order = await prisma.order.findUnique({
          where: { id: metadata.orderId || payment.orderId },
          select: { salespersonId: true, orderNumber: true },
        });

        const orderId = metadata.orderId || payment.orderId;
        const isPOS = !!order?.salespersonId;
        const newStatus = isPOS ? "COMPLETED" : "PROCESSING";

        await prisma.payment.update({
          where: { reference },
          data: {
            status: "SUCCESS",
            method: mapPaystackChannel(channel),
            paidAt: new Date(),
            mpesaReceipt: eventData.receipt?.number || null,
          },
        });

        await prisma.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });

        await prisma.auditLog.create({
          data: {
            userId: metadata.userId || "system",
            action: "PAYMENT_WEBHOOK",
            details: `Webhook: Payment ${reference} confirmed for order ${order?.orderNumber || orderId}.`,
          },
        });
      }
    }

    if (event.event === "charge.failed") {
      if (reference) {
        await prisma.payment.updateMany({
          where: { reference, status: "PENDING" },
          data: { status: "FAILED" },
        });

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
      }

      await prisma.auditLog.create({
        data: {
          userId: metadata.userId || "system",
          action: "PAYMENT_FAILED",
          details: `Webhook: Payment ${reference} failed for order ${metadata.orderNumber || "unknown"}. Order set to FAILED.`,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
