"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { loginUser } from "@/store/slices/userSlice";
import { useAppDispatch } from "@/hooks/reduxHooks";
import api, { ApiError, setTokens } from "@/src/utils/connection";

interface LoginPageProps {
  onLogin?: (user: Record<string, unknown>) => void;
}

// Define the expected response from your login API
interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    organizationId?: string;
    organizationName?: string;
    role: string;
  };
  access?: string; // JWT access token
  refresh?: string; // JWT refresh token
  token?: string; // Legacy support if API returns 'token' instead
  message?: string;
}

const Page = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Call the login API using the api object from connection.ts
      const response = await api.post<LoginResponse>("/auth/login/", {
        email,
        password,
      });

      // The response.data contains the actual API response
      if (response.data && response.data.user) {
        const userData = response.data.user;
        console.log('userData', userData);

        // Store user data in Redux
        dispatch(loginUser(userData));

        // Store both access and refresh tokens
        const accessToken = response.data.access || response.data.token;
        const refreshToken = response.data.refresh;

        if (accessToken && refreshToken) {
          // Store both tokens
          setTokens(accessToken, refreshToken);
          console.log("Tokens stored successfully");
        } else if (accessToken) {
          // Fallback: only access token (legacy support)
          setTokens(accessToken, "");
          console.warn("Only access token received, refresh token missing");
        } else {
          setError("Login failed. No authentication token received.");
          setIsLoading(false);
          return;
        }

        // Call onLogin callback if provided
        if (onLogin) {
          onLogin(userData);
        }

        // Show success message
        console.log("Login successful:", userData);

        // Navigate to dashboard
        router.push("/dashboard");
      } else {
        // Handle unexpected response structure
        setError("Login failed. Invalid response from server.");
      }
    } catch (err) {
      // Handle API errors
      if (err instanceof ApiError) {
        // Use the error message from the API
        const errorData = err.data as { message?: string } | undefined;
        setError(
          errorData?.message ||
          err.message ||
          "Login failed. Please check your credentials."
        );
      } else {
        // Handle unexpected errors
        setError("An unexpected error occurred. Please try again.");
      }
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <GraduationCap className="w-12 h-12 text-purple-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">
            Educational Platform
          </h1>
        </div>

        <div className="text-center mb-8">
          <p className="text-gray-600">Sign in to access your dashboard</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              placeholder="your.email@portal.edu"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Page;
