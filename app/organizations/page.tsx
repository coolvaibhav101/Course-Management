"use client";
import React, { useEffect } from "react";
import {
  Building2,

  PlusCircle,

} from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import api from "@/src/utils/connection";
import { SkeletonCard, SkeletonPage } from "@/component/SkeletonLoader";
import { CreateOrganization } from "@/component/CreateOrganization";
const defaultFormData = {
  title: '',
  description: '',
  student_limit: 100,
  expiry_date: '',
  "status": "ACTIVE",
  org_admin: {
    "name": "",
    email: "",
    phone: "",
    temp_password: ""
  },
  course_ids: [] as string[],
}
const page = () => {
  const { isAuthenticated } = useAuth();
  const [orgData, setOrgData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isEdit, setIsEdit] = React.useState({ status: false, isNew: true, formData: defaultFormData });
  const [courseData, setCourseData] = React.useState([]);
  useEffect(() => {
    // Example: Fetch protected data
    // The API will automatically refresh the token if it's expired
    const fetchData = async () => {
      try {
        const orgResponse = await api.get("/organizations/");
        setOrgData(orgResponse?.data ?? []);
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
        <SkeletonCard />
      </div>
    );
  }
  if (isEdit.status) {
    return <CreateOrganization onSave={() => setIsEdit({ ...isEdit, status: false })} onCancel={() => setIsEdit({ ...isEdit, status: false })} courseData={courseData} formData={isEdit.formData} setFormData={(formData) => setIsEdit({ ...isEdit, formData })} isEdit={isEdit} />
  }
  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-900">Organizations</h2>
          <button
            onClick={() => setIsEdit({ ...isEdit, status: true, isNew: true, formData: defaultFormData })}
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
              className="bg-white rounded-lg border border-gray-200 p-6"
              onClick={() => setIsEdit({ ...isEdit, status: true, isNew: false, formData: org })}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">{org.name}</h3>
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="space-y-2 mb-4">
                {/* <p className="text-gray-700">Admin: {org.admin}</p> */}
                <p className="text-gray-700">{org.student_count} students</p>
                <p className="text-gray-700">{org.course_count} courses</p>
              </div>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                Manage Organization
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default page;
