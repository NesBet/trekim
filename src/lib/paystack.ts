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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || "Paystack API error");
  }

  return response.json();
}

export function detectMobileNetwork(phone: string): "mpesa" | "airtel" {
  const normalized = phone.replace(/^0+/, "254").replace(/^\+/, "").replace(/[^0-9]/g, "");
  const prefix = normalized.substring(0, 5);

  const safaricomPrefixes = [
    "25470", "25471", "25472", "25474",
    "254757", "254758", "254759",
    "254768", "254769", "254770",
    "254773", "254785", "254786", "254787",
    "254788", "254789", "254790",
    "254792", "254796", "254797", "254798", "254799",
  ];

  return safaricomPrefixes.some(p => normalized.startsWith(p)) ? "mpesa" : "airtel";
}

export async function chargeMobileMoney(params: {
  email: string;
  amount: number;
  phone: string;
  reference: string;
  provider: "mpesa" | "airtel";
  metadata?: Record<string, unknown>;
}) {
  const amountInKobo = Math.round(params.amount * 100);
  const normalizedPhone = params.phone.replace(/^0+/, "254").replace(/^\+/, "").replace(/[^0-9]/g, "");

  return paystackFetch<ChargeData>("/charge", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountInKobo,
      currency: "KES",
      reference: params.reference,
      metadata: params.metadata,
      mobile_money: {
        phone: normalizedPhone,
        provider: params.provider,
      },
    }),
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
  const amountInKobo = Math.round(params.amount * 100);

  return paystackFetch<InitializeTransactionData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountInKobo,
      reference: params.reference,
      metadata: params.metadata,
      channels: ["card"],
      callback_url: `${BASE_URL}/orders`,
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
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(payload)
    .digest("hex");
  return hash === signature;
}
