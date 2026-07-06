import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sanitizeInput } from "@/lib/utils";
import { z } from "zod";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

const productSchema = z.object({
  name: z.string().min(1).max(200).transform(sanitizeInput),
  description: z.string().max(1000).transform(sanitizeInput).optional().nullable(),
  price: z.number().positive(),
  image: z.string().max(500).optional().nullable(),
  category: z.string().max(100).transform(sanitizeInput).optional().nullable(),
  stock: z.number().int().min(0),
  available: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message);
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const product = await prisma.product.create({ data: parsed.data });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_PRODUCT",
        details: `Created product: ${product.name}`,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
