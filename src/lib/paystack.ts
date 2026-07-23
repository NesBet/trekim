import crypto from "crypto";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_API = "https://api.paystack.co";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface InitializeTransactionData {
  authorization_url: string;
  access_code: string;
  reference: string;
  domain: string;
}

interface TransactionData {
  id: number;
  reference: string;
  amount: number;
  status: string;
  channel: string;
  metadata: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  authorization: {
    authorization_code: string;
  } | null;
}

interface ChargeData {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  message: string | null;
  gateway_response: string;
  transaction: {
    reference: string | null;
  } | null;
}

async function paystackFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<PaystackResponse<T>> {
  const url = `${PAYSTACK_API}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({ message: response.statusText }));

  if (!response.ok) {
    throw new Error(body.message || "Paystack API error");
  }

  return body;
}

export async function chargeMobileMoney(params: {
  email: string;
  amount: number;
  phone: string;
  reference: string;
  provider: "mpesa" | "airtel";
  metadata?: Record<string, unknown>;
}) {
  const amountInKobo = String(Math.round(params.amount * 100));
  const cleanedPhone = params.phone.replace(/[^0-9]/g, "");
  const providerMap: Record<string, string> = { mpesa: "MPESA", airtel: "AIRTEL" };

  const body: Record<string, unknown> = {
    email: params.email,
    amount: amountInKobo,
    currency: "KES",
    reference: params.reference,
    metadata: params.metadata,
  };

  body.mobile_money = {
    phone: cleanedPhone,
    provider: providerMap[params.provider],
  };

  return paystackFetch<ChargeData>("/charge", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function checkChargeStatus(reference: string) {
  return paystackFetch<ChargeData>(
    `/charge/${encodeURIComponent(reference)}`
  );
}

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  reference?: string;
  metadata?: Record<string, unknown>;
}) {
  const amountInKobo = String(Math.round(params.amount * 100));

  return paystackFetch<InitializeTransactionData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountInKobo,
      reference: params.reference,
      metadata: params.metadata,
      channels: ["card", "mobile_money", "bank", "ussd", "bank_transfer"],
      callback_url: `${BASE_URL}/payment/callback`,
    }),
  });
}

export async function verifyTransaction(reference: string) {
  return paystackFetch<TransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export function mapPaystackChannel(channel: string): "CARD" | "MPESA" {
  switch (channel) {
    case "mobile_money":
    case "mpesa":
    case "airtel":
      return "MPESA";
    case "card":
    case "bank":
    case "ussd":
    case "qr":
    case "bank_transfer":
    case "dedicated_nuban":
    default:
      return "CARD";
  }
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  return `254${cleaned}`;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET) {
    console.error("PAYSTACK_SECRET_KEY is not configured");
    return false;
  }
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(payload)
    .digest("hex");
  try {
    const hashBuf = Buffer.from(hash, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (hashBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, sigBuf);
  } catch {
    return false;
  }
}
