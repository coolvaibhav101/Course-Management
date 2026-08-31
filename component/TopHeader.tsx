import { LogOut, Bell } from "lucide-react";

interface User {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  organizationId?: string;
  organizationName?: string;
}

interface TopHeaderProps {
  user: User;
  onLogout: () => void;
  title?: string;
}

export function TopHeader({
  user,
  onLogout,
  title = "Educational Platform",
}: TopHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex justify-between items-center px-8 py-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Bell (Optional) */}
          {/* <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button> */}

          {/* User Info */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-700 font-semibold text-sm">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600">{user.role}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
