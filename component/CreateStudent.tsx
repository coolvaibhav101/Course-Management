"use client";

import { useRef, useState } from "react";
import {
  ChevronRight,
  UserPlus,
  Mail,
  Phone,
  KeyRound,
  Hash,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { createStudent, CreateStudentPayload, getStudentCreationErrorMessage } from "@/src/services/students";

interface CreateStudentProps {
  organizationName?: string;
  onSave: () => void;
  onCancel: () => void;
}

export function CreateStudent({
  organizationName,
  onSave,
  onCancel,
}: CreateStudentProps) {
  const [formData, setFormData] = useState<CreateStudentPayload>({
    name: "",
    email: "",
    phone: "",
    enrolment_number: "",
    temporary_password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submissionPending = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submissionPending.current) return;
    setErrorMessage("");

    try {
      submissionPending.current = true;
      setIsSubmitting(true);
      await createStudent(formData);
      toast.success("Student added successfully");
      onSave();
    } catch (error) {
      const message = getStudentCreationErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      submissionPending.current = false;
      setIsSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, temporary_password: password });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
              type="button"
              disabled={isSubmitting}
              aria-label="Back to students"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="hover:text-purple-600 cursor-pointer">Students</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900">Add Student</span>
            </div>
          </div>
          <div className="ml-8">
            <h1 className="text-gray-900 text-2xl font-bold">Add New Student</h1>
            <p className="text-gray-600">
              Add a student to {organizationName || "your organization"}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-lg border border-gray-200 p-8 space-y-6"
            >
              <fieldset disabled={isSubmitting} className="space-y-6 disabled:opacity-70">
              {/* Name */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder="e.g., John Smith"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="student@example.com"
                  />
                </div>
                <p className="text-gray-500 mt-1">
                  Login credentials will be sent to this email address.
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Enrollment Number */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Enrolment Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.enrolment_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enrolment_number: e.target.value,
                      })
                    }
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., STU2024001"
                  />
                </div>
                <p className="text-gray-500 mt-1">
                  Unique identifier for this student in your system.
                </p>
              </div>

              {/* Temporary Password */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      autoComplete="new-password"
                      value={formData.temporary_password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          temporary_password: e.target.value,
                        })
                      }
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      placeholder="Enter temporary password"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-gray-500 mt-1">
                  Student will be prompted to change this password on first login.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 mb-1">Student Account Setup</p>
                  <p className="text-blue-700">
                    The student will receive an email with their login credentials
                    and a link to access the portal. They will be required to
                    change their password upon first login for security purposes.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {errorMessage && <p role="alert" aria-live="polite" className="bg-red-50 text-red-700 rounded-lg p-4">{errorMessage}</p>}
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
                    <UserPlus className="w-5 h-5" />
                  )}
                  {isSubmitting ? "Adding..." : "Add Student"}
                </button>
              </div>
              </fieldset>
            </form>
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-gray-900 mb-4 font-semibold">Student Access</h3>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-gray-700 mb-2 font-medium">Default Permissions</p>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Access to all organization courses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>View announcements and messages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Track progress and certificates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Submit assignments and quizzes</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 mb-2 font-medium">Organization</p>
                  <p className="text-gray-900">{organizationName || "—"}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 mb-2 font-medium">Account Status</p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    Active on Creation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
