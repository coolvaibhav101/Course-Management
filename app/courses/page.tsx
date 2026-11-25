"use client";
import React, { useEffect } from "react";
import { PlusCircle, BookOpen } from "lucide-react";
import api from "@/src/utils/connection";
import { useAuth } from "@/src/hooks/useAuth";
import { SkeletonList, SkeletonCard } from "@/component/SkeletonLoader";
import { CourseEditor } from "@/component/CourseEditor";
import { normalizeRole, roleKeys, RoleKey } from "@/src/constants/roleKeys";
import { Course, getCourses } from "@/src/services/courses";
import { getEnrolledCourses } from "@/src/services/student";
import type { EnrolledCourse } from "@/src/services/student";
import { StudentCourseCards } from "@/component/student/StudentCourseCards";

class CourseEditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CourseEditorErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-600">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const defaultFormData = {
  name: "",
  description: "",
  student_limit: 100,
  expiry_date: "",
  status: "ACTIVE",
  org_admin: {
    name: "",
    email: "",
    phone: "",
    temp_password: "",
  },
  course_ids: [] as string[],
};

type CourseFormData = Course | typeof defaultFormData;

const AdminCourses = () => {
  const { isAuthenticated } = useAuth();
  const [courseData, setCourseData] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isEdit, setIsEdit] = React.useState<{
    status: boolean;
    isNew: boolean;
    formData: CourseFormData;
  }>({
    status: false,
    isNew: true,
    formData: defaultFormData,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const coursesResponse = await api.get("/courses/");
        setCourseData((coursesResponse?.data ?? []) as Course[]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && !isEdit.status) {
      fetchData();
    }
  }, [isAuthenticated, isEdit.status]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-8">
        <SkeletonList />
      </div>
    );
  }

  if (isEdit.status) {
    return (
      <CourseEditorErrorBoundary>
        <CourseEditor
          onSave={() => setIsEdit({ ...isEdit, status: false })}
          onCancel={() => setIsEdit({ ...isEdit, status: false })}
          formData={isEdit.formData as Record<string, unknown>}
          setFormData={(formData: Record<string, unknown>) =>
            setIsEdit({
              ...isEdit,
              formData: formData as CourseFormData,
            })
          }
          isEdit={isEdit}
          setIsEdit={
            setIsEdit as (isEdit: Record<string, unknown>) => void
          }
        />
      </CourseEditorErrorBoundary>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-gray-900 text-2xl font-bold">Courses</h2>
        <button
          onClick={() =>
            setIsEdit({
              ...isEdit,
              status: true,
              isNew: true,
              formData: defaultFormData,
            })
          }
          type="button"
          className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Add Course
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700">
                Course Title
              </th>
              <th className="px-6 py-3 text-left text-gray-700">Students</th>
              <th className="px-6 py-3 text-left text-gray-700">
                Organizations
              </th>
              <th className="px-6 py-3 text-left text-gray-700">
                Completion
              </th>
              <th className="px-6 py-3 text-left text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {React.Children.toArray(
              courseData.map((course) => (
                <tr
                  key={course.id}
                  className="hover:bg-gray-50"
                  onClick={() =>
                    setIsEdit({
                      ...isEdit,
                      status: true,
                      isNew: false,
                      formData: course,
                    })
                  }
                >
                  <td className="px-6 py-4 text-gray-900">{course.title}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {course.student_count}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {course.organization_count}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: `${course.average_completion ?? 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-gray-700">
                        {course.average_completion}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-purple-600 hover:text-purple-800">
                      Edit
                    </button>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OrgAdminCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCourses({ organization_id: user?.organizationId });
        setCourses(data);
      } catch (error) {
        console.error("Failed to fetch org courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.organizationId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-gray-900 text-2xl font-bold">Organization Courses</h2>
      {courses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">No courses available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const progress =
              course.avg_progress ?? course.average_completion ?? 0;
            const enrollments =
              course.enrollments ?? course.student_count ?? 0;
            return (
              <div
                key={course.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <h3 className="text-gray-900 text-lg font-semibold mb-4">
                  {course.title}
                </h3>
                <div className="space-y-2 mb-4">
                  <p className="text-gray-700">
                    {enrollments} students enrolled
                  </p>
                  <div>
                    <div className="flex justify-between text-gray-700 mb-1 text-sm">
                      <span>Avg. Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  Manage Assignments
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StudentCourses = () => {
  const [courses, setCourses] = React.useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getEnrolledCourses();
        if (!cancelled) setCourses(data);
      } catch (error) {
        console.error("Failed to fetch enrolled courses:", error);
        if (!cancelled) setError("Your courses could not be loaded. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [attempt]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-gray-900 text-2xl font-bold">My Courses</h2>
      {error ? <div role="alert" className="bg-red-50 text-red-700 p-6 rounded-lg"><p>{error}</p><button onClick={() => setAttempt((value) => value + 1)} className="mt-2 underline">Retry</button></div> : <StudentCourseCards courses={courses} />}
    </div>
  );
};

const CoursesPage = () => {
  const { user } = useAuth();
  const role: RoleKey = normalizeRole(user?.role);

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {role === roleKeys.SUPER_ADMIN && <AdminCourses />}
      {role === roleKeys.ORG_ADMIN && <OrgAdminCourses />}
      {role === roleKeys.STUDENT && <StudentCourses />}
    </div>
  );
};

export default CoursesPage;
