"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  image: string;
  available: boolean;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData> & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ initialData, onClose, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "0",
    image: "",
    available: true,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
        price: initialData.price?.toString() || "",
        category: initialData.category || "",
        stock: initialData.stock?.toString() || "0",
        image: initialData.image || "",
        available: initialData.available ?? true,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        category: form.category || null,
        stock: parseInt(form.stock),
        image: form.image || null,
        available: form.available,
      };

      const url = initialData?.id
        ? `/api/products/${initialData.id}`
        : "/api/products";
      const method = initialData?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        initialData?.id ? "Product updated successfully" : "Product created successfully"
      );
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Product Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price (KES)"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <Input
          label="Stock"
          type="number"
          min="0"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          required
        />
      </div>
      <Input
        label="Category"
        placeholder="e.g., Beer, Whisky, Vodka"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      />
      <Input
        label="Image URL"
        placeholder="https://example.com/image.jpg"
        value={form.image}
        onChange={(e) => setForm({ ...form, image: e.target.value })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.available}
          onChange={(e) => setForm({ ...form, available: e.target.checked })}
          className="rounded border-input"
        />
        Available for sale
      </label>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData?.id ? "Update" : "Create"} Product
        </Button>
      </div>
    </form>
  );
}
