import apiClient from "@/lib/axios";
import { LoginForm, User } from "@/types";

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: User;
    access_token?: string;
  };
}

export const authService = {
  // Login user
  login: async (data: LoginForm): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      username: data.email, // Using email field for username
      password: data.password,
    });
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/forgot-password", {
      email,
    });
    return response.data;
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      // Call logout API to clear cookies
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with local cleanup even if API call fails
    }

    // Clear local storage or any auth tokens
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  },

  // Save auth token
  saveToken: (token: string): void => {
    localStorage.setItem("authToken", token);
  },

  // Get auth token
  getToken: (): string | null => {
    return localStorage.getItem("authToken");
  },

  // Save user data
  saveUser: (user: User): void => {
    localStorage.setItem("user", JSON.stringify(user));
  },

  // Get user data
  getUser: (): User | null => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
};
