// components/ProtectedRoute.tsx
"use client";

import { useAuth } from "@/src/hooks/useAuth";
import React, { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const { isLoading, isAuthenticated } = useAuth(true);

  // Default loading fallback
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );

  if (isLoading) {
    return <>{fallback || defaultFallback}</>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login via useAuth hook
  }

  return <>{children}</>;
};
