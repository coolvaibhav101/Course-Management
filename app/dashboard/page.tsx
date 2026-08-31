"use client";
import React, { useEffect } from "react";
import api from "@/src/utils/connection";
import { Building2, BookOpen, Users, Award } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import { SkeletonDashboard } from "@/component/SkeletonLoader";
const Page = () => {
  const { isAuthenticated } = useAuth();
  const [orgData, setOrgData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [totalStudentCount, setTotalStudentCount] = React.useState(0);
  const [totalCourseCount, setTotalCourseCount] = React.useState(0);
  const [averageCompletion, setAverageCompletion] = React.useState(0);

  useEffect(() => {
    // Example: Fetch protected data
    // The API will automatically refresh the token if it's expired
    const fetchData = async () => {
      try {
        const orgResponse = await api.get("/organizations/");
        let totalStudentCount = 0;
        let totalCourseCount = 0;
        let totalAverageCompletion = 0;
        const orgData = orgResponse?.data ?? [];
        if (orgData.length) {
          orgData.forEach((org: any) => {
            totalStudentCount = totalStudentCount + org.student_count;
            totalCourseCount = totalCourseCount + org.course_count;
            totalAverageCompletion =
              totalAverageCompletion + org.average_completion;
          });
          totalAverageCompletion = Math.round(
            totalAverageCompletion / orgData.length,
          );
          setTotalStudentCount(totalStudentCount);
          setTotalCourseCount(totalCourseCount);
          setAverageCompletion(totalAverageCompletion);
        }
        setOrgData(orgData);
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
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-8">
        <div>
          <h2 className="text-gray-900 mb-6">Global Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Total Organizations</span>
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-gray-900 mb-1">{orgData.length}</p>
              {/* <p className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +1 this month
              </p> */}
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Total Students</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-gray-900 mb-1">{totalStudentCount}</p>
              {/* <p className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +42 this month
              </p> */}
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Total Courses</span>
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-gray-900 mb-1">{totalCourseCount}</p>
              {/* <p className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +3 this month
              </p> */}
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Avg. Completion</span>
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-gray-900 mb-1">{averageCompletion}%</p>
              {/* <p className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +5% this month
              </p> */}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-gray-900 mb-4">Organizations Overview</h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700">
                    Organization
                  </th>
                  {/* <th className="px-6 py-3 text-left text-gray-700">Admin</th> */}
                  <th className="px-6 py-3 text-left text-gray-700">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-gray-700">Courses</th>
                  <th className="px-6 py-3 text-left text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orgData.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{org.name}</td>
                    {/* <td className="px-6 py-4 text-gray-700">{org.admin}</td> */}
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
    </div>
  );
};

export default Page;
