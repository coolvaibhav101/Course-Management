// components/LogoutButton.tsx
"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";

interface LogoutButtonProps {
  className?: string;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  className = "",
}) => {
  const { logout } = useAuth(false);

  return (
    <button
      onClick={logout}
      className={`flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${className}`}
    >
      <LogOut className="w-4 h-4" />
      <span>Logout</span>
    </button>
  );
};
