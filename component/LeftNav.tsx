import { navItems } from "@/src/constants/navItems";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { X, Menu } from "lucide-react";

interface LeftNavProps {
  activeTab: string;
  userName: string;
  userRole: string;
  title?: string;
}

export function LeftNav({ activeTab, userName, userRole, title = "Educational Platform" }: LeftNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const items = navItems[userRole];

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
      )}

      {/* Overlay - Only visible on mobile when menu is open */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200 flex flex-col h-screen
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* Close Button - Only visible on mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-700 font-semibold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-600 truncate">{userRole}</p>
            </div>
          </div>
        </div>
        <div className="flex lg:hidden items-center gap-3 px-5 border-b py-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-l font-semibold text-gray-900">{title}</h1>
        </div>
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {(items ?? []).map((item: any) => {
            const Icon = item.icon;
            const isActive = activeTab === `/${item.id}`;

            return (
              <Link
                key={item.id}
                href={item.route}
                onClick={handleNavClick}
                className={`
                  w-full flex items-center gap-3 px-6 py-4 transition-colors
                  ${isActive
                    ? "bg-purple-50 text-purple-700 border-r-4 border-purple-700"
                    : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left text-sm font-medium">
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
