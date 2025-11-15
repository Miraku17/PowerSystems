"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services";

export const useAuth = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();

      if (!token) {
        // No token found, redirect to login
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);
};
