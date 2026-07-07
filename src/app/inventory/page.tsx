"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { ProductCard } from "@/components/products/product-card";
import { Search, ChevronDown, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string | null;
  stock: number;
}

function InventoryContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];

  useEffect(() => {
    const category = searchParams.get("category");
    if (category) {
      const match = allCategories.find(
        (c) => c.toLowerCase() === category.toLowerCase()
      );
      if (match) setSelectedCategory(match);
    }
  }, [searchParams, allCategories]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const handleAddToCart = async (product: Product, quantity: number) => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "CUSTOMER") {
      toast.error("Only customers can add items to cart");
      return;
    }

    const stored = localStorage.getItem("trekim_cart");
    const cart = stored ? JSON.parse(stored) : [];
    const existing = cart.findIndex(
      (i: { productId: string }) => i.productId === product.id
    );
    if (existing >= 0) {
      cart[existing].quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
      });
    }
    localStorage.setItem("trekim_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    toast.success(`${quantity}x ${product.name} added to cart`);
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !selectedCategory ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card animate-pulse h-[350px]"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-input bg-background text-sm font-medium hover:bg-secondary transition-colors min-w-[140px]"
          >
            <span className="flex-1 text-left truncate">
              {selectedCategory || "All Categories"}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute z-50 top-full mt-1 left-0 w-full rounded-lg border bg-background shadow-lg animate-fade-in">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setDropdownOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  !selectedCategory ? "font-medium text-trekim-500" : ""
                }`}
              >
                <span className="flex-1 text-left">All Categories</span>
                {!selectedCategory && (
                  <Check className="h-4 w-4 text-trekim-500" />
                )}
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    selectedCategory === cat ? "font-medium text-trekim-500" : ""
                  }`}
                >
                  <span className="flex-1 text-left">{cat}</span>
                  {selectedCategory === cat && (
                    <Check className="h-4 w-4 text-trekim-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">No drinks found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={user?.role === "CUSTOMER" ? handleAddToCart : undefined}
              showActions={!!user}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function InventoryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Our Drinks Menu</h1>
        <p className="text-muted-foreground">
          Browse our selection of premium beverages
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border bg-card animate-pulse h-[350px]"
              />
            ))}
          </div>
        }
      >
        <InventoryContent />
      </Suspense>
    </div>
  );
}
