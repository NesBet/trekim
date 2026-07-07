"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function FloatingCartButton() {
  const { itemCount } = useCart();

  if (itemCount === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-trekim-500 px-5 py-3 text-white shadow-lg transition-all duration-300 hover:bg-trekim-600 hover:shadow-xl hover:-translate-y-0.5 animate-fade-in"
    >
      <div className="relative">
        <ShoppingCart className="h-5 w-5" />
        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-trekim-500">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      </div>
      <span className="text-sm font-medium">Cart</span>
    </Link>
  );
}
