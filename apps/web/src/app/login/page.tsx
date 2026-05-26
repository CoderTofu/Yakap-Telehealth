"use client";

import { useState, type SyntheticEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "patient" | "doctor";

type LoginResponse = {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  };
};

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!password) {
      setErrorMessage("Password is required.");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      setErrorMessage("API URL is not configured.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = (await response.json()) as
        | LoginResponse
        | { error?: { message?: string } };

      if (!response.ok) {
        const message = "error" in result ? result.error?.message : undefined;
        throw new Error(message || "Invalid credentials.");
      }

      const data = result as LoginResponse;

      localStorage.setItem("authToken", data.data.token);
      localStorage.setItem("authUser", JSON.stringify(data.data.user));

      router.push(
        data.data.user.role === "patient"
          ? "/patient/dashboard"
          : "/doctor/dashboard",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to log in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
      </div>
      <div className="flex justify-center px-4 py-12">
        <div className="w-full max-w-[400px] rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="font-serif text-3xl text-text-primary">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Log in to your Yakap account.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {errorMessage ? (
              <p className="text-sm text-danger">{errorMessage}</p>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-mid"
            >
              {isSubmitting ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
