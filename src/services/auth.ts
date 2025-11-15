import apiClient from "@/lib/axios";
import { LoginForm, RegisterForm, User } from "@/types";

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: User;
    access_token?: string;
  };
}

export const authService = {
  // Register new user
  register: async (data: RegisterForm): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/register", {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      address: data.address,
      phone: data.phone,
      password: data.password,
    });
    return response.data;
  },

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
