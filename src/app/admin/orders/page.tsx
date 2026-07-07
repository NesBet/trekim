"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  Check,
  Calendar,
  Search,
  X,
  Filter,
} from "lucide-react";
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

const ALL_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"];

function StatusDropdown({
  value,
  onChange,
}: {
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

  const selectedLabel = value
    ? value.charAt(0) + value.slice(1).toLowerCase()
    : "All Statuses";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium hover:bg-secondary transition-colors min-w-[160px]"
      >
        <span className="flex-1 text-left truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-background shadow-lg animate-fade-in overflow-hidden">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-secondary transition-colors ${
              !value ? "font-medium text-trekim-500 bg-trekim-500/5" : ""
            }`}
          >
            <span className="flex-1 text-left">All Statuses</span>
            {!value && <Check className="h-4 w-4 text-trekim-500" />}
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s === value ? null : s);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-secondary transition-colors ${
                value === s ? "font-medium text-trekim-500 bg-trekim-500/5" : ""
              }`}
            >
              <span className="flex-1 text-left">
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </span>
              {value === s && <Check className="h-4 w-4 text-trekim-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColumnFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
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
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors rounded px-1.5 py-0.5 ${
          value
            ? "text-trekim-500 bg-trekim-500/10"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`}
      >
        <Filter className="h-3 w-3" />
        <span className="hidden sm:inline">{selected ? selected.label : label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[160px] rounded-lg border bg-background shadow-lg animate-fade-in overflow-hidden">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary transition-colors ${
              !value ? "font-medium text-trekim-500 bg-trekim-500/5" : ""
            }`}
          >
            <span className="flex-1 text-left">All {label}</span>
            {!value && <Check className="h-3 w-3 text-trekim-500" />}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value === value ? null : opt.value);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary transition-colors ${
                value === opt.value ? "font-medium text-trekim-500 bg-trekim-500/5" : ""
              }`}
            >
              <span className="flex-1 text-left truncate">{opt.label}</span>
              {value === opt.value && <Check className="h-3 w-3 text-trekim-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [salespersonFilter, setSalespersonFilter] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString();
      const res = await fetch(`/api/orders${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filter, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const customerOptions = useMemo(() => {
    const names = new Set<string>();
    orders.forEach((o) => names.add(o.customer?.name || "Walk-in"));
    return Array.from(names).sort().map((n) => ({ value: n, label: n }));
  }, [orders]);

  const salespersonOptions = useMemo(() => {
    const names = new Set<string>();
    orders.forEach((o) => names.add(o.salesperson?.name || "Online"));
    return Array.from(names).sort().map((n) => ({ value: n, label: n }));
  }, [orders]);

  const paymentMethodOptions = useMemo(() => {
    const methods = new Set<string>();
    orders.forEach((o) => {
      const m = o.payment?.method || "Unpaid";
      methods.add(m);
    });
    return Array.from(methods).sort().map((m) => ({ value: m, label: m }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        const matchOrderNum = o.orderNumber.toLowerCase().includes(q);
        const matchCustomer = (o.customer?.name || "").toLowerCase().includes(q);
        const matchItems = o.items.some((i) =>
          i.product.name.toLowerCase().includes(q)
        );
        if (!matchOrderNum && !matchCustomer && !matchItems) return false;
      }

      if (customerFilter) {
        const name = o.customer?.name || "Walk-in";
        if (name !== customerFilter) return false;
      }

      if (salespersonFilter) {
        const name = o.salesperson?.name || "Online";
        if (name !== salespersonFilter) return false;
      }

      if (paymentMethodFilter) {
        const method = o.payment?.method || "Unpaid";
        if (method !== paymentMethodFilter) return false;
      }

      return true;
    });
  }, [orders, search, customerFilter, salespersonFilter, paymentMethodFilter]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success(`Order ${status.toLowerCase()}`);
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const hasActiveFilter = customerFilter || salespersonFilter || paymentMethodFilter;

  const stats = [
    { label: "Total", value: filteredOrders.length, icon: ShoppingCart },
    {
      label: "Pending",
      value: filteredOrders.filter((o) => o.status === "PENDING").length,
      icon: Clock,
    },
    {
      label: "Completed",
      value: filteredOrders.filter((o) => o.status === "COMPLETED").length,
      icon: CheckCircle,
    },
    {
      label: "Cancelled",
      value: filteredOrders.filter((o) => o.status === "CANCELLED").length,
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

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <StatusDropdown value={filter} onChange={setFilter} />
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <span className="text-xs text-muted-foreground">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="h-10 px-3 rounded-lg border border-input text-sm text-muted-foreground hover:bg-secondary transition-colors"
            >
              Clear Dates
            </button>
          )}
        </div>
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
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting the filters
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ColumnFilter
                      label="Customer"
                      options={customerOptions}
                      value={customerFilter}
                      onChange={setCustomerFilter}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Salesperson</span>
                    <ColumnFilter
                      label="Salesperson"
                      options={salespersonOptions}
                      value={salespersonFilter}
                      onChange={setSalespersonFilter}
                    />
                  </div>
                </TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Payment</span>
                    <ColumnFilter
                      label="Payment"
                      options={paymentMethodOptions}
                      value={paymentMethodFilter}
                      onChange={setPaymentMethodFilter}
                    />
                  </div>
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
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
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
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
