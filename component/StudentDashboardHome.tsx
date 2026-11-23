"use client";

import Link from "next/link";
import { useStudentLearning } from "@/src/hooks/useStudentLearning";
import { StudentCourseCards } from "@/component/student/StudentCourseCards";
import { SkeletonDashboard } from "@/component/SkeletonLoader";

export function StudentDashboardHome() {
  const { courses, summary, loading, errors, reload } = useStudentLearning();

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-8">
      {errors.length > 0 && <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg"><p>{errors.join(" ")}</p><button onClick={reload} className="mt-2 underline">Retry</button></div>}
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Enrolled courses", value: summary?.total_courses ?? (errors.includes("Your courses could not be loaded.") ? "—" : courses.length) },
          { label: "Courses completed", value: summary?.completed_courses ?? "—" },
          { label: "Chapters completed", value: summary?.completed_chapters ?? "—" },
          { label: "Total chapters", value: summary?.total_chapters ?? "—" },
          { label: "Avg. progress", value: summary?.average_progress === undefined ? "—" : `${Math.round(summary.average_progress)}%` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg p-4 border border-gray-200"
          >
            <p className="text-gray-900 text-xl font-semibold mb-1">
              {stat.value}
            </p>
            <p className="text-gray-600 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* My Courses */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 text-lg font-semibold">My courses</h3>
            <Link href="/courses" aria-label="View all courses" className="text-purple-600 hover:text-purple-800">→</Link>
          </div>

          {!errors.includes("Your courses could not be loaded.") && <StudentCourseCards courses={courses} />}

          {/* Skill Graph */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 text-lg font-semibold">Skill graph</h3>
              <button className="text-purple-600 hover:text-purple-800">→</button>
            </div>
            <div className="flex items-end gap-2 h-40">
              {[
                { height: "30%", label: "30%", color: "bg-purple-600" },
                { height: "70%", label: "", color: "bg-purple-600" },
                { height: "50%", label: "", color: "bg-purple-400" },
                { height: "40%", label: "", color: "bg-purple-300" },
              ].map((bar, idx) => (
                <div
                  key={idx}
                  className={`flex-1 ${bar.color} rounded-t flex items-end justify-center pb-2 text-white`}
                  style={{ height: bar.height }}
                >
                  {bar.label}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 flex-wrap text-sm">
              {[
                { color: "bg-purple-600", label: "Math foundations" },
                { color: "bg-blue-600", label: "Coding & tools" },
                { color: "bg-pink-600", label: "Data skills" },
                { color: "bg-purple-300", label: "Prompt engineering" },
                { color: "bg-purple-400", label: "Model evaluation" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 ${item.color} rounded`}></div>
                  <span className="text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
}
