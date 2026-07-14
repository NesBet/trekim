import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { name: true, image: true, price: true } } },
        },
        payment: true,
        customer: { select: { name: true, email: true, phone: true } },
        salesperson: { select: { name: true, email: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.deletedAt) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (session.role === "CUSTOMER") {
      if (order.customerId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (
      session.role === "SALESPERSON" &&
      order.salespersonId &&
      order.salespersonId !== session.userId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Fetch order error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.deletedAt) {
      return NextResponse.json({ error: "Order already deleted" }, { status: 400 });
    }

    if (order.payment?.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Cannot delete a paid order" },
        { status: 400 }
      );
    }

    if (session.role === "CUSTOMER") {
      if (order.customerId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await prisma.order.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } else if (session.role === "SALESPERSON") {
      if (order.salespersonId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await prisma.order.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } else if (session.role === "ADMIN") {
      await prisma.order.delete({
        where: { id },
      });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_ORDER",
        details: `${
          session.role === "CUSTOMER" ? "Customer" : session.role === "SALESPERSON" ? "Salesperson" : "Admin"
        } deleted order ${order.orderNumber}`,
      },
    });

    return NextResponse.json({ message: "Order deleted" });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.deletedAt) {
      return NextResponse.json(
        { error: "Cannot modify a deleted order" },
        { status: 400 }
      );
    }

    if (session.role === "CUSTOMER") {
      if (status !== "CANCELLED") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (order.customerId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (status === "COMPLETED") {
      if (!order.payment || order.payment.status !== "SUCCESS") {
        return NextResponse.json(
          { error: "Order must be paid before it can be completed" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_ORDER_STATUS",
        details: `Order ${updated.orderNumber} status changed to ${status}`,
      },
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
