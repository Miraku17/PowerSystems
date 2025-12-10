"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { authService } from "@/services";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const loadingToast = toast.loading("Sending instructions...");

    try {
      const result = await authService.forgotPassword(email);

      if (result.success) {
        toast.success(result.message || "Instructions sent!", {
          id: loadingToast,
        });
        setSuccess(true);
      } else {
        toast.error(result.message || "Failed to send instructions", {
          id: loadingToast,
        });
        setError(result.message || "Failed to send instructions");
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
    <main className="min-h-screen bg-gradient-to-br from-primary-dark-blue via-primary-blue to-[#1e3a8a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-primary-light-blue rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Card Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 transform transition-all duration-300 hover:shadow-3xl">
          
          <div className="text-center mb-8">
             <div className="relative w-20 h-20 mx-auto mb-6 bg-white/50 rounded-2xl p-2 shadow-lg border border-blue-50">
                <Image
                  src="/images/powersystemslogov2.png"
                  alt="Power Systems Inc"
                  fill
                  className="object-contain p-1"
                />
             </div>
            <h1 className="text-3xl font-bold text-primary-blue mb-2">Forgot Password?</h1>
            <p className="text-gray-500 text-sm">
              Enter your email details to receive reset instructions
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all bg-gray-50 focus:bg-white outline-none"
                    placeholder="john@example.com"
                  />
                  <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#2B4C7E] text-white font-semibold rounded-xl hover:bg-[#1A2F4F] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                 <EnvelopeIcon className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
                <p className="text-gray-500 text-sm">
                  We've sent password reset instructions to <br/>
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>
              <button
                 onClick={() => setSuccess(false)}
                 className="text-sm text-primary-blue font-medium hover:underline"
              >
                Try a different email
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-blue transition-colors group"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
