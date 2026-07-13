"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminPage() {
  const [stats, setStats] = useState({
    products: 0,
    users: 0,
    orders: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [prodRes, userRes, orderRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/users"),
        fetch("/api/orders"),
      ]);

      const products = await prodRes.json();
      const users = await userRes.json();
      const orders = await orderRes.json();

      const revenue = orders.orders
        .filter((o: { status: string }) => o.status === "COMPLETED")
        .reduce((sum: number, o: { total: number }) => sum + o.total, 0);

      setStats({
        products: products.products?.length || 0,
        users: users.users?.length || 0,
        orders: orders.orders?.length || 0,
        revenue,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Products",
      value: stats.products,
      icon: Package,
      change: "+2 this week",
      trend: TrendingUp,
    },
    {
      label: "Total Users",
      value: stats.users,
      icon: Users,
      change: "+5 this week",
      trend: TrendingUp,
    },
    {
      label: "Total Orders",
      value: stats.orders,
      icon: ShoppingCart,
      change: "+12 this week",
      trend: TrendingUp,
    },
    {
      label: "Revenue",
      value: formatCurrency(stats.revenue),
      icon: DollarSign,
      change: "All time",
      trend: TrendingUp,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">Manage K.W Social</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-trekim-500/20">
                  <stat.icon className="h-5 w-5 text-trekim-500" />
                </div>
                <stat.trend className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-green-500 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/products"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
            >
              <Package className="h-5 w-5 text-trekim-500" />
              <div>
                <p className="font-medium">Manage Products</p>
                <p className="text-sm text-muted-foreground">
                  Add, edit, or remove drinks from inventory
                </p>
              </div>
            </a>
            <a
              href="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
            >
              <Users className="h-5 w-5 text-trekim-500" />
              <div>
                <p className="font-medium">Manage Users</p>
                <p className="text-sm text-muted-foreground">
                  View and manage staff and customer accounts
                </p>
              </div>
            </a>
            <a
              href="/admin/orders"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-trekim-500" />
              <div>
                <p className="font-medium">View Orders</p>
                <p className="text-sm text-muted-foreground">
                  Track and manage all orders
                </p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>K.W Social Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Location</span>
              <span>Magadi Road, Kiserian</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Contact</span>
              <span>+254 780 237 794</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Email</span>
              <span>admin@trekim.co.ke</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">System Version</span>
              <span>1.0.0</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
