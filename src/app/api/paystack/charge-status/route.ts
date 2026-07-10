import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkChargeStatus } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Reference is required" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { order: { select: { id: true, orderNumber: true, salespersonId: true, customerId: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const order = payment.order;
    const isOwner =
      (session.role === "CUSTOMER" && order.customerId === session.userId) ||
      (session.role === "SALESPERSON" && order.salespersonId === session.userId);

    if (!isOwner && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json({
        status: payment.status,
        paid: payment.status === "SUCCESS",
      });
    }

    const result = await checkChargeStatus(reference);

    if (result.data.status === "success") {
      const isPOS = !!order.salespersonId;
      const newStatus = isPOS ? "COMPLETED" : "PROCESSING";

      await prisma.payment.update({
        where: { reference },
        data: {
          status: "SUCCESS",
          method: "MPESA",
          paidAt: new Date(),
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "CHARGE_CONFIRMED",
          details: `Mobile money charge confirmed for order ${order.orderNumber}. Status set to ${newStatus}`,
        },
      });

      return NextResponse.json({ status: "SUCCESS", paid: true });
    }

    if (result.data.status === "failed") {
      await prisma.payment.updateMany({
        where: { reference, status: "PENDING" },
        data: { status: "FAILED" },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json({ status: "FAILED", paid: false });
    }

    return NextResponse.json({ status: "PENDING", paid: false });
  } catch (error) {
    console.error("Charge status check error:", error);
    return NextResponse.json(
      { error: "Failed to check charge status" },
      { status: 500 }
    );
  }
}
