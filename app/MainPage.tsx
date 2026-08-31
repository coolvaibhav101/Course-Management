"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { LeftNav } from "@/component/LeftNav";
import { TopHeader } from "@/component/TopHeader";
import { roleKeys } from "@/src/constants/roleKeys";
import { useAuth } from "@/src/hooks/useAuth";
import { ProtectedRoute } from "@/component/ProtectedRoute";

const MainPage = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user, logout, isLoading, isAuthenticated } = useAuth(true);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If not authenticated, useAuth will redirect to login
  // So we just show loading state here
  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Get user display name
  const userName = user.name || "User";
  const userRole = user.role || roleKeys.SUPER_ADMIN;

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <LeftNav activeTab={pathname} userName={userName} userRole={userRole} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopHeader user={user} onLogout={logout} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default MainPage;
