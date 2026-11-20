"use client";

import React, { useEffect, useState } from "react";
import { Users, BookOpen, BarChart3, Clock } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import { Course, getCourses } from "@/src/services/courses";
import { getStudents, Student } from "@/src/services/students";
import { SkeletonDashboard } from "@/component/SkeletonLoader";

export function OrgDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const organizationId = user?.organizationId;
  const organizationName = user?.organizationName || "Organization";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentData, courseData] = await Promise.all([
          getStudents(organizationId),
          getCourses({ organization_id: organizationId }),
        ]);
        setStudents(studentData);
        setCourses(courseData);
      } catch (error) {
        console.error("Failed to fetch org dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  if (loading) {
    return <SkeletonDashboard />;
  }

  const activeStudents = students.length;
  const totalCourses = courses.length;
  const averageProgress = Math.round(
    students.reduce((acc, s) => acc + (s.progress ?? 0), 0) /
      (students.length || 1),
  );
  const totalEnrollments = courses.reduce(
    (acc, c) => acc + (c.enrollments ?? c.student_count ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-gray-900 text-2xl font-bold mb-6">
          {organizationName} Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Active Students</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {activeStudents}
            </p>
            <p className="text-green-600 text-sm">+{Math.min(activeStudents, 12)} this month</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Courses</span>
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {totalCourses}
            </p>
            <p className="text-gray-600 text-sm">Available</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Avg. Completion</span>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {averageProgress}%
            </p>
            <p className="text-green-600 text-sm">+3% this month</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Active Enrollments</span>
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {totalEnrollments}
            </p>
            <p className="text-gray-600 text-sm">Total</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-gray-900 text-lg font-semibold mb-4">
          Recent Student Activity
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Student</th>
                <th className="px-6 py-3 text-left text-gray-700">Courses</th>
                <th className="px-6 py-3 text-left text-gray-700">Progress</th>
                <th className="px-6 py-3 text-left text-gray-700">Last Active</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.slice(0, 5).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No recent activity
                  </td>
                </tr>
              ) : (
                students.slice(0, 5).map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {student.courses ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${student.progress ?? 0}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-700">
                          {student.progress ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {student.last_active || (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Recently
                        </span>
                      )}
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
}
