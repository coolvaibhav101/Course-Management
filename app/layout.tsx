"use client";

import "./globals.css";
import ReduxProvider from "@/store/provider";
import MainPage from "./MainPage";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import ClientSideToastContainer from "@/component/ClientSideToastContainer";
import { Toaster } from "sonner";

// Token sync utility - syncs localStorage tokens to cookies
const syncTokensToCookies = () => {
  if (typeof window !== "undefined") {
    const authToken = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (authToken) {
      document.cookie = `auth_token=${authToken}; path=/; max-age=${60 * 60 * 24 * 7
        }`; // 7 days
    }
    if (refreshToken) {
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 30
        }`; // 30 days
    }
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Sync tokens to cookies on app load
  useEffect(() => {
    syncTokensToCookies();
  }, []);

  // Routes that should NOT have the MainPage layout
  const publicRoutes = ["/login", "/register", "/forgot-password"];
  const isPublicRoute = publicRoutes.includes(pathname);

  return (
    <html lang="en">
      <body>
        <ClientSideToastContainer />
        <Toaster richColors position="top-right" />
        <ReduxProvider>
          {isPublicRoute ? (
            // Render public pages without MainPage wrapper
            children
          ) : (
            // Render protected pages with MainPage wrapper (includes auth check)
            <MainPage>{children}</MainPage>
          )}
        </ReduxProvider>
      </body>
    </html>
  );
}
