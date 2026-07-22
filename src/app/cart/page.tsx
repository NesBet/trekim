"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  CreditCard,
  MapPin,
  Phone,
  User,
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
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

  useEffect(() => {
    const stored = localStorage.getItem("trekim_cart");
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
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

  const handleCheckout = async () => {
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
      window.dispatchEvent(new Event("cart-updated"));

      const payRes = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.order.id }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || "Payment initialization failed");

      const PaystackPop = (await import("@paystack/inline-js")).default;
      const popup = new PaystackPop();

      popup.resumeTransaction(payData.accessCode, {
        onSuccess: async () => {
          await fetch("/api/paystack/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: payData.reference }),
          }).catch(() => {});
          router.push("/orders");
        },
        onCancel: () => {
          router.push("/orders");
        },
        onError: () => {
          toast.error("Payment could not be completed");
          router.push("/orders");
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  if (items.length === 0) {
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
              loading={loading}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Proceed to Payment
            </Button>
            <Link href="/inventory">
              <Button variant="ghost" className="w-full mt-2">
                Continue Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
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
