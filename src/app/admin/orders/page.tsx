"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Package, Clock, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customer: { name: string; email: string; phone: string | null } | null;
  salesperson: { name: string; email: string } | null;
  items: {
    product: { name: string };
    quantity: number;
    price: number;
  }[];
  payment: { status: string; reference: string; method: string } | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const url = filter ? `/api/orders?status=${filter}` : "/api/orders";
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Order ${status.toLowerCase()}`);
      fetchOrders();
    } catch {
      toast.error("Failed to update order");
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const filters = [
    { label: "All", value: null },
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Processing", value: "PROCESSING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  const stats = [
    { label: "Total", value: orders.length, icon: ShoppingCart },
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Track and manage all orders</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => {
              setFilter(f.value);
              setLoading(true);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-trekim-500 text-black"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

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
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No orders found</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
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
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {order.customer?.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    {order.salesperson?.name || "Online"}
                    {order.salesperson && (
                      <span className="text-xs text-muted-foreground block">
                        {order.salesperson.email}
                      </span>
                    )}
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
                    {order.payment?.method && (
                      <span className="text-xs text-muted-foreground block">
                        {order.payment.method}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-col">
                      {order.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus(order.id, "CONFIRMED")
                          }
                        >
                          Confirm
                        </Button>
                      )}
                      {order.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus(order.id, "PROCESSING")
                          }
                        >
                          Process
                        </Button>
                      )}
                      {order.status === "PROCESSING" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus(order.id, "COMPLETED")
                          }
                        >
                          Complete
                        </Button>
                      )}
                      {!["COMPLETED", "CANCELLED"].includes(
                        order.status
                      ) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateStatus(order.id, "CANCELLED")
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
