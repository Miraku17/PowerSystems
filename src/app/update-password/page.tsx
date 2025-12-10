"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { EyeIcon, EyeSlashIcon, LockClosedIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      // Supabase automatically parses the hash fragment to set the session
      // We just need to check if we have a user
      const { data: { session } } = await supabase.auth.getSession();
      
      // If we are here via the email link, Supabase client should have the session from the URL hash
      if (session) {
        setIsSessionValid(true);
      } else {
        // Listen for the auth state change which happens after hash parsing
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || session) {
             setIsSessionValid(true);
          }
          setCheckingSession(false);
        });
        
        // Timeout in case the hash is invalid or missing
        setTimeout(() => {
            setCheckingSession(false);
        }, 2000);

        return () => {
          subscription.unsubscribe();
        };
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    const loadingToast = toast.loading("Updating password...");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast.success("Password updated successfully!", {
        id: loadingToast,
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || "Failed to update password", {
        id: loadingToast,
      });
      setError(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary-dark-blue via-primary-blue to-[#1e3a8a] flex items-center justify-center p-4">
        <div className="text-white text-center">
             <div className="w-16 h-16 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-lg">Verifying link...</p>
        </div>
      </main>
    );
  }

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
            <h1 className="text-3xl font-bold text-primary-blue mb-2">Set New Password</h1>
            <p className="text-gray-500 text-sm">
              Please choose a strong password for your account
            </p>
          </div>

          {!isSessionValid ? (
             <div className="text-center space-y-4">
                 <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                     <p>Invalid or expired password reset link.</p>
                 </div>
                 <button
                    onClick={() => router.push("/forgot-password")}
                    className="text-primary-blue font-medium hover:underline"
                 >
                    Request a new link
                 </button>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all bg-gray-50 focus:bg-white outline-none"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <LockClosedIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-blue transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all bg-gray-50 focus:bg-white outline-none"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                  <CheckCircleIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-blue transition-colors"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#2B4C7E] text-white font-semibold rounded-xl hover:bg-[#1A2F4F] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
