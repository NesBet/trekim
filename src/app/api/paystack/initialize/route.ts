import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";
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

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
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

    if (order.customerId !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status === "FAILED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This order can no longer be paid" },
        { status: 400 }
      );
    }

    if (order.payment?.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const result = await initializeTransaction({
      email: user?.email || "customer@trekim.co.ke",
      amount: order.total,
      reference: `CARD-${order.id}-${Date.now()}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: session.userId,
      },
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        reference: result.data.reference,
        method: "CARD",
        status: "PENDING",
      },
      create: {
        orderId: order.id,
        amount: order.total,
        reference: result.data.reference,
        method: "CARD",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference,
    });
  } catch (error) {
    console.error("Paystack initialize error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
