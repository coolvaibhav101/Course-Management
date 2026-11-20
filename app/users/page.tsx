"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/src/utils/connection";

interface StudentProgress {
  id: string;
  name: string;
  organization: string;
  coursesEnrolled: number;
  averageProgress: number;
}

const UsersPage = () => {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("all");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/students/progress-summary/");
        const items = (response?.data ?? []) as unknown[];
        const fetched: StudentProgress[] = items.map(
          (item: unknown) => {
            const student = item as Record<string, unknown>;
            const user = student.user as Record<string, unknown> | undefined;
            const organization = student.organization as
              | Record<string, unknown>
              | undefined;
            return {
              id: String(student.id ?? ""),
              name: String(
                student.student_name ??
                  user?.name ??
                  student.name ??
                  "Unknown Student",
              ),
              organization: String(
                organization?.name ??
                  student.organization_name ??
                  "Unknown Organization",
              ),
              coursesEnrolled: Number(
                student.total_courses ??
                  student.courses_enrolled_count ??
                  student.courses_enrolled ??
                  0,
              ),
              averageProgress: Number(
                student.average_progress ??
                  student.average_completion ??
                  0,
              ),
            };
          },
        );
        setStudents(fetched);
      } catch (error) {
        console.error("Failed to fetch student progress:", error);
        toast.error("Failed to load students");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const organizations = useMemo(() => {
    const orgs = new Set<string>();
    students.forEach((s) => {
      if (s.organization) orgs.add(s.organization);
    });
    return Array.from(orgs).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = student.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesOrg =
        selectedOrg === "all" || student.organization === selectedOrg;
      return matchesSearch && matchesOrg;
    });
  }, [students, searchQuery, selectedOrg]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <h2 className="text-gray-900">Users & Progress</h2>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            />
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all">All Organizations</option>
              {organizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-gray-700">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-gray-700">
                  Courses Enrolled
                </th>
                <th className="px-6 py-3 text-left text-gray-700">
                  Avg Progress
                </th>
                <th className="px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading students...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {student.organization}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {student.coursesEnrolled}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${student.averageProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-700">
                          {student.averageProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-purple-600 hover:text-purple-800">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
