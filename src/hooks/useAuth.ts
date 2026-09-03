// hooks/useAuth.ts
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/reduxHooks";
import { logoutUser } from "@/store/slices/userSlice";
import {
  getAuthToken,
  getRefreshToken,
  clearAuthTokens,
  manualRefreshToken,
} from "@/src/utils/connection";
import { getLocalStorage } from "../utils/storage";

export const useAuth = (requireAuth: boolean = true) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  // Cache the parsed user object so it doesn't change reference on every render
  const user = useMemo(() => getLocalStorage("user"), []);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const refreshToken = getRefreshToken();

      // Check if we have tokens
      if (token && refreshToken) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // If auth is required and no tokens, redirect to login
        if (requireAuth) {
          router.push("/login");
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [requireAuth, router]);

  const logout = async () => {
    try {
      // Clear tokens
      clearAuthTokens();

      // Clear Redux state
      dispatch(logoutUser());

      // Small delay to ensure state updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirect to login
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect even if there's an error
      router.push("/login");
    }
  };

  const refreshToken = async () => {
    try {
      const success = await manualRefreshToken();
      if (success) {
        setIsAuthenticated(true);
      } else {
        await logout();
      }
      return success;
    } catch (error) {
      console.error("Token refresh failed:", error);
      await logout();
      return false;
    }
  };

  return {
    isLoading,
    isAuthenticated,
    user,
    logout,
    refreshToken,
  };
};
