"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/types";
import Image from "next/image";
import { EyeIcon, EyeSlashIcon, XMarkIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { authService } from "@/services";
import apiClient from "@/lib/axios";

// --- Modal Component ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
    
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!show && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        className={`relative bg-white w-full max-w-lg rounded-2xl shadow-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] ${
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-2xl font-bold text-primary-blue">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function AuthPage() {
  const router = useRouter();
  
    // Modal States
    const [showLoginModal, setShowLoginModal] = useState(false);
  
    // Form States
    const [loginFormData, setLoginFormData] = useState<LoginForm>({
      email: "",
      password: "",
    });
  
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
  
    // Password visibility states
    const [showLoginPassword, setShowLoginPassword] = useState(false);
  
    // --- Handlers ---
  
    const resetForms = () => {
      setError("");
      setLoading(false);
      setLoginFormData({ email: "", password: "" });
    };
  
    const openLogin = () => {
      resetForms();
      setShowLoginModal(true);
    };
  
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
  
      const loadingToast = toast.loading("Logging in...");
  
      try {
        // Use local API route for Supabase login
        const response = await apiClient.post("/auth/login", {
          email: loginFormData.email,
          password: loginFormData.password,
        });
  
        const result = response.data;
  
        if (result.success && result.data?.access_token && result.data?.user) {
          const { access_token, user } = result.data;
          authService.saveToken(access_token);
          authService.saveUser(user);
  
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
    <main className="min-h-screen bg-gradient-to-br from-primary-dark-blue via-primary-blue to-[#1e3a8a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-primary-light-blue rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Landing Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <div className="mb-12 animate-slideDown">
          <div className="relative w-32 h-32 mx-auto mb-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/20 transform hover:scale-105 transition-transform duration-300">
            <Image
              src="/images/powersystemslogov2.png"
              alt="Power Systems Inc"
              fill
              className="object-contain p-2 drop-shadow-lg"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">
            Power Systems Inc.
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto font-light leading-relaxed">
            Advanced management solutions for modern power infrastructure.
            Secure, reliable, and efficient.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-slideUp">
          <button
            onClick={openLogin}
            className="group relative w-full sm:w-64 px-8 py-4 bg-white text-primary-blue font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300 flex items-center justify-center overflow-hidden"
          >
            <span className="relative z-10">Sign In</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
        
        <p className="mt-12 text-blue-200/60 text-sm">
          © {new Date().getFullYear()} Power Systems Inc. All rights reserved.
        </p>
      </div>

      {/* Login Modal */}
      <Modal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Welcome Back"
      >
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
              <div className="shrink-0 mr-2 mt-0.5">
                <XMarkIcon className="w-4 h-4" />
              </div>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              id="login-email"
              required
              value={loginFormData.email}
              onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all bg-gray-50 focus:bg-white outline-none"
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showLoginPassword ? "text" : "password"}
                id="login-password"
                required
                value={loginFormData.password}
                onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all bg-gray-50 focus:bg-white outline-none pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-blue transition-colors"
              >
                {showLoginPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-right mt-2">
              <Link href="/forgot-password" className="text-sm text-primary-blue font-medium hover:underline">Forgot Password?</Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#2B4C7E] text-white font-semibold rounded-xl hover:bg-[#1A2F4F] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </span>
            ) : "Sign In"}
          </button>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-500">
              {/* Don't have an account?{" "} */}
              {/* <button
                type="button"
                onClick={openRegister}
                className="text-primary-blue font-semibold hover:underline"
              >
                Create Account
              </button> */}
            </p>
          </div>
        </form>
      </Modal>
    </main>
  );
}
