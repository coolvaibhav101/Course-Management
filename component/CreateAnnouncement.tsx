"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Select, { StylesConfig } from "react-select";
import {
  ChevronRight,
  Megaphone,
  Send,
  Users,
  Building2,
  User,
  Loader2,
} from "lucide-react";
import api from "@/src/utils/connection";

interface CreateAnnouncementProps {
  userRole: "super-admin" | "org-admin";
  organizationName?: string;
  onSave: () => void;
  onCancel: () => void;
}

const mockStudents = [
  { id: "1", name: "Hannah Martinez", org: "Tech Academy" },
  { id: "2", name: "John Smith", org: "Tech Academy" },
  { id: "3", name: "Sarah Johnson", org: "Business Institute" },
  { id: "4", name: "Mike Davis", org: "Creative School" },
];

const audienceTypeMap: Record<string, string> = {
  "all-students": "ALL_STUDENT",
  "all-organizations": "ALL_ORGANIZATIONS",
  "specific-organizations": "SPECIFIC_ORGANIZATIONS",
  both: "BOTH",
};

const audienceOptions = [
  { value: "all-students", label: "All Students" },
  { value: "all-organizations", label: "All Organizations" },
  { value: "specific-organizations", label: "Specific Organization(s)" },
  { value: "both", label: "Specific Organizations & Students" },
];

