import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    let where: Record<string, unknown> = {};

    if (session.role === "CUSTOMER") {
      where.customerId = session.userId;
    } else if (session.role === "SALESPERSON") {
      where.salespersonId = session.userId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.payment = { status: paymentStatus };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { name: true, image: true } } },
        },
        payment: true,
        customer: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      items,
      customerId,
      deliveryLocation,
      paymentMethod,
      customerName,
      customerPhone,
      cashAmount,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let total = 0;
    const orderItems = items.map(
      (item: { productId: string; quantity: number }) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        const price = product.price;
        total += price * item.quantity;
        return {
          productId: item.productId,
          quantity: item.quantity,
          price,
        };
      }
    );

    const orderNumber = generateOrderNumber();

    const isCash = paymentMethod === "CASH";
    const isSalesperson = session.role !== "CUSTOMER";

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customerId || (session.role === "CUSTOMER" ? session.userId : null),
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        salespersonId: isSalesperson ? session.userId : null,
        total,
        status: isCash ? "COMPLETED" : "PENDING",
        deliveryLocation: deliveryLocation || null,
        items: { create: orderItems },
      },
      include: {
        items: {
          include: { product: { select: { name: true, price: true } } },
        },
      },
    });

    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    let payment = null;
    let change = 0;

    if (isCash) {
      const ref = `CASH-${orderNumber}`;
      change = (cashAmount || 0) - total;
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          reference: ref,
          method: "CASH",
          status: "SUCCESS",
          paidAt: new Date(),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "CASH_PAYMENT",
          details: `Cash payment for ${orderNumber}. Amount: KES ${total}, Tendered: KES ${cashAmount || 0}, Change: KES ${change}`,
        },
      });
    }

    if (session.role === "CUSTOMER") {
      await prisma.cartItem.deleteMany({
        where: { userId: session.userId },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_ORDER",
        details: `Order ${orderNumber} created. Total: KES ${total}${isCash ? ". Cash payment completed." : ""}`,
      },
    });

    return NextResponse.json(
      { order, payment, change: change > 0 ? change : 0 },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
