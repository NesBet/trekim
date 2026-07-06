"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  ShoppingCart,
  Menu,
  X,
  LayoutDashboard,
  Shield,
  LogOut,
  User,
  GlassWater,
} from "lucide-react";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const navLinks = [];

  if (!isAuthPage) {
    navLinks.push(
      { href: "/", label: "Home" },
      { href: "/inventory", label: "Drinks Menu", icon: GlassWater }
    );
  }

  if (user?.role === "ADMIN") {
    navLinks.push({
      href: "/admin",
      label: "Admin",
      icon: Shield,
    });
  }

  if (user?.role === "SALESPERSON" || user?.role === "ADMIN") {
    navLinks.push(
      {
        href: "/dashboard/pos",
        label: "POS",
        icon: ShoppingCart,
      },
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      }
    );
  }

  if (user?.role === "CUSTOMER") {
    navLinks.push(
      {
        href: "/orders",
        label: "My Orders",
        icon: ShoppingCart,
      },
      {
        href: "/cart",
        label: "Cart",
        icon: ShoppingCart,
      }
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <GlassWater className="h-6 w-6 text-trekim-500" />
          <span className="text-trekim-500">Trekim</span>
        </Link>

        {!isAuthPage && (
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-lg bg-secondary" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">{user.name}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          ) : (
            !isAuthPage && (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )
          )}
        </div>

        <button
          className="md:hidden rounded-lg p-2 hover:bg-secondary"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && !isAuthPage && (
        <div className="md:hidden border-t bg-background animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
            <div className="border-t pt-3 flex items-center gap-3">
              <ThemeToggle />
              {user ? (
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login">
                    <Button variant="outline" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
