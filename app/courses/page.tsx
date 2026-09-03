"use client";
import React, { useEffect } from "react";
import { PlusCircle } from "lucide-react";
import api from "@/src/utils/connection";
import { useAuth } from "@/src/hooks/useAuth";
import { SkeletonList } from "@/component/SkeletonLoader";
import { CourseEditor } from "@/component/CourseEditor";
import { toast } from "react-toastify";

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

const page = () => {
  const { isAuthenticated } = useAuth();

  const [courseData, setCourseData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isEdit, setIsEdit] = React.useState<{
    status: boolean;
    isNew: boolean;
    formData: any;
  }>({
    status: false,
    isNew: true,
    formData: defaultFormData,
  });
  useEffect(() => {
    // Example: Fetch protected data
    // The API will automatically refresh the token if it's expired
    const fetchData = async () => {
      try {
        const coursesResponse = await api.get("/courses/");
        setCourseData(coursesResponse?.data ?? []);
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
          formData={isEdit.formData}
          setFormData={(formData: any) => setIsEdit({ ...isEdit, formData })}
          isEdit={isEdit}
          setIsEdit={setIsEdit}
        />
      </CourseEditorErrorBoundary>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-900">Courses</h2>
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
                      <button
                        onClick={() => {
                          // setEditingCourse({ id: course.id, name: course.title });
                          // setCurrentView("course-editor");
                        }}
                        className="text-purple-600 hover:text-purple-800"
                      >
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
    </div>
  );
};

export default page;
