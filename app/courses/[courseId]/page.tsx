"use client";

import { useParams } from "next/navigation";
import { StudentCourseViewer } from "@/component/student/StudentCourseViewer";
import { useAuth } from "@/src/hooks/useAuth";
import { roleKeys } from "@/src/constants/roleKeys";

export default function StudentCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading || !isAuthenticated || user?.role !== roleKeys.STUDENT) return null;
  return <StudentCourseViewer key={courseId} courseId={courseId} />;
}
