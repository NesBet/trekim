"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, validatePhone } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  CreditCard,
  Smartphone,
  MapPin,
  Phone,
  User,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

function CartContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "MPESA" | "AIRTEL" | null>(null);
  const [mobilePhone, setMobilePhone] = useState("");
  const [mmState, setMmState] = useState<"idle" | "waiting" | "success" | "failed">("idle");
  const [mmError, setMmError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingCountRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("trekim_cart");
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const persist = (updated: CartItem[]) => {
    localStorage.setItem("trekim_cart", JSON.stringify(updated));
    setItems(updated);
    window.dispatchEvent(new Event("cart-updated"));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems((prev) => {
      const updated = prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty <= 0 ? null : { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      persist(updated);
      return updated;
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => {
      const updated = prev.filter((item) => item.productId !== productId);
      persist(updated);
      return updated;
    });
    toast.success("Item removed from cart");
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingCountRef.current = 0;
  }, []);

  const startPolling = useCallback(
    (ref: string) => {
      pollingCountRef.current = 0;
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        pollingCountRef.current++;

        if (pollingCountRef.current > 60) {
          stopPolling();
          setMmState("failed");
          setMmError("Payment confirmation timed out.");
          return;
        }

        try {
          const res = await fetch("/api/paystack/charge-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: ref }),
          });
          if (!res.ok) return;
          const data = await res.json();

          if (data.paid) {
            stopPolling();
            setMmState("success");
            localStorage.removeItem("trekim_cart");
            setItems([]);
          } else if (data.status === "FAILED") {
            stopPolling();
            setMmState("failed");
            setMmError("Payment was declined or failed.");
          }
        } catch {
          // continue polling
        }
      }, 2000);
    },
    [stopPolling]
  );

  const handleCardCheckout = async () => {
    if (!deliveryLocation.trim()) {
      toast.error("Please enter your delivery location");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          deliveryLocation: deliveryLocation.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.removeItem("trekim_cart");
      setItems([]);
      toast.success(`Order placed! #${data.order.orderNumber}`);

      const payRes = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.order.id }),
      });

      const payData = await payRes.json();
      if (payRes.ok && payData.authorizationUrl) {
        window.location.href = payData.authorizationUrl;
      } else {
        router.push("/orders");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMobileMoneyCheckout = async () => {
    if (!deliveryLocation.trim()) {
      toast.error("Please enter your delivery location");
      return;
    }
    if (!validatePhone(mobilePhone)) {
      toast.error("Enter a valid Kenyan phone number");
      return;
    }

    setLoading(true);
    setMmState("waiting");
    setMmError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          deliveryLocation: deliveryLocation.trim(),
          paymentMethod: "MPESA",
          customerPhone: mobilePhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const provider = paymentMethod === "MPESA" ? "mpesa" : "airtel";
      const chargeRes = await fetch("/api/paystack/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.order.id,
          phone: mobilePhone,
          provider,
        }),
      });

      if (!chargeRes.ok) {
        const chargeErr = await chargeRes.json();
        throw new Error(chargeErr.error || "Mobile money charge failed");
      }

      const chargeData = await chargeRes.json();
      startPolling(chargeData.reference);
    } catch (err) {
      setMmState("failed");
      setMmError(err instanceof Error ? err.message : "Failed to process payment");
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      toast.error("Select a payment method");
      return;
    }
    if (paymentMethod === "CARD") {
      await handleCardCheckout();
    } else {
      await handleMobileMoneyCheckout();
    }
  };

  const providerLabel = paymentMethod === "MPESA" ? "M-Pesa" : paymentMethod === "AIRTEL" ? "Airtel Money" : null;

  if (items.length === 0 && mmState !== "waiting" && mmState !== "success") {
    return (
      <div className="text-center max-w-md mx-auto">
        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">
          Looks like you haven&apos;t added any drinks yet
        </p>
        <Link href="/inventory">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Browse Drinks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <Card key={item.productId}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.price)} each
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.productId, -1)}
                >
                  -
                </Button>
                <span className="w-8 text-center font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.productId, 1)}
                >
                  +
                </Button>
              </div>
              <p className="font-semibold w-24 text-right">
                {formatCurrency(item.price * item.quantity)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.productId)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Delivery Details</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{user?.name || "Loading..."}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{user?.email || "Loading..."}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{user?.phone || "Not provided"}</span>
              </div>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                placeholder="Enter delivery location (e.g., Kiserian, Magadi Road, near Total)"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full min-h-[80px] rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Payment Method</h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod("CARD")}
                className={`flex items-center justify-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  paymentMethod === "CARD"
                    ? "bg-trekim-500 text-black border-trekim-500"
                    : "bg-background hover:bg-secondary border-input"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Card
              </button>
              <button
                onClick={() => { setPaymentMethod("MPESA"); setMobilePhone(""); }}
                className={`flex items-center justify-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  paymentMethod === "MPESA"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-background hover:bg-secondary border-input"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                M-Pesa
              </button>
              <button
                onClick={() => { setPaymentMethod("AIRTEL"); setMobilePhone(""); }}
                className={`flex items-center justify-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  paymentMethod === "AIRTEL"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-background hover:bg-secondary border-input"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Airtel
              </button>
            </div>

            {(paymentMethod === "MPESA" || paymentMethod === "AIRTEL") && (
              <div className="space-y-2">
                <Input
                  label={`Phone Number (${providerLabel})`}
                  placeholder="0712 345 678"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
              </div>
            )}

            {paymentMethod === "CARD" && (
              <p className="text-xs text-muted-foreground">
                You will be redirected to a secure payment page to complete your card payment.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-trekim-500">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              loading={loading || mmState === "waiting"}
              disabled={!paymentMethod || mmState === "waiting"}
            >
              {paymentMethod === "CARD" ? (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Proceed to Payment
                </>
              ) : paymentMethod === "MPESA" ? (
                <>
                  <Smartphone className="mr-2 h-5 w-5" />
                  Pay with M-Pesa
                </>
              ) : paymentMethod === "AIRTEL" ? (
                <>
                  <Smartphone className="mr-2 h-5 w-5" />
                  Pay with Airtel Money
                </>
              ) : (
                "Select Payment Method"
              )}
            </Button>
            <Link href="/inventory">
              <Button variant="ghost" className="w-full mt-2">
                Continue Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Money Waiting Overlay */}
      {mmState === "waiting" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl p-10 max-w-sm w-full mx-4 text-center space-y-6 animate-fade-in shadow-2xl border">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-trekim-500 animate-spin" />
              <Smartphone className="absolute inset-0 m-auto h-10 w-10 text-trekim-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Waiting for Payment</h3>
              <p className="text-sm text-muted-foreground">
                {paymentMethod === "MPESA"
                  ? "STK push sent to your phone. Enter your M-Pesa PIN to confirm."
                  : "Payment request sent. Check your Airtel Money phone to complete."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Awaiting confirmation...</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { stopPolling(); setMmState("failed"); setMmError("Payment cancelled."); }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Money Success Overlay */}
      {mmState === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl p-10 max-w-sm w-full mx-4 text-center space-y-6 animate-fade-in shadow-2xl border">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Your order has been placed and payment confirmed.
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4 space-y-1">
              <p className="text-2xl font-bold text-trekim-500">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">Total Amount</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={() => router.push("/orders")}>
                View Orders
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push("/inventory")}>
                Shop More
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Money Failed Overlay */}
      {mmState === "failed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl p-10 max-w-sm w-full mx-4 text-center space-y-6 animate-fade-in shadow-2xl border">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Payment Failed</h3>
              <p className="text-sm text-muted-foreground">{mmError || "Something went wrong."}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={() => {
                setMmState("idle");
                setMmError("");
              }}>
                Try Again
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => router.push("/orders")}>
                View Orders
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <CartContent />
    </div>
  );
}