const reactSelectStyles: StylesConfig<{ value: string; label: string }, false> = {
  control: (base, state) => ({
    ...base,
    padding: "0.25rem",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#a855f7" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(168, 85, 247, 0.2)" : "none",
    "&:hover": {
      borderColor: "#a855f7",
    },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#a855f7"
      : state.isFocused
        ? "#f3e8ff"
        : "white",
    color: state.isSelected ? "white" : "#111827",
    "&:active": {
      backgroundColor: "#a855f7",
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: "#111827",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#9ca3af",
  }),
};

export function CreateAnnouncement({
  userRole,
  organizationName,
  onSave,
  onCancel,
}: CreateAnnouncementProps) {
  const [formData, setFormData] = useState({
    title: "",
    audienceType: "all-students",
    selectedOrganizations: [] as string[],
    selectedStudents: [] as string[],
    message: "",
  });
  const [organizations, setOrganizations] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoadingOrgs(true);
        const response = await api.get("/organizations/");
        const fetched = ((response?.data ?? []) as unknown[]).map(
          (org: unknown) => {
          const organization = org as Record<string, unknown>;
          return {
            id: String(organization.id ?? ""),
            name: String(organization.name ?? "Unnamed Organization"),
          };
        });
        setOrganizations(fetched);
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        toast.error("Failed to load organizations");
      } finally {
        setIsLoadingOrgs(false);
      }
    };
    fetchOrganizations();
  }, [userRole]);

  const availableOrganizations =
    userRole === "org-admin" && organizationName
      ? organizations.filter((org) => org.name === organizationName)
      : organizations;

  const availableStudents =
    userRole === "org-admin" && organizationName
      ? mockStudents.filter((s) => s.org === organizationName)
      : mockStudents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    const audienceType = audienceTypeMap[formData.audienceType];
    const payload: Record<string, string | string[]> = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      audience_type: audienceType,
    };

    if (
      formData.audienceType === "specific-organizations" ||
      formData.audienceType === "both"
    ) {
      if (formData.selectedOrganizations.length === 0) {
        toast.error("Please select at least one organization");
        return;
      }
      payload.organization_ids = formData.selectedOrganizations;
    }

    if (formData.audienceType === "both") {
      if (formData.selectedStudents.length === 0) {
        toast.error("Please select at least one student");
        return;
      }
      payload.student_ids = formData.selectedStudents;
    }

    try {
      setIsSubmitting(true);
      await api.post("/announcements/", payload);
      toast.success("Announcement published successfully");
      onSave();
    } catch (error) {
      console.error("Failed to create announcement:", error);
      toast.error("Failed to publish announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOrganization = (orgId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedOrganizations: prev.selectedOrganizations.includes(orgId)
        ? prev.selectedOrganizations.filter((id) => id !== orgId)
        : [...prev.selectedOrganizations, orgId],
    }));
  };

  const toggleStudent = (studentId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter((id) => id !== studentId)
        : [...prev.selectedStudents, studentId],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="hover:text-purple-600 cursor-pointer">
                Announcements
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900">Create Announcement</span>
            </div>
          </div>
          <div className="ml-8">
            <h1 className="text-gray-900">Create New Announcement</h1>
            <p className="text-gray-600">
              {userRole === "super-admin"
                ? "Send announcements to all students, specific organizations, or individual students"
                : `Send announcements to students in ${organizationName}`}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-lg border border-gray-200 p-8 space-y-6"
            >
              {/* Announcement Title */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Announcement Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Important Update - Spring 2025"
                />
              </div>

              {/* Audience Type */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Audience Type <span className="text-red-500">*</span>
                </label>
                <Select
                  options={audienceOptions}
                  value={audienceOptions.find(
                    (option) => option.value === formData.audienceType,
                  )}
                  onChange={(option) =>
                    setFormData({
                      ...formData,
                      audienceType: option?.value || "all-students",
                    })
                  }
                  styles={reactSelectStyles}
                  isSearchable={false}
                  placeholder="Select audience..."
                />
              </div>

              {/* Conditional: Select Organizations */}
              {(formData.audienceType === "specific-organizations" ||
                formData.audienceType === "both") && (
                <div>
                  <label className="block text-gray-700 mb-2">
                    Select Organizations
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto bg-gray-50">
                    {isLoadingOrgs ? (
                      <div className="flex items-center justify-center py-4 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Loading organizations...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableOrganizations.map((org) => (
                          <label
                            key={org.id}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedOrganizations.includes(
                                org.id,
                              )}
                              onChange={() => toggleOrganization(org.id)}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{org.name}</span>
                          </label>
                        ))}
                        {availableOrganizations.length === 0 && !isLoadingOrgs && (
                          <p className="text-gray-500 text-sm">
                            No organizations found
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 mt-2">
                    {formData.selectedOrganizations.length > 0 && (
                      <span className="text-purple-600">
                        {formData.selectedOrganizations.length}{" "}
                        organization(s) selected
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Conditional: Select Students */}
              {formData.audienceType === "both" && (
                <div>
                  <label className="block text-gray-700 mb-2">
                    Select Students
                  </label>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search students..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                    <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                    <div className="space-y-2">
                      {availableStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedStudents.includes(
                              student.id,
                            )}
                            onChange={() => toggleStudent(student.id)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <User className="w-4 h-4 text-gray-400" />
                          <div className="flex-1">
                            <span className="text-gray-900">
                              {student.name}
                            </span>
                            <span className="text-gray-500 text-sm ml-2">
                              ({student.org})
                            </span>
                          </div>
                        </label>
                      ))}
                      {availableStudents.length === 0 && (
                        <p className="text-gray-500 text-sm">
                          No students available
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-500 mt-2">
                    {formData.selectedStudents.length > 0 && (
                      <span className="text-purple-600">
                        {formData.selectedStudents.length} student(s) selected
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={10}
                  placeholder="Write your announcement message here...

Example:
Dear students,

We are pleased to announce that the new Spring 2025 semester will begin on January 26, 2025. Please review your course schedule and ensure you have access to all required materials.

Best regards,
Administration Team"
                />
                <p className="text-gray-500 mt-2">
                  {formData.message.length} characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {isSubmitting ? "Publishing..." : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-600" />
                Announcement Details
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-gray-700 mb-2">Visibility</p>
                  <div className="flex items-center gap-2">
                    {formData.audienceType === "all-students" && (
                      <>
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-900">All Students</span>
                      </>
                    )}
                    {formData.audienceType === "all-organizations" && (
                      <>
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-900">All Organizations</span>
                      </>
                    )}
                    {formData.audienceType === "specific-organizations" && (
                      <>
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-900">
                          {formData.selectedOrganizations.length || "No"}{" "}
                          Organization(s)
                        </span>
                      </>
                    )}
                    {formData.audienceType === "both" && (
                      <>
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-900">
                          {formData.selectedOrganizations.length || "No"} Org(s)
                          ,{" "}
                          {formData.selectedStudents.length || "No"} Student(s)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 mb-3">Notification Settings</p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Email notification sent to recipients</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>In-app notification badge</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Visible in Messages tab</span>
                    </li>
                  </ul>
                </div>

                {formData.title && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-gray-700 mb-2">Preview</p>
                    <div className="space-y-1">
                      <p className="text-gray-900 truncate">{formData.title}</p>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {formData.message || "No message content yet..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
