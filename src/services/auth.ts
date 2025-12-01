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

  // Logout user
  logout: async (): Promise<void> => {
    // Clear local storage or any auth tokens
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
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

  // Save refresh token
  saveRefreshToken: (token: string): void => {
    localStorage.setItem("refreshToken", token);
  },

  // Get refresh token
  getRefreshToken: (): string | null => {
    return localStorage.getItem("refreshToken");
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
