"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/types";
import Image from "next/image";
import {
  EyeIcon,
  EyeSlashIcon,
  BoltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { authService } from "@/services";
import apiClient from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

export default function AuthPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [loginFormData, setLoginFormData] = useState<LoginForm>({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const loadingToast = toast.loading("Logging in...");

    try {
      const response = await apiClient.post("/auth/login", {
        email: loginFormData.email,
        password: loginFormData.password,
      });

      const result = response.data;

      if (result.success && result.data?.access_token && result.data?.user) {
        const { access_token, user } = result.data;
        authService.saveToken(access_token);
        authService.saveUser(user);
        setUser(user);

        toast.success("Login successful! Redirecting...", {
          id: loadingToast,
        });

        setTimeout(() => {
          router.push("/dashboard/overview");
        }, 500);
      } else {
        toast.error(result.message || "Login failed", {
          id: loadingToast,
        });
        setError(result.message || "Login failed");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred";
      toast.error(errorMessage, {
        id: loadingToast,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-[#1A2F4F] via-[#2B4C7E] to-[#1e3a5f] flex-col justify-between p-12 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl animate-blob animation-delay-4000" />

        {/* Top - Logo & Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
              <Image
                src="/images/powersystemslogov2.png"
                alt="Power Systems Inc"
                fill
                className="object-contain p-1"
              />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl tracking-tight">Power Systems Inc.</h2>
              <p className="text-blue-200/70 text-sm">Management Platform</p>
            </div>
          </div>
        </div>

        {/* Center - Value Proposition */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Powering smarter
              <br />
              <span className="text-blue-200">infrastructure.</span>
            </h1>
            <p className="mt-4 text-blue-100/60 text-lg max-w-md leading-relaxed">
              Advanced management solutions designed for modern power systems — secure, reliable, and efficient.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: BoltIcon, text: "Real-time monitoring & analytics" },
              { icon: ShieldCheckIcon, text: "Enterprise-grade security" },
              { icon: ChartBarIcon, text: "Comprehensive reporting tools" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100/70">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 border border-white/10">
                  <feature.icon className="w-4.5 h-4.5 text-blue-200" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom - Footer */}
        <div className="relative z-10">
          <p className="text-blue-200/40 text-sm">
            © {new Date().getFullYear()} Power Systems Inc. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 bg-white relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 absolute top-8 left-6 sm:left-12">
          <div className="relative w-10 h-10 bg-[#2B4C7E]/10 rounded-lg p-1.5">
            <Image
              src="/images/powersystemslogov2.png"
              alt="Power Systems Inc"
              fill
              className="object-contain p-0.5"
            />
          </div>
          <span className="font-bold text-[#2B4C7E]">Power Systems Inc.</span>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-gray-500 text-sm">
              Enter your credentials to access your account.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm animate-fadeIn">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <EnvelopeIcon className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  id="login-email"
                  required
                  value={loginFormData.email}
                  onChange={(e) =>
                    setLoginFormData({ ...loginFormData, email: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2B4C7E]/20 focus:border-[#2B4C7E] transition-all bg-gray-50/50 focus:bg-white outline-none text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#2B4C7E] font-medium hover:text-[#1A2F4F] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <LockClosedIcon className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  required
                  value={loginFormData.password}
                  onChange={(e) =>
                    setLoginFormData({
                      ...loginFormData,
                      password: e.target.value,
                    })
                  }
                  className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2B4C7E]/20 focus:border-[#2B4C7E] transition-all bg-gray-50/50 focus:bg-white outline-none text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4.5 h-4.5" />
                  ) : (
                    <EyeIcon className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2B4C7E] text-white font-semibold rounded-xl hover:bg-[#1A2F4F] active:scale-[0.98] shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Mobile footer */}
          <p className="lg:hidden mt-12 text-center text-gray-400 text-xs">
            © {new Date().getFullYear()} Power Systems Inc. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
