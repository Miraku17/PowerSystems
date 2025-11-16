"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm, RegisterForm } from "@/types";
import Image from "next/image";
import { EyeIcon, EyeSlashIcon, CheckIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { authService } from "@/services";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Multi-step registration

  const [loginFormData, setLoginFormData] = useState<LoginForm>({
    email: "",
    password: "",
  });

  const [registerFormData, setRegisterFormData] = useState<RegisterForm>({
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    address: "",
    phone: "",
    password: "",
    verifyPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  const handleFlip = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setIsLogin(!isLogin);
      setError("");
      setCurrentStep(1); // Reset to step 1 when switching
      setIsFlipping(false);
    }, 400);
  };

  const handleNextStep = () => {
    // Validate Step 1 fields
    if (
      !registerFormData.firstName ||
      !registerFormData.lastName ||
      !registerFormData.email ||
      !registerFormData.phone ||
      !registerFormData.address
    ) {
      setError("Please fill in all fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerFormData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setError("");
    setCurrentStep(1);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const loadingToast = toast.loading("Logging in...");

    try {
      const result = await authService.login(loginFormData);

      if (result.success && result.data?.access_token && result.data?.user) {
        // Save token and user data
        authService.saveToken(result.data?.access_token);
        authService.saveUser(result.data?.user);

        toast.success("Login successful! Redirecting...", {
          id: loadingToast,
        });

        // Redirect to dashboard
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (registerFormData.password !== registerFormData.verifyPassword) {
      toast.error("Passwords do not match");
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (registerFormData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    if (!registerFormData.username) {
      toast.error("Username is required");
      setError("Username is required");
      setLoading(false);
      return;
    }

    const loadingToast = toast.loading("Creating your account...");

    try {
      const result = await authService.register(registerFormData);

      if (result.success) {
        toast.success("Registration successful! You can now login.", {
          id: loadingToast,
          duration: 5000,
        });

        // Reset form and switch to login
        setRegisterFormData({
          email: "",
          firstName: "",
          lastName: "",
          username: "",
          address: "",
          phone: "",
          password: "",
          verifyPassword: "",
        });
        setCurrentStep(1);
        setIsLogin(true);
      } else {
        toast.error(result.message || "Registration failed", {
          id: loadingToast,
        });
        setError(result.message || "Registration failed");
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

  // Step Indicator Component
  const StepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-center space-x-4">
        {/* Step 1 */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
              currentStep >= 1
                ? "text-white shadow-lg ring-4 ring-blue-100"
                : "bg-gray-200 text-gray-500"
            }`}
            style={currentStep >= 1 ? { backgroundColor: "#4A6FA5" } : {}}
          >
            {currentStep > 1 ? <CheckIcon className="w-5 h-5" /> : "1"}
          </div>
          <span
            className={`ml-2 text-sm font-medium hidden sm:inline ${
              currentStep >= 1 ? "" : "text-gray-400"
            }`}
            style={currentStep >= 1 ? { color: "#2B4C7E" } : {}}
          >
            Profile Info
          </span>
        </div>

        {/* Divider */}
        <div
          className={`w-12 h-1 rounded transition-all duration-300 ${
            currentStep >= 2 ? "" : "bg-gray-200"
          }`}
          style={currentStep >= 2 ? { backgroundColor: "#4A6FA5" } : {}}
        ></div>

        {/* Step 2 */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
              currentStep >= 2
                ? "text-white shadow-lg ring-4 ring-blue-100"
                : "bg-gray-200 text-gray-500"
            }`}
            style={currentStep >= 2 ? { backgroundColor: "#4A6FA5" } : {}}
          >
            2
          </div>
          <span
            className={`ml-2 text-sm font-medium hidden sm:inline ${
              currentStep >= 2 ? "" : "text-gray-400"
            }`}
            style={currentStep >= 2 ? { color: "#2B4C7E" } : {}}
          >
            Account Info
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-200 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background pattern */}

      <div className="w-full max-w-md sm:max-w-2xl lg:max-w-6xl relative z-10">
        <div
          className="relative shadow-2xl overflow-hidden backdrop-blur-sm"
          style={{
            perspective: "1500px",
            perspectiveOrigin: "50% 50%",
            borderRadius: "1rem",
          }}
        >
          <div className="grid lg:grid-cols-2 min-h-[450px] sm:min-h-[500px] lg:min-h-[600px]">
            {/* Left Side - Register Form */}
            <div
              className={`bg-white flex flex-col ${
                isLogin ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="flex flex-col h-full max-w-md mx-auto w-full">
                {/* Static Header */}
                <div className="pt-6 sm:pt-8">
                  <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary-blue mb-3">
                      Create Account
                    </h1>
                  </div>

                  {/* Step Indicator */}
                  <StepIndicator />
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6 min-h-[450px]">
                  <form
                    onSubmit={
                      currentStep === 1
                        ? (e) => {
                            e.preventDefault();
                            handleNextStep();
                          }
                        : handleRegisterSubmit
                    }
                    className="space-y-3 sm:space-y-4 pb-4"
                  >
                    {error && (
                      <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    {/* Step 1: Profile Information */}
                    {currentStep === 1 && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="firstName"
                              className="block text-sm font-medium text-primary-blue mb-2"
                            >
                              First Name
                            </label>
                            <input
                              type="text"
                              id="firstName"
                              required
                              value={registerFormData.firstName}
                              onChange={(e) =>
                                setRegisterFormData({
                                  ...registerFormData,
                                  firstName: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2.5 sm:py-3 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                              placeholder="First name"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="lastName"
                              className="block text-sm font-medium text-primary-blue mb-2"
                            >
                              Last Name
                            </label>
                            <input
                              type="text"
                              id="lastName"
                              required
                              value={registerFormData.lastName}
                              onChange={(e) =>
                                setRegisterFormData({
                                  ...registerFormData,
                                  lastName: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2.5 sm:py-3 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                              placeholder="Last name"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="registerEmail"
                            className="block text-sm font-medium text-primary-blue mb-2"
                          >
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="registerEmail"
                            required
                            value={registerFormData.email}
                            onChange={(e) =>
                              setRegisterFormData({
                                ...registerFormData,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 sm:py-3.5 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                            placeholder="Enter your email"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="phone"
                            className="block text-sm font-medium text-primary-blue mb-2"
                          >
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            required
                            value={registerFormData.phone}
                            onChange={(e) =>
                              setRegisterFormData({
                                ...registerFormData,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 sm:py-3.5 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                            placeholder="Enter your phone number"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="address"
                            className="block text-sm font-medium text-primary-blue mb-2"
                          >
                            Address
                          </label>
                          <textarea
                            id="address"
                            required
                            rows={2}
                            value={registerFormData.address}
                            onChange={(e) =>
                              setRegisterFormData({
                                ...registerFormData,
                                address: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 sm:py-3.5 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base resize-none bg-white"
                            placeholder="Enter your address"
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 2: Account Information */}
                    {currentStep === 2 && (
                      <div className="space-y-4 animate-fadeIn">
                        <div>
                          <label
                            htmlFor="username"
                            className="block text-sm font-medium text-primary-blue mb-2"
                          >
                            Username
                          </label>
                          <input
                            type="text"
                            id="username"
                            required
                            value={registerFormData.username}
                            onChange={(e) =>
                              setRegisterFormData({
                                ...registerFormData,
                                username: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 sm:py-3.5 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                            placeholder="Choose a username"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="registerPassword"
                            className="block text-sm font-medium text-primary-blue mb-2"
                          >
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showRegisterPassword ? "text" : "password"}
                              id="registerPassword"
                              required
                              value={registerFormData.password}
                              onChange={(e) =>
                                setRegisterFormData({
                                  ...registerFormData,
                                  password: e.target.value,
                                })
                              }
                              className="w-full px-4 py-3 sm:py-3.5 pr-12 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                              placeholder="At least 8 characters"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowRegisterPassword(!showRegisterPassword)
                              }
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary-gray hover:text-primary-blue transition-colors"
                            >
                              {showRegisterPassword ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="verifyPassword"
                            className="block text-sm font-medium text-primary-blue mb-2"
                          >
                            Verify Password
                          </label>
                          <div className="relative">
                            <input
                              type={showVerifyPassword ? "text" : "password"}
                              id="verifyPassword"
                              required
                              value={registerFormData.verifyPassword}
                              onChange={(e) =>
                                setRegisterFormData({
                                  ...registerFormData,
                                  verifyPassword: e.target.value,
                                })
                              }
                              className="w-full px-4 py-3 sm:py-3.5 pr-12 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                              placeholder="Confirm your password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowVerifyPassword(!showVerifyPassword)
                              }
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary-gray hover:text-primary-blue transition-colors"
                            >
                              {showVerifyPassword ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                {/* Static Action Buttons */}
                <div className="px-2 sm:px-4 lg:px-6 pb-3">
                  {currentStep === 1 ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleNextStep();
                      }}
                      className="w-full text-white py-3 sm:py-3.5 px-4 rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base hover:opacity-90"
                      style={{ backgroundColor: "#2B4C7E" }}
                    >
                      Next Step
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handlePreviousStep}
                        className="w-1/3 bg-gray-200 text-gray-700 py-3 sm:py-3.5 px-4 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium text-sm sm:text-base"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRegisterSubmit}
                        disabled={loading}
                        className="w-2/3 text-white py-3 sm:py-3.5 px-4 rounded-lg transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base hover:opacity-90"
                        style={{ backgroundColor: "#2B4C7E" }}
                      >
                        {loading ? "Creating Account..." : "Create Account"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Static Footer */}
                <div className="py-3">
                  <p className="text-secondary-gray text-sm text-center">
                    Already have an account?{" "}
                    <button
                      onClick={handleFlip}
                      disabled={isFlipping}
                      className="text-primary-blue font-medium hover:text-primary-darkBlue transition-colors disabled:opacity-50"
                    >
                      Login
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div
              className={`bg-white p-6 sm:p-8 lg:p-12 flex flex-col justify-center ${
                !isLogin ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="max-w-sm mx-auto w-full">
                <div className="text-center mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary-blue mb-2">
                    Welcome Back
                  </h1>
                  <p className="text-sm sm:text-base text-secondary-gray">
                    Sign in to your account
                  </p>
                </div>

                <form
                  onSubmit={handleLoginSubmit}
                  className="space-y-4 sm:space-y-6"
                >
                  {error && isLogin && (
                    <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-primary-blue mb-2"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      required
                      value={loginFormData.email}
                      onChange={(e) =>
                        setLoginFormData({
                          ...loginFormData,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 sm:py-3.5 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                      placeholder="Enter your username"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-primary-blue mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        id="password"
                        required
                        value={loginFormData.password}
                        onChange={(e) =>
                          setLoginFormData({
                            ...loginFormData,
                            password: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 sm:py-3.5 pr-12 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors text-sm sm:text-base bg-white"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary-gray hover:text-primary-blue transition-colors"
                      >
                        {showLoginPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white py-3 sm:py-3.5 px-4 rounded-lg transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base hover:opacity-90"
                    style={{ backgroundColor: "#2B4C7E" }}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </form>

                <div className="mt-6 text-center space-y-2">
                  <p className="text-secondary-gray text-sm">
                    <button
                      onClick={() => router.push("/forgot-password")}
                      className="text-primary-blue font-medium hover:text-primary-darkBlue transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </p>
                  <p className="text-secondary-gray text-sm">
                    Don&apos;t have an account?{" "}
                    <button
                      onClick={handleFlip}
                      disabled={isFlipping}
                      className="text-primary-blue font-medium hover:text-primary-darkBlue transition-colors disabled:opacity-50"
                    >
                      Register
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Sliding Logo Component */}
            {/* Desktop sliding panel - hidden on mobile */}
            <div
              className={`hidden lg:block absolute transition-all duration-500 ease-in-out ${
                isFlipping ? "shadow-2xl" : "shadow-xl"
              }`}
              style={{
                top: "-4px",
                bottom: "-4px",
                left: isLogin ? "-4px" : "calc(50% - 4px)",
                right: isLogin ? "auto" : "-4px",
                width: isLogin ? "calc(50% + 4px)" : "calc(50% + 4px)",
                zIndex: 10,
                background: "linear-gradient(135deg, #2B4C7E 0%, #1A2F4F 100%)",
              }}
            >
              <div className="h-full p-12 flex flex-col items-center justify-center relative">
                <div className="text-center relative z-10">
                  <div className="mb-6">
                    <Image
                      src="/images/powersystemslogov2.png"
                      alt="Power Systems Inc"
                      width={250}
                      height={250}
                      className="mx-auto drop-shadow-2xl"
                    />
                  </div>
                  <h2 className="text-5xl font-bold text-white mb-4 tracking-wider drop-shadow-2xl">
                    Power Systems Inc
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
