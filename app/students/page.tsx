"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, PlusCircle } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import { CreateStudent } from "@/component/CreateStudent";
import { SkeletonTable } from "@/component/SkeletonLoader";
import { getStudents, Student } from "@/src/services/students";
import { AssignStudentCourses } from "@/component/AssignStudentCourses";
import { roleKeys } from "@/src/constants/roleKeys";

const StudentsPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [assignStudent, setAssignStudent] = useState<Student | null>(null);
  const [loadError, setLoadError] = useState("");

  const organizationId = user?.organizationId;
  const organizationName = user?.organizationName;

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      const data = await getStudents(organizationId);
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setLoadError("Students could not be refreshed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return students.filter((student) =>
      (student.name ?? "").toLowerCase().includes(query),
    );
  }, [students, searchQuery]);

  const handleSave = () => {
    setShowCreate(false);
    fetchStudents();
  };

  if (showCreate) {
    return (
      <CreateStudent
        organizationName={organizationName}
        onSave={handleSave}
        onCancel={() => setShowCreate(false)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        {loadError && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700"><p>{loadError}</p><button onClick={() => void fetchStudents()} className="mt-2 underline">Retry</button></div>}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-gray-900 text-2xl font-bold">
            Students in {organizationName || "Organization"}
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Add Student
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-gray-700">
                  Courses Enrolled
                </th>
                <th className="px-6 py-3 text-left text-gray-700">Progress</th>
                <th className="px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <SkeletonTable rows={5} columns={5} />
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
                    <td className="px-6 py-4 text-gray-700">{student.email}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {student.courses ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${student.progress ?? 0}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-700">
                          {student.progress ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user?.role === roleKeys.ORG_ADMIN && <button type="button" onClick={() => setAssignStudent(student)} className="mb-2 mr-4 inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm font-medium">
                        <BookOpen className="w-4 h-4" />Assign Courses
                      </button>}
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
      {assignStudent && user?.role === roleKeys.ORG_ADMIN && <AssignStudentCourses key={assignStudent.id} student={assignStudent} organizationId={organizationId}
        onClose={() => setAssignStudent(null)} onAssigned={() => { setAssignStudent(null); void fetchStudents(); }} />}
    </div>
  );
};

export default StudentsPage;
