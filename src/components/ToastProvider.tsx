"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "#fff",
          color: "#1f2937",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          maxWidth: "500px",
        },
        // Success toast style
        success: {
          duration: 4000,
          style: {
            background: "#fff",
            color: "#1f2937",
            border: "2px solid #10b981",
          },
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },
        // Error toast style
        error: {
          duration: 5000,
          style: {
            background: "#fff",
            color: "#1f2937",
            border: "2px solid #ef4444",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
        // Loading toast style
        loading: {
          style: {
            background: "#fff",
            color: "#1f2937",
            border: "2px solid #4A6FA5",
          },
          iconTheme: {
            primary: "#4A6FA5",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}
