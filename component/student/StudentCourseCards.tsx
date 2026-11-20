"use client";

import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { EnrolledCourse } from "@/src/services/student";

export function StudentCourseCards({ courses }: { courses: EnrolledCourse[] }) {
  if (courses.length === 0) {
    return <p className="rounded-lg border border-gray-200 bg-white p-8 text-gray-600">No enrolled courses yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {courses.map((course) => (
        <div key={course.id} className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="relative h-40 bg-gray-100">
            <Image
              src={course.image || "/images/course-placeholder.webp"}
              alt={course.image ? course.title : ""}
              fill
              unoptimized
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
          <div className="p-5">
            <h3 className="text-gray-900 font-semibold mb-2">{course.title}</h3>
            {course.total_chapters !== undefined ? (
              <p className="text-gray-600 text-sm mb-3">{course.total_chapters} {course.total_chapters === 1 ? "chapter" : "chapters"}</p>
            ) : course.lessons && <p className="text-gray-600 text-sm mb-3">{course.lessons}</p>}
            {course.progress !== undefined && (
              <div className="mb-4">
                <p className="text-gray-700 text-sm mb-1">Progress: {Math.round(course.progress)}%</p>
                <div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-purple-600 rounded-full" style={{ width: `${course.progress}%` }} /></div>
              </div>
            )}
            <Link href={`/courses/${encodeURIComponent(course.id)}`} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2">
              <Play className="w-4 h-4" />{course.progress ? "Continue Course" : "Launch Course"}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
