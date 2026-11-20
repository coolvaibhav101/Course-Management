"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { LeftNav } from "@/component/LeftNav";
import { TopHeader } from "@/component/TopHeader";
import { navItems } from "@/src/constants/navItems";
import { normalizeRole, RoleKey, roleKeys } from "@/src/constants/roleKeys";
import { useAuth } from "@/src/hooks/useAuth";
import { ProtectedRoute } from "@/component/ProtectedRoute";

const MainPage = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading, isAuthenticated } = useAuth(true);

  const userRole: RoleKey = user?.role
    ? normalizeRole(user.role)
    : roleKeys.SUPER_ADMIN;

  const allowedRoutes = React.useMemo(
    () =>
      (navItems[userRole] ?? []).map(
        (item: { route: string }) => item.route,
      ),
    [userRole],
  );

  const isAllowedRoute = allowedRoutes.includes(pathname) ||
    (userRole === roleKeys.STUDENT && /^\/courses\/[^/]+$/.test(pathname));

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    // Redirect root to dashboard
    if (pathname === "/") {
      router.replace("/dashboard");
      return;
    }

    // Redirect away from routes this role cannot access
    if (
      allowedRoutes.length > 0 &&
      !isAllowedRoute
    ) {
      router.replace(allowedRoutes[0] || "/dashboard");
    }
  }, [isLoading, isAuthenticated, user, pathname, router, allowedRoutes, isAllowedRoute]);

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

  if (!isAllowedRoute) return null;

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
