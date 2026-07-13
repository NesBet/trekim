import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const TOKEN_NAME = "trekim_token";
const SALT_ROUNDS = 12;

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: Omit<TokenPayload, "iat" | "exp">) {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(payload: Omit<TokenPayload, "iat" | "exp">) {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  const isSecure =
    process.env.NODE_ENV === "production" &&
    process.env.DISABLE_SECURE_COOKIE !== "true";
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const isSecure =
    process.env.NODE_ENV === "production" &&
    process.env.DISABLE_SECURE_COOKIE !== "true";
  cookieStore.set(TOKEN_NAME, "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });
}

export function requireRole(...roles: Role[]) {
  return async () => {
    const session = await getSession();
    if (!session || !roles.includes(session.role)) {
      throw new Error("Unauthorized");
    }
    return session;
  };
}
