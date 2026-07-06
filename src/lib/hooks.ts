"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CUSTOMER" | "SALESPERSON" | "ADMIN";
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setState({ user: data.user, loading: false, error: null });
      } else {
        setState({ user: null, loading: false, error: null });
      }
    } catch {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState({ user: data.user, loading: false, error: null });
      return data.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  };

  const signup = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setState({ user: result.user, loading: false, error: null });
      return result.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ user: null, loading: false, error: null });
    router.push("/login");
  };

  return { ...state, login, signup, logout, refetch: fetchUser };
}
