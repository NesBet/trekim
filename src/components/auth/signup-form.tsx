"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { GlassWater, Eye, EyeOff } from "lucide-react";

export function SignupForm() {
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <GlassWater className="h-12 w-12 text-trekim-500" />
        </div>
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Join Trekim Bar & Lounge</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <Input
            id="name"
            label="Full Name"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            id="phone"
            label="Phone Number"
            type="tel"
            placeholder="+254 7XX XXX XXX"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <Input
            id="confirmPassword"
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <Button type="submit" className="w-full" loading={loading}>
            Create Account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-trekim-500 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
