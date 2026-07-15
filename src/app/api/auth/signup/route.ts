import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/utils";
import { z } from "zod";
import { sendOtp } from "@/lib/n8n";

const limiter = rateLimit({ interval: 60000, maxRequests: 5 });

const signupSchema = z.object({
  name: z.string().min(2).max(100).transform(sanitizeInput),
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Invalid Kenyan phone number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await limiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message);
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const { name, email } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    await sendOtp(email, name);

    return NextResponse.json(
      { message: "Verification code sent to your email" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
