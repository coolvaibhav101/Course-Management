"use client";

import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  Megaphone,
  Users,
  Building2,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/src/utils/connection";
import { CreateAnnouncement } from "@/component/CreateAnnouncement";
import { useAuth } from "@/src/hooks/useAuth";
import { normalizeRole, roleKeys, RoleKey } from "@/src/constants/roleKeys";

interface Announcement {
  id: string;
  title: string;
  message: string;
  audience_type: string;
  organization_ids?: string[];
  student_ids?: string[];
  created_at: string;
  created_by?: string;
}

const audienceConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ALL_STUDENT: {
    label: "All Students",
    color: "bg-purple-100 text-purple-700",
    icon: <Users className="w-4 h-4" />,
  },
  ALL_STUDENTS: {
    label: "All Students",
    color: "bg-purple-100 text-purple-700",
    icon: <Users className="w-4 h-4" />,
  },
  ALL_ORGANIZATIONS: {
    label: "All Organizations",
    color: "bg-indigo-100 text-indigo-700",
    icon: <Building2 className="w-4 h-4" />,
  },
  SPECIFIC_ORGANIZATIONS: {
    label: "Specific Organizations",
    color: "bg-blue-100 text-blue-700",
    icon: <Building2 className="w-4 h-4" />,
  },
  BOTH: {
    label: "Organizations & Students",
    color: "bg-orange-100 text-orange-700",
    icon: <Users className="w-4 h-4" />,
  },
  SPECIFIC_STUDENTS: {
    label: "Specific Students",
    color: "bg-green-100 text-green-700",
    icon: <User className="w-4 h-4" />,
  },
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const role: RoleKey = normalizeRole(user?.role);
  const canCreateAnnouncements =
    role === roleKeys.SUPER_ADMIN || role === roleKeys.ORG_ADMIN;
  const [view, setView] = useState<"list" | "create">("list");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [organizations, setOrganizations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizations = async () => {
    try {
      const response = await api.get("/organizations/");
      const orgMap: Record<string, string> = {};
      ((response?.data ?? []) as unknown[]).forEach((org: unknown) => {
        const organization = org as Record<string, unknown>;
        orgMap[String(organization.id ?? "")] = String(
          organization.name ?? "Unknown Organization",
        );
      });
      setOrganizations(orgMap);
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/announcements/");
      const items = (response?.data ?? []) as unknown[];
      const fetched: Announcement[] = items.map(
        (item: unknown) => {
          const announcement = item as Record<string, unknown>;
          return {
            id: String(announcement.id ?? ""),
            title: String(announcement.title ?? ""),
            message: String(announcement.message ?? ""),
            audience_type: String(
              announcement.audience_type ?? "ALL_STUDENTS",
            ),
            organization_ids: Array.isArray(announcement.organization_ids)
              ? announcement.organization_ids.map(String)
              : undefined,
            student_ids: Array.isArray(announcement.student_ids)
              ? announcement.student_ids.map(String)
              : undefined,
            created_at: String(announcement.created_at ?? ""),
            created_by: announcement.created_by as string | undefined,
          };
        },
      );
      setAnnouncements(fetched);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchAnnouncements();
  }, []);

  const handleSave = () => {
    setView("list");
    fetchAnnouncements();
  };

  if (view === "create" && canCreateAnnouncements) {
    return (
      <CreateAnnouncement
        userRole={role === roleKeys.SUPER_ADMIN ? "super-admin" : "org-admin"}
        organizationName={user?.organizationName || user?.name}
        onSave={handleSave}
        onCancel={() => setView("list")}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-900 text-2xl font-bold">Announcements</h2>
          {canCreateAnnouncements && (
            <button
              onClick={() => setView("create")}
              className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              Create Announcement
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">No announcements yet</p>
            <p className="text-gray-500 text-sm">
              Click &quot;Create Announcement&quot; to publish one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const config = audienceConfig[announcement.audience_type] ||
                audienceConfig.ALL_STUDENTS;
              const orgNames =
                (announcement.audience_type === "SPECIFIC_ORGANIZATIONS" ||
                  announcement.audience_type === "BOTH") &&
                announcement.organization_ids
                  ? announcement.organization_ids
                      .map((id) => organizations[id] || id)
                      .filter(Boolean)
                  : [];
              return (
                <div
                  key={announcement.id}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-gray-900 mb-1">{announcement.title}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${config.color}`}
                      >
                        {config.icon}
                        {config.label}
                      </span>
                    </div>
                    <span className="text-gray-600 text-sm">
                      {formatDate(announcement.created_at)}
                    </span>
                  </div>
                  {orgNames.length > 0 && (
                    <div className="mb-3">
                      <p className="text-gray-600 text-sm">
                        Organizations:{" "}
                        {orgNames.map((name, index) => (
                          <span key={name} className="text-gray-900 font-medium">
                            {name}
                            {index < orgNames.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    </div>
                  )}
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {announcement.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
