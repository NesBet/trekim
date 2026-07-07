"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, validatePhone } from "@/lib/utils";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Smartphone,
} from "lucide-react";
import toast from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customer: { name: string; email: string; phone: string | null } | null;
  items: {
    product: { name: string; image: string | null };
    quantity: number;
    price: number;
  }[];
  payment: { status: string; reference: string } | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stkModal, setStkModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [phone, setPhone] = useState("");
  const [stkLoading, setStkLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSTKPush = async () => {
    if (!selectedOrder || !validatePhone(phone)) {
      toast.error("Enter a valid Kenyan phone number (e.g., 0712345678)");
      return;
    }

    setStkLoading(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("STK Push sent to customer's phone");
      setStkModal(false);
      setPhone("");
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "STK Push failed");
    } finally {
      setStkLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const stats = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: Package,
    },
    {
      label: "Pending",
      value: orders.filter((o) => o.status === "PENDING").length,
      icon: Clock,
    },
    {
      label: "Completed",
      value: orders.filter((o) => o.status === "COMPLETED").length,
      icon: CheckCircle,
    },
    {
      label: "Cancelled",
      value: orders.filter((o) => o.status === "CANCELLED").length,
      icon: XCircle,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-trekim-500/20">
                <stat.icon className="h-5 w-5 text-trekim-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-secondary"
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        {order.customer?.name || "Walk-in"}
                      </TableCell>
                      <TableCell>
                        {order.items.map((i) => i.product.name).join(", ")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[order.status] || ""
                          }`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            order.payment?.status === "SUCCESS"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {order.payment?.status || "Unpaid"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={stkModal}
        onClose={() => setStkModal(false)}
        title="STK Push Payment"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send payment request to customer&apos;s M-Pesa
          </p>
          {selectedOrder && (
            <div className="rounded-lg bg-secondary p-3">
              <p className="font-semibold">
                {formatCurrency(selectedOrder.total)}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedOrder.orderNumber}
              </p>
            </div>
          )}
          <Input
            label="Customer Phone Number"
            placeholder="0712 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={handleSTKPush}
            loading={stkLoading}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Send STK Push
          </Button>
        </div>
      </Modal>
    </div>
  );
}
