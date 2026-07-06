import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { initiateSTKPush } from "@/lib/paystack";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60000, maxRequests: 10 });

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await limiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, phone } = body;

    if (!orderId || !phone) {
      return NextResponse.json(
        { error: "Order ID and phone number are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (
      session.role === "SALESPERSON" &&
      order.salespersonId !== session.userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.payment?.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    const reference = `TRK-${order.orderNumber}-${Date.now()}`;

    const result = await initiateSTKPush({
      amount: order.total,
      phone,
      reference,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: session.userId,
      },
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        reference,
        method: "MPESA",
        status: "PENDING",
      },
      create: {
        orderId: order.id,
        amount: order.total,
        reference,
        method: "MPESA",
        status: "PENDING",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "STK_PUSH",
        details: `STK push initiated for order ${order.orderNumber}. Phone: ${phone}, Reference: ${reference}`,
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      orderId: order.id,
      message: "STK push sent to customer's phone",
    });
  } catch (error) {
    console.error("STK push error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "STK push failed" },
      { status: 500 }
    );
  }
}
