"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const CHECK_INTERVAL = 10 * 1000;
const THROTTLE_MS = 2_000;

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CUSTOMER" | "SALESPERSON" | "ADMIN";
}

interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logoutLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupData) => Promise<void>;
  verifyOtp: (data: SignupData & { otp: string }) => Promise<User>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const router = useRouter();

  const lastActivityRef = useRef<number>(Date.now());
  const throttleRef = useRef<number>(0);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current >= THROTTLE_MS) {
      lastActivityRef.current = now;
      throttleRef.current = now;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, recordActivity));

    const id = setInterval(async () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT) {
        clearInterval(id);
        events.forEach((e) => window.removeEventListener(e, recordActivity));
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {}
        setUser(null);
        router.push("/login");
      }
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, recordActivity));
    };
  }, [user, router, recordActivity]);

  const login = async (
    email: string,
    password: string
  ): Promise<User> => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (data: SignupData): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (data: SignupData & { otp: string }): Promise<User> => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setUser(result.user);
      setLoading(false);
      return result.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLogoutLoading(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      setUser(null);
      setLogoutLoading(false);
      router.push("/login");
    } catch (err) {
      setLogoutLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, logoutLoading, login, signup, verifyOtp, logout, refetch: fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
