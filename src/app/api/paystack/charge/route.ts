import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { chargeMobileMoney, detectMobileNetwork, formatPhone } from "@/lib/paystack";
import { validatePhone } from "@/lib/utils";
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
    const { orderId, phone } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!phone || !validatePhone(phone)) {
      return NextResponse.json(
        { error: "Valid Kenyan phone number is required" },
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

    if (session.role === "CUSTOMER" && order.customerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.role === "SALESPERSON" && order.salespersonId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.payment?.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const provider = detectMobileNetwork(formattedPhone);
    const reference = `MOB-${order.id}-${Date.now()}`;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const chargeResult = await chargeMobileMoney({
      email: user?.email || (session.role === "CUSTOMER" ? `${session.userId}@trekim.co.ke` : "pos@trekim.co.ke"),
      amount: order.total,
      phone: formattedPhone,
      reference,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: session.userId,
        phone: formattedPhone,
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
        action: "MOBILE_MONEY_CHARGE",
        details: `Mobile money charge initiated for order ${order.orderNumber} via ${provider}. Reference: ${reference}`,
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      provider,
      orderId: order.id,
      message: provider === "mpesa" ? "STK push sent to your M-Pesa phone" : "Payment request sent to your Airtel Money phone",
    });
  } catch (error) {
    console.error("Mobile money charge error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate mobile money payment" },
      { status: 500 }
    );
  }
}
