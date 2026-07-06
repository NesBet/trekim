const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_API = "https://api.paystack.co";

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
  metadata: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  authorization: {
    authorization_code: string;
  } | null;
}

interface STKPushData {
  amount: number;
  reference: string;
  status: string;
  paid_at: string | null;
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

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  reference?: string;
  metadata?: Record<string, unknown>;
}) {
  const amountInKobo = Math.round(params.amount * 100);
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return paystackFetch<InitializeTransactionData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountInKobo,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: `${baseUrl}/payment/callback`,
    }),
  });
}

export async function verifyTransaction(reference: string) {
  return paystackFetch<TransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export async function initiateSTKPush(params: {
  amount: number;
  phone: string;
  reference: string;
  metadata?: Record<string, unknown>;
}) {
  const amountInKobo = Math.round(params.amount * 100);
  const phone = params.phone.replace(/^0+/, "+254").replace(/^254/, "+254");

  return paystackFetch<STKPushData>("/charge", {
    method: "POST",
    body: JSON.stringify({
      email: "payment@trekim.co.ke",
      amount: amountInKobo,
      reference: params.reference,
      metadata: params.metadata,
      card: {
        number: phone,
        cvv: "STK",
        expiry_month: "12",
        expiry_year: "30",
      },
      pin: "STK_PUSH",
    }),
  });
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
