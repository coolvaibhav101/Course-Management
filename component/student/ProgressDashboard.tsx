"use client";

import Link from "next/link";
import { useStudentLearning } from "@/src/hooks/useStudentLearning";
import { SkeletonDashboard } from "@/component/SkeletonLoader";

export function ProgressDashboard() {
  const { courses, summary, loading, errors, reload } = useStudentLearning();
  if (loading) return <SkeletonDashboard />;
  // Summary details supplement courses without inventing chapter totals.
  const courseData = courses.length ? courses.map((course) => {
    const details = summary?.courses.find((item) => item.id === course.id);
    return {
      ...course,
      progress: details?.progress ?? course.progress,
      completed_chapters: details?.completed_chapters ?? course.completed_chapters,
      total_chapters: details?.total_chapters ?? course.total_chapters,
    };
  }) : summary?.courses ?? [];
  const availableProgress = courseData.filter((course) => course.progress !== undefined);
  const average = summary?.average_progress ?? (availableProgress.length
    ? availableProgress.reduce((sum, course) => sum + course.progress, 0) / availableProgress.length : undefined);
  const stats = [
    { label: "Enrolled Courses", value: summary?.total_courses ?? (errors.includes("Your courses could not be loaded.") ? "—" : courseData.length) },
    { label: "Completed Courses", value: summary?.completed_courses ?? "—" },
    { label: "Completed Chapters", value: summary?.completed_chapters ?? "—" },
    { label: "Average Progress", value: average === undefined ? "—" : `${Math.round(average)}%` },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-gray-900 text-2xl font-bold">Learning Progress</h1>
      {errors.length > 0 && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4"><p>{errors.join(" ")}</p><button onClick={reload} className="mt-2 underline">Retry</button></div>}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => <div key={stat.label} className="bg-white p-6 rounded-lg border border-gray-200"><h2 className="text-gray-700 mb-2">{stat.label}</h2><p className="text-2xl font-semibold text-gray-900">{stat.value}</p></div>)}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-gray-900 text-lg font-semibold">Course Progress</h2>
        {courseData.length === 0 ? <p className="text-gray-600">{errors.length ? "Course progress is unavailable." : "No enrolled courses yet."}</p> : courseData.map((course) => (
          <div key={course.id}>
            <div className="flex flex-wrap justify-between gap-3 mb-2">
              <div>
                <Link href={`/courses/${encodeURIComponent(course.id)}`} className="text-purple-700 font-medium hover:underline">{course.title}</Link>
                {course.completed_chapters !== undefined && course.total_chapters !== undefined && <p className="text-sm text-gray-600">{course.completed_chapters} of {course.total_chapters} chapters completed</p>}
              </div>
              <p className="text-gray-700">{course.progress === undefined ? "Progress unavailable" : `${Math.round(course.progress)}%`}</p>
            </div>
            {course.progress !== undefined && <div className="h-3 rounded-full bg-gray-200"><div className="h-3 rounded-full bg-purple-600" style={{ width: `${course.progress}%` }} /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
