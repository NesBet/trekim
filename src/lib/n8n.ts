interface N8nResponse {
  success?: boolean;
  verified?: boolean;
  error?: string;
}

async function callN8nWebhook(
  url: string,
  body: Record<string, unknown>
): Promise<N8nResponse> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("N8N_WEBHOOK_SECRET is not configured");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-n8n-webhook-secret": secret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `n8n webhook returned ${res.status}`);
  }

  return res.json();
}

export async function sendOtp(email: string): Promise<void> {
  const webhookUrl = process.env.N8N_OTP_SEND_WEBHOOK;
  if (!webhookUrl) {
    throw new Error("N8N_OTP_SEND_WEBHOOK is not configured");
  }

  const result = await callN8nWebhook(webhookUrl, { email });

  if (result.success === false) {
    throw new Error(result.error || "Failed to send verification code");
  }
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<boolean> {
  const webhookUrl = process.env.N8N_OTP_VERIFY_WEBHOOK;
  if (!webhookUrl) {
    throw new Error("N8N_OTP_VERIFY_WEBHOOK is not configured");
  }

  const result = await callN8nWebhook(webhookUrl, { email, otp });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.verified === true;
}
