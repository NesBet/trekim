"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Package, Plus, Minus } from "lucide-react";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string | null;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
  showActions?: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  showActions = true,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);

  const outOfStock = product.stock === 0;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-trekim-100 to-trekim-200 dark:from-trekim-950 dark:to-trekim-900 flex items-center justify-center">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-16 w-16 text-trekim-500/50" />
        )}
        {product.category && (
          <span className="absolute top-2 left-2 rounded-full bg-neutral-500 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-trekim-500">
            {product.category}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="rounded-full bg-destructive text-destructive-foreground px-3 py-1 text-sm font-medium">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-trekim-500">
            {formatCurrency(product.price)}
          </span>
          {product.stock > 0 && (
            <span className="text-xs text-muted-foreground">
              Stock: {product.stock}
            </span>
          )}
        </div>
        {showActions && !outOfStock && onAddToCart && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center rounded-lg border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-1.5 hover:bg-secondary transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-medium min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity(Math.min(product.stock, quantity + 1))
                }
                className="p-1.5 hover:bg-secondary transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddToCart(product, quantity)}
              className="flex-1"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add to Cart
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
