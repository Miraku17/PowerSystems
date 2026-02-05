import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
});

// Request interceptor for adding auth token if needed
apiClient.interceptors.request.use(
  (config) => {
    // Get auth token from localStorage and add to headers
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle errors globally
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.data);

      // Handle 401 Unauthorized - invalid or expired token
      // Skip redirect for login endpoint (wrong credentials should not redirect)
      const requestUrl = error.config?.url || "";
      const isLoginRequest = requestUrl.includes("/auth/login");
      const isRefreshRequest = requestUrl.includes("/auth/refresh");

      if (error.response.status === 401 && !isLoginRequest && !isRefreshRequest && !originalRequest._retry) {
        if (typeof window !== "undefined") {
          // Mark this request as retried to avoid infinite loops
          originalRequest._retry = true;

          if (isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return apiClient(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          isRefreshing = true;

          // Try to refresh the token
          try {
            const response = await fetch("/api/auth/refresh", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (response.ok) {
              const data = await response.json();
              const newAccessToken = data.access_token;

              // Update token in localStorage
              localStorage.setItem("authToken", newAccessToken);

              // Update the Authorization header for the failed request
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

              // Process queued requests
              processQueue(null, newAccessToken);

              isRefreshing = false;

              // Retry the original request
              return apiClient(originalRequest);
            } else {
              throw new Error("Token refresh failed");
            }
          } catch (refreshError) {
            // Refresh failed, clear auth and redirect to login
            processQueue(refreshError, null);
            isRefreshing = false;

            localStorage.removeItem("authToken");
            localStorage.removeItem("user");

            // Call logout API to clear cookies (ignore errors)
            try {
              await fetch("/api/auth/logout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });
            } catch (logoutError) {
              console.error("Error clearing cookies:", logoutError);
            }

            // Redirect to login page
            window.location.href = "/login";
            return Promise.reject(refreshError);
          }
        }
      }
    } else if (error.request) {
      // Request was made but no response
      console.error("Network Error:", error.message);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
