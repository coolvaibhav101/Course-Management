import { roleKeys } from "./roleKeys";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Megaphone,
  Users,
  BarChart3,
  MessageSquare,
} from "lucide-react";
export const navItems = {
  [roleKeys.SUPER_ADMIN]: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      route: "/dashboard",
    },
    {
      id: "organizations",
      label: "Organizations",
      icon: Building2,
      route: "/organizations",
    },
    { id: "courses", label: "Courses", icon: BookOpen, route: "/courses" },
    {
      id: "announcements",
      label: "Announcements",
      icon: Megaphone,
      route: "/announcements",
    },
    {
      id: "users",
      label: "Users & Progress",
      icon: Users,
      route: "/users",
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      icon: BarChart3,
      route: "/reports",
    },
    // { id: "settings", label: "Settings", icon: Settings },
  ],
  [roleKeys.ORG_ADMIN]: [
    { id: "dashboard", label: "Org Dashboard", route: "/dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", route: "/students", icon: Users },
    { id: "courses", label: "Courses", route: "/courses", icon: BookOpen },
    { id: "announcements", label: "Announcements", route: "/announcements", icon: Megaphone },
    // { id: "messages", label: "Messages", route: "/messages", icon: MessageSquare, badge: 1  },
    // { id: "reports", label: "Reports & Analytics", route: "/reports", icon: BarChart3 },
  ],
  [roleKeys.STUDENT]: [
    { id: "dashboard", label: "Dashboard", route: "/dashboard", icon: LayoutDashboard },
    { id: "courses", label: "Courses", route: "/courses", icon: BookOpen },
    { id: "messages", label: "Messages", route: "/messages", icon: MessageSquare,
      //  badge: 1
        },
    { id: "reports", label: "Analytics", route: "/reports", icon: BarChart3 },
  ],
};
