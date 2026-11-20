"use client";
import React, { useEffect } from "react";
import api from "@/src/utils/connection";
import { Building2, BookOpen, Users, Award } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import { SkeletonDashboard } from "@/component/SkeletonLoader";
import { OrgDashboard } from "@/component/OrgDashboard";
import { StudentDashboardHome } from "@/component/StudentDashboardHome";
import { normalizeRole, roleKeys, RoleKey } from "@/src/constants/roleKeys";

interface Organization {
  id: string;
  name: string;
  student_count: number;
  course_count: number;
  average_completion: number;
}

const SuperAdminDashboard = () => {
  const { isAuthenticated } = useAuth();
  const [orgData, setOrgData] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [totalStudentCount, setTotalStudentCount] = React.useState(0);
  const [totalCourseCount, setTotalCourseCount] = React.useState(0);
  const [averageCompletion, setAverageCompletion] = React.useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orgResponse = await api.get("/organizations/");
        let totalStudentCount = 0;
        let totalCourseCount = 0;
        let totalAverageCompletion = 0;
        const data = (orgResponse?.data ?? []) as Organization[];
        if (data.length) {
          data.forEach((org) => {
            totalStudentCount = totalStudentCount + org.student_count;
            totalCourseCount = totalCourseCount + org.course_count;
            totalAverageCompletion =
              totalAverageCompletion + org.average_completion;
          });
          totalAverageCompletion = Math.round(
            totalAverageCompletion / data.length,
          );
          setTotalStudentCount(totalStudentCount);
          setTotalCourseCount(totalCourseCount);
          setAverageCompletion(totalAverageCompletion);
        }
        setOrgData(data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-gray-900 text-2xl font-bold mb-6">
          Global Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Organizations</span>
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {orgData.length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Students</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {totalStudentCount}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Courses</span>
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {totalCourseCount}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Avg. Completion</span>
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">
              {averageCompletion}%
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-gray-900 text-lg font-semibold mb-4">
          Organizations Overview
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-gray-700">Students</th>
                <th className="px-6 py-3 text-left text-gray-700">Courses</th>
                <th className="px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orgData.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{org.name}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {org.student_count}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {org.course_count}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-purple-600 hover:text-purple-800">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Page = () => {
  const { user } = useAuth();
  const role: RoleKey = normalizeRole(user?.role);

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {role === roleKeys.SUPER_ADMIN && <SuperAdminDashboard />}
      {role === roleKeys.ORG_ADMIN && <OrgDashboard />}
      {role === roleKeys.STUDENT && <StudentDashboardHome />}
    </div>
  );
};

export default Page;
