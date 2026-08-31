import { useState } from 'react';
import { ChevronRight, Building2, Calendar, Users, BookOpen } from 'lucide-react';
import api from '@/src/utils/connection';

interface CreateOrganizationProps {
  onSave: () => void;
  onCancel: () => void;
  courseData: any;
  formData: any;
  setFormData: (formData: any) => void;
  isEdit: any;
}


export function CreateOrganization({ onSave, onCancel, courseData, formData, setFormData, isEdit }: CreateOrganizationProps) {


  const toggleCourse = (courseId: string) => {
    setFormData({
      ...formData,
      course_ids: ((formData?.course_ids ?? [])?.includes(courseId))
        ? ((formData?.course_ids ?? [])?.filter(id => id !== courseId))
        : [...((formData?.course_ids ?? []) ?? []), courseId],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit.isNew) {
      const orgResponse = await api.post("/organizations/", formData);
      console.log('orgResponse', orgResponse);

      //  setOrgData(orgResponse?.data ?? []);
    } else {
      const orgResponse = await api.put(`/organizations/${formData.id}`, formData);
      console.log('orgResponse', orgResponse);
    }
    // Validation would go here
    onSave();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="hover:text-purple-600 cursor-pointer">Organizations</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900">Create Organization</span>
            </div>
          </div>
          <h1 className="text-gray-900 ml-8">Create New Organization</h1>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
              {/* Organization Name */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Tech Academy"
                />
              </div>

              {/* Organization Admin Email */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Organisation Admin Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData?.org_admin?.email}
                  onChange={(e) => setFormData({ ...formData, org_admin: { ...(formData?.org_admin ?? {}), email: e.target.value } })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="admin@organization.edu"
                />
                <p className="text-gray-500 mt-1">
                  This person will have admin access to manage students and view reports for this organization.
                </p>
              </div>

              {/* Organization Admin Description */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Organisation Admin Desc.
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Brief description or notes about the organization admin..."
                />
              </div>

              {/* Number of Students */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Number of Students <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.student_limit}
                  onChange={(e) => setFormData({ ...formData, student_limit: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-dark"
                  placeholder="e.g., 150"
                />
                <p className="text-gray-500 mt-1">
                  Maximum number of students that can be enrolled in this organization.
                </p>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-gray-500 mt-1">
                  Organization access will expire on this date. Can be extended later.
                </p>
              </div>

              {/* Allot Courses */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Allot Courses from Course List
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                  <div className="space-y-2">
                    {courseData.map((course) => (
                      <label
                        key={course.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(formData?.course_ids ?? [])?.includes(course.id)}
                          onChange={() => toggleCourse(course.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{course.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-gray-500 mt-2">
                  Select courses that will be available to students in this organization.
                  {((formData?.course_ids ?? [])?.length ?? 0) > 0 && (
                    <span className="text-purple-600 ml-1">
                      ({((formData?.course_ids ?? [])?.length ?? 0)} selected)
                    </span>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create Organization
                </button>
              </div>
            </form>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Organization Summary
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-gray-700 mb-2">Organization Details</p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      Admin will receive login credentials via email
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      Students inherit access to allotted courses
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      Organization expires on the set date
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 mb-3">Quick Stats</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Max Students:</span>
                      <span className="text-gray-900">
                        {formData.student_limit || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Courses Allotted:</span>
                      <span className="text-gray-900">
                        {((formData?.course_ids ?? [])?.length ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs ${formData.status === "ACTIVE" ? "bg-green-100" : "bg-red-100"}`}>
                        {formData.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
