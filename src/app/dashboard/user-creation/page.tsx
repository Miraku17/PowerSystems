"use client";

import React, { useState } from "react";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";

export default function UserCreationPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    username: "",
    address: "",
    phone: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.post("/auth/register", {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        address: formData.address,
        phone: formData.phone,
      });

      if (response.data.success) {
        toast.success("User created successfully!");
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          firstName: "",
          lastName: "",
          username: "",
          address: "",
          phone: "",
        });
      } else {
        toast.error(response.data.message || "Failed to create user");
      }
    } catch (error: any) {
      console.error("User creation error:", error);
      toast.error(
        error.response?.data?.message || "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const InputField = ({
    label,
    name,
    type = "text",
    required = false,
    placeholder = "",
  }: {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }) => (
    <div className="flex flex-col space-y-1">
      <label
        htmlFor={name}
        className="text-sm font-semibold text-gray-700 uppercase tracking-wider"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={(formData as any)[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white"
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Creation</h1>
          <p className="text-gray-500 mt-1">Create new user accounts for the system.</p>
        </div>
        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
          <UserPlusIcon className="h-8 w-8" />
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Personal Information */}
            <section>
              <h3 className="text-lg font-bold text-[#2B4C7E] border-b pb-2 mb-6">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="First Name"
                  name="firstName"
                  required
                  placeholder="e.g. John"
                />
                <InputField
                  label="Last Name"
                  name="lastName"
                  required
                  placeholder="e.g. Doe"
                />
                <InputField
                  label="Address"
                  name="address"
                  placeholder="Full Address"
                />
                <InputField
                  label="Phone Number"
                  name="phone"
                  placeholder="+63 900 000 0000"
                />
              </div>
            </section>

            {/* Account Details */}
            <section>
              <h3 className="text-lg font-bold text-[#2B4C7E] border-b pb-2 mb-6">
                Account Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Username"
                  name="username"
                  required
                  placeholder="johndoe"
                />
                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                />
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                />
                <InputField
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                />
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-end pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setFormData({
                    email: "",
                    password: "",
                    confirmPassword: "",
                    firstName: "",
                    lastName: "",
                    username: "",
                    address: "",
                    phone: "",
                })}
                className="px-6 py-2.5 mr-4 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                disabled={isLoading}
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-8 py-2.5 bg-[#2B4C7E] text-white font-bold rounded-xl hover:bg-[#1A2F4F] transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating User...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Create User
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
