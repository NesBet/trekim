"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface CartContextType {
  itemCount: number;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType>({
  itemCount: 0,
  refreshCart: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemCount, setItemCount] = useState(0);

  const refreshCart = useCallback(() => {
    try {
      const stored = localStorage.getItem("trekim_cart");
      if (stored) {
        const items = JSON.parse(stored);
        setItemCount(Array.isArray(items) ? items.length : 0);
      } else {
        setItemCount(0);
      }
    } catch {
      setItemCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCart();
    window.addEventListener("cart-updated", refreshCart);
    window.addEventListener("storage", refreshCart);
    return () => {
      window.removeEventListener("cart-updated", refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ itemCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
