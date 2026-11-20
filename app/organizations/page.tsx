"use client";
import React, { useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import api from "@/src/utils/connection";
import { SkeletonCard } from "@/component/SkeletonLoader";
import { CreateOrganization } from "@/component/CreateOrganization";
import { Course } from "@/src/services/courses";
import { Organization, OrganizationFormData, newOrganizationForm, organizationToForm } from "@/src/services/organizationData";

const Page = () => {
  const { isAuthenticated } = useAuth();
  const [orgData, setOrgData] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isEdit, setIsEdit] = React.useState({ status: false, isNew: true, formData: newOrganizationForm() });
  const [courseData, setCourseData] = React.useState<Course[]>([]);
  const refreshOrganizations = async () => {
    try {
      const response = await api.get<Organization[]>('/organizations/');
      setOrgData(response.data ?? []);
      setIsEdit((current) => {
        const updated = response.data?.find((org) => org.id === current.formData.id);
        return current.status && updated ? {
          ...current, formData: { ...current.formData, course_count: updated.course_count },
        } : current;
      });
    } catch (error) {
      console.error('Failed to refresh organizations:', error);
    }
  };
  useEffect(() => {
    // Example: Fetch protected data
    // The API will automatically refresh the token if it's expired
    const fetchData = async () => {
      try {
        const orgResponse = await api.get<Organization[]>("/organizations/");
        setOrgData(orgResponse.data ?? []);
        const coursesResponse = await api.get("/courses/");
        setCourseData((coursesResponse?.data ?? []) as Course[]);
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
        <SkeletonCard />
      </div>
    );
  }
  if (isEdit.status) {
    return (
      <CreateOrganization
        onSave={() => {
          setIsEdit({ ...isEdit, status: false, formData: newOrganizationForm() });
          void refreshOrganizations();
        }}
        onCancel={() => setIsEdit({ ...isEdit, status: false, formData: newOrganizationForm() })}
        courseData={courseData}
        onCoursesAssigned={refreshOrganizations}
        formData={isEdit.formData}
        setFormData={(formData: OrganizationFormData) =>
          setIsEdit({
            ...isEdit,
            formData,
          })
        }
        isEdit={isEdit}
      />
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-900">Organizations</h2>
          <button
            onClick={() => setIsEdit({ ...isEdit, status: true, isNew: true, formData: newOrganizationForm() })}
            className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Create Organization
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgData.map((org) => (
            <div
              key={org.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-gray-900 font-semibold break-words min-w-0">{org.name}</h3>
                <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${org.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{org.status}</span>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-gray-500 text-xs mb-1">Students</dt>
                  <dd className="text-gray-900 font-semibold">{org.student_count} <span className="text-gray-400 font-normal text-sm">/ {org.student_limit}</span></dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs mb-1">Courses</dt>
                  <dd className="text-gray-900 font-semibold">{org.course_count}</dd>
                </div>
              </dl>
              <button type="button" onClick={() => setIsEdit({ status: true, isNew: false, formData: organizationToForm(org) })}
                className="mt-auto w-full bg-purple-50 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
                Manage Organization
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Page;
