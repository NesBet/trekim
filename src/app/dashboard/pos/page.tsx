"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, validatePhone } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  ShoppingCart,
  Trash2,
  Search,
  Smartphone,
  Banknote,
  Plus,
  Minus,
  User,
  Phone,
  Package,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string | null;
  stock: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MPESA" | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [resultData, setResultData] = useState<{
    orderNumber: string;
    change: number;
    total: number;
  } | null>(null);
  const [stkPhone, setStkPhone] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setProducts(data.products);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const allCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];

  const persistCart = (updated: CartItem[]) => {
    setItems(updated);
  };

  const addToCart = (product: Product, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        const updated = prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
        },
      ];
    });
    toast.success(`${quantity}x ${product.name} added`);
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
      persistCart(updated);
      return updated;
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tendered = parseFloat(cashAmount) || 0;
  const change = tendered - total;

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !selectedCategory ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item to the order");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Enter customer name");
      return;
    }

    if (!paymentMethod) {
      toast.error("Select a payment method");
      return;
    }

    if (paymentMethod === "MPESA") {
      if (!validatePhone(stkPhone)) {
        toast.error("Enter a valid Kenyan phone number (e.g., 0712345678)");
        return;
      }
      if (!customerPhone) {
        setCustomerPhone(stkPhone);
      }
    }

    if (paymentMethod === "CASH" && tendered < total) {
      toast.error("Amount tendered must be at least the total");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
          cashAmount: paymentMethod === "CASH" ? tendered : undefined,
          deliveryLocation: "Walk-in",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setCashAmount("");
      setPaymentMethod(null);
      setStkPhone("");

      if (paymentMethod === "CASH") {
        setResultData({
          orderNumber: data.order.orderNumber,
          change: data.change,
          total,
        });
        setResultModal(true);
        toast.success("Order completed!");
      } else if (paymentMethod === "MPESA") {
        const stkRes = await fetch("/api/paystack/stk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.order.id,
            phone: stkPhone,
          }),
        });

        const stkData = await stkRes.json();
        if (stkRes.ok) {
          toast.success("STK Push sent to customer's phone");
        } else {
          toast.error(stkData.error || "STK push failed");
        }

        setResultModal(true);
        setResultData({
          orderNumber: data.order.orderNumber,
          change: 0,
          total,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <p className="text-muted-foreground">
          Create orders for walk-in customers
        </p>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Left: Product selection */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search drinks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Category filter as dropdown */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !selectedCategory
                  ? "bg-trekim-500 text-black"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              All
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-trekim-500 text-black"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[200px] rounded-xl bg-secondary animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No drinks found
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((product) => {
                const outOfStock = product.stock === 0;
                return (
                  <Card
                    key={product.id}
                    className={`overflow-hidden transition-all hover:shadow-md ${
                      outOfStock ? "opacity-50" : ""
                    }`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-trekim-100 to-trekim-200 dark:from-trekim-950 dark:to-trekim-900 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-trekim-500/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {product.name}
                        </h3>
                        <p className="text-trekim-500 font-bold">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {product.stock}
                        </p>
                      </div>
                      {!outOfStock && (
                        <Button
                          size="sm"
                          onClick={() => addToCart(product, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart & Checkout */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({items.length})
                </h2>
                {items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems([])}
                    className="text-destructive"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No items added yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1 rounded hover:bg-secondary transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1 rounded hover:bg-secondary transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold w-16 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1 rounded hover:bg-secondary transition-colors text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-trekim-500">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Customer Details</h3>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Customer name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Phone (required for M-Pesa)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Payment Method</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    paymentMethod === "CASH"
                      ? "bg-trekim-500 text-black border-trekim-500"
                      : "bg-background hover:bg-secondary border-input"
                  }`}
                >
                  <Banknote className="h-5 w-5" />
                  Cash
                </button>
                <button
                  onClick={() => setPaymentMethod("MPESA")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    paymentMethod === "MPESA"
                      ? "bg-trekim-500 text-black border-trekim-500"
                      : "bg-background hover:bg-secondary border-input"
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                  M-Pesa
                </button>
              </div>

              {paymentMethod === "CASH" && (
                <div className="space-y-2">
                  <Input
                    label="Amount Tendered"
                    type="number"
                    placeholder="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                  />
                  {tendered >= total && total > 0 && (
                    <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Change</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(change)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "MPESA" && (
                <div className="space-y-2">
                  <Input
                    label="Phone Number for STK Push"
                    placeholder="0712 345 678"
                    value={stkPhone}
                    onChange={(e) => setStkPhone(e.target.value)}
                  />
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                loading={submitting}
                disabled={items.length === 0 || !paymentMethod}
              >
                {paymentMethod === "CASH" ? (
                  <>
                    <Banknote className="mr-2 h-5 w-5" />
                    Complete Sale
                  </>
                ) : paymentMethod === "MPESA" ? (
                  <>
                    <Smartphone className="mr-2 h-5 w-5" />
                    Send STK Push & Complete
                  </>
                ) : (
                  "Select Payment Method"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Result Modal */}
      <Modal
        open={resultModal}
        onClose={() => setResultModal(false)}
        title="Order Complete"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          {resultData && (
            <>
              <div>
                <p className="text-lg font-semibold">{resultData.orderNumber}</p>
                <p className="text-sm text-muted-foreground">Order Number</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-trekim-500">
                  {formatCurrency(resultData.total)}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              {resultData.change > 0 && (
                <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-4">
                  <p className="text-sm text-muted-foreground">Change Due</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(resultData.change)}
                  </p>
                </div>
              )}
            </>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={() => {
                setResultModal(false);
                setResultData(null);
              }}
            >
              New Order
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
