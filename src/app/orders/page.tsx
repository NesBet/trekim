"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingBag,
  Package,
  Search,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  deliveryLocation: string | null;
  createdAt: string;
  items: {
    product: { name: string; image: string | null };
    quantity: number;
    price: number;
  }[];
  payment: { status: string; reference: string; method: string } | null;
}

const ALL_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"];

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const paymentStatusColors: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function Dropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string | null; label: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium hover:bg-secondary transition-colors min-w-[160px]"
      >
        <span className="flex-1 text-left truncate">
          {selected ? selected.label : label}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-background shadow-lg animate-fade-in">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg ${
                value === opt.value ? "font-medium text-trekim-500" : ""
              }`}
            >
              <span className="flex-1 text-left">{opt.label}</span>
              {value === opt.value && (
                <Check className="h-4 w-4 text-trekim-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      fetchOrders();
    }
  }, [user, authLoading]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (orderStatus) params.set("status", orderStatus);
      if (payStatus) params.set("paymentStatus", payStatus);
      const qs = params.toString();
      const res = await fetch(`/api/orders${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(true);
      fetchOrders();
    }
  }, [orderStatus, payStatus]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.items.some((i) => i.product.name.toLowerCase().includes(q)) ||
      (o.deliveryLocation || "").toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign in to view orders</h1>
        <p className="text-muted-foreground mb-6">
          You need to be signed in to see your order history
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">
            All your orders in one place
          </p>
        </div>
        <Link href="/inventory">
          <Button variant="outline">
            <Package className="h-4 w-4 mr-1" />
            Order More
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order number, item, or delivery location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Dropdown
            label="Order Status"
            options={[
              { value: null, label: "All Statuses" },
              ...ALL_STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0) + s.slice(1).toLowerCase(),
              })),
            ]}
            value={orderStatus}
            onChange={setOrderStatus}
          />
          <Dropdown
            label="Payment"
            options={[
              { value: null, label: "All Payments" },
              { value: "SUCCESS", label: "Paid" },
              { value: "PENDING", label: "Pending" },
              { value: "FAILED", label: "Failed" },
            ]}
            value={payStatus}
            onChange={setPayStatus}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {orders.length === 0 ? "No orders yet" : "No orders match"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {orders.length === 0
              ? "Browse our menu and place your first order!"
              : "Try adjusting the filters or search"}
          </p>
          <Link href="/inventory">
            <Button size="lg">
              <Package className="mr-2 h-5 w-5" />
              Browse Drinks
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-lg">
                        {order.orderNumber}
                      </h3>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[order.status] || ""
                        }`}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          paymentStatusColors[order.payment?.status || "PENDING"] || ""
                        }`}
                      >
                        {order.payment?.status === "SUCCESS"
                          ? "Paid"
                          : order.payment?.status === "FAILED"
                          ? "Failed"
                          : "Unpaid"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-xl font-bold text-trekim-500">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>

                {order.deliveryLocation && (
                  <div className="mb-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Delivery:
                    </span>{" "}
                    {order.deliveryLocation}
                  </div>
                )}

                <div className="border-t pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left pb-2 font-medium">Item</th>
                        <th className="text-center pb-2 font-medium">Qty</th>
                        <th className="text-right pb-2 font-medium">Price</th>
                        <th className="text-right pb-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="py-2">{item.product.name}</td>
                          <td className="py-2 text-center">{item.quantity}</td>
                          <td className="py-2 text-right">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
