"use client";

import { useRef, useState } from 'react';
import { ChevronRight, Building2, Calendar, BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import api, { ApiError } from '@/src/utils/connection';
import { toast } from 'sonner';
import { assignCoursesToOrganization, Course } from '@/src/services/courses';
import { OrganizationFormData, organizationPayload } from '@/src/services/organizationData';

interface CreateOrganizationProps {
  onSave: () => void;
  onCancel: () => void;
  courseData: Course[];
  formData: OrganizationFormData;
  setFormData: (formData: OrganizationFormData) => void;
  isEdit: Record<string, unknown>;
  onCoursesAssigned?: () => Promise<void>;
}


export function CreateOrganization({ onSave, onCancel, courseData, formData, setFormData, isEdit, onCoursesAssigned }: CreateOrganizationProps) {
  const data = formData;
  const isNew = Boolean(isEdit.isNew);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>(data.course_ids ?? []);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentNotice, setAssignmentNotice] = useState('');
  const assignmentPending = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submissionPending = useRef(false);
  const isBusy = isSubmitting || isAssigning;

  const updateAdmin = (field: keyof OrganizationFormData['org_admin'], value: string) => {
    setFormData({ ...formData, org_admin: { ...data.org_admin, [field]: value } });
  };

  const generatePassword = () => {
    const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%'];
    const randomIndex = (length: number) => {
      const values = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / length) * length;
      do { crypto.getRandomValues(values); } while (values[0] >= limit);
      return values[0] % length;
    };
    const chars = groups.map((group) => group[randomIndex(group.length)]);
    const alphabet = groups.join('');
    while (chars.length < 12) chars.push(alphabet[randomIndex(alphabet.length)]);
    for (let index = chars.length - 1; index > 0; index--) {
      const swap = randomIndex(index + 1);
      [chars[index], chars[swap]] = [chars[swap], chars[index]];
    }
    updateAdmin('temp_password', chars.join(''));
    setShowPassword(true);
  };

  const toggleCourse = (courseId: string) => {
    if (!isNew) {
      if (assignedCourseIds.includes(courseId)) return;
      setAssignmentError('');
      setSelectedCourseIds((current) => current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]);
      return;
    }
    setFormData({
      ...formData,
      course_ids: ((data.course_ids ?? [])?.includes(courseId))
        ? ((data.course_ids ?? [])?.filter(id => id !== courseId))
        : [...((data.course_ids ?? []) ?? []), courseId],
    });
  };

  const handleAssignCourses = async () => {
    if (assignmentPending.current || submissionPending.current || !selectedCourseIds.length) return;
    if (!data.id) { setAssignmentError('Organization ID is missing.'); return; }
    assignmentPending.current = true;
    setIsAssigning(true);
    setAssignmentError('');
    setAssignmentNotice('');
    try {
      const result = await assignCoursesToOrganization(selectedCourseIds, data.id);
      setAssignedCourseIds((current) => [...new Set([...current, ...result.assigned])]);
      setSelectedCourseIds(result.failed);
      if (result.assigned.length) await onCoursesAssigned?.();
      if (result.failed.length) {
        const failedNames = result.failed.map((id) => courseData.find((course) => course.id === id)?.title || id);
        setAssignmentError(`Could not assign: ${failedNames.join(', ')}. Retry the selected courses.`);
        if (result.assigned.length) setAssignmentNotice(`${result.assigned.length} ${result.assigned.length === 1 ? 'course assigned' : 'courses assigned'} successfully.`);
      } else {
        setAssignmentNotice('Courses assigned successfully.');
        toast.success('Courses assigned successfully');
      }
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : 'Could not assign courses. Please try again.');
    } finally {
      assignmentPending.current = false;
      setIsAssigning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionPending.current || assignmentPending.current) return;
    setError('');
    if (!data.name?.trim() || !data.org_admin?.name?.trim() || !data.org_admin?.email?.trim() ||
        !data.org_admin?.phone?.trim() || !data.expiry_date ||
        !Number.isInteger(data.student_limit) || data.student_limit < 1 ||
        (isNew && !data.org_admin?.temp_password?.trim())) {
      setError('Please fill in the required fields and enter a valid student limit.');
      return;
    }
    const payload = organizationPayload(data, isNew);
    try {
      submissionPending.current = true;
      setIsSubmitting(true);
      if (isNew) {
        await api.post('/organizations/', payload);
      } else {
        if (!data.id) throw new Error('Organization ID is missing.');
        // Update details only; course assignment has its own POST endpoint.
        await api.patch(`/organizations/${encodeURIComponent(data.id)}/`, payload);
      }
      toast.success(isNew ? 'Organization created successfully' : 'Organization updated successfully');
      onSave();
    } catch (err) {
      const details = err instanceof ApiError ? err.data as { message?: string; detail?: string } : undefined;
      setError(details?.message || details?.detail || (err instanceof Error ? err.message : 'Failed to save organization. Please try again.'));
    } finally {
      submissionPending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onCancel}
              type="button"
              disabled={isBusy}
              aria-label="Back to organizations"
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="hover:text-purple-600 cursor-pointer">Organizations</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900">{isNew ? 'Create Organization' : 'Edit Organization'}</span>
            </div>
          </div>
          <h1 className="text-gray-900 ml-8">{isNew ? 'Create New Organization' : 'Edit Organization'}</h1>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
              {error && <p role="alert" className="bg-red-50 text-red-700 rounded-lg p-4">{error}</p>}
              <fieldset disabled={isBusy} className="space-y-6 disabled:opacity-70 text-gray-900">
              {/* Organization Name */}
              <div>
                <label htmlFor="organization-name" className="block text-gray-700 mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="organization-name"
                  required
                  value={data.name ?? ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Tech Academy"
                />
              </div>

              <div>
                <label htmlFor="org-admin-name" className="block text-gray-700 mb-2">
                  Organization Admin Name <span className="text-red-500">*</span>
                </label>
                <input id="org-admin-name" type="text" required autoComplete="name"
                  value={data.org_admin?.name ?? ''} onChange={(e) => updateAdmin('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., John Smith" />
              </div>

              {/* Organization Admin Email */}
              <div>
                <label htmlFor="org-admin-email" className="block text-gray-700 mb-2">
                  Organization Admin Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="org-admin-email"
                  autoComplete="email"
                  required
                  value={data.org_admin?.email ?? ''}
                  onChange={(e) => updateAdmin('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="admin@organization.edu"
                />
                <p className="text-gray-500 mt-1">
                  This person will have admin access to manage students and view reports for this organization.
                </p>
              </div>

              <div>
                <label htmlFor="org-admin-phone" className="block text-gray-700 mb-2">
                  Organization Admin Phone <span className="text-red-500">*</span>
                </label>
                <input id="org-admin-phone" type="tel" required autoComplete="tel"
                  value={data.org_admin?.phone ?? ''} onChange={(e) => updateAdmin('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., +91 9876543210" />
              </div>

              <div>
                <label htmlFor="org-admin-password" className="block text-gray-700 mb-2">
                  Admin Temporary Password {isNew && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input id="org-admin-password" type={showPassword ? 'text' : 'password'} required={isNew} autoComplete="new-password"
                    value={data.org_admin?.temp_password ?? ''} onChange={(e) => updateAdmin('temp_password', e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={isNew ? 'Enter a temporary password' : 'Leave blank to keep the current password'} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button type="button" onClick={generatePassword} className="text-purple-600 hover:text-purple-800 mt-2">Generate password</button>
                <p className="text-gray-500 mt-1">{isNew ? 'The organization admin will use this password to sign in.' : 'Enter a new password only if you want to change the admin password.'}</p>
              </div>

              {/* Organization Description */}
              <div>
                <label htmlFor="organization-description" className="block text-gray-700 mb-2">
                  Organization Description
                </label>
                <textarea
                  id="organization-description"
                  value={data.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Brief description of the organization..."
                />
              </div>

              {/* Number of Students */}
              <div>
                <label htmlFor="organization-student-limit" className="block text-gray-700 mb-2">
                  Number of Students <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="organization-student-limit"
                  required
                  min="1"
                  value={data.student_limit ?? ''}
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
                <label htmlFor="organization-expiry" className="block text-gray-700 mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="organization-expiry"
                    required
                    value={data.expiry_date ?? ''}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-gray-500 mt-1">
                  Organization access will expire on this date. Can be extended later.
                </p>
              </div>

              <div>
                <label htmlFor="organization-status" className="block text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select id="organization-status" required value={data.status || 'ACTIVE'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  {data.status && !['ACTIVE', 'INACTIVE'].includes(data.status) && <option value={data.status}>{data.status}</option>}
                </select>
              </div>

              {/* Allot Courses */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Allot Courses from Course List
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                  <div className="space-y-2">
                    {courseData.length === 0 && <p className="text-gray-500">No courses available to allot yet.</p>}
                    {courseData.map((course) => (
                      <label
                        key={course.id}
                        className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 transition-colors ${!isNew && assignedCourseIds.includes(course.id) ? 'opacity-60' : 'hover:border-purple-300 cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isNew && assignedCourseIds.includes(course.id)}
                          checked={isNew ? (data.course_ids ?? []).includes(course.id) : assignedCourseIds.includes(course.id) || selectedCourseIds.includes(course.id)}
                          onChange={() => toggleCourse(course.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{course.title}</span>
                        {!isNew && assignedCourseIds.includes(course.id) && <span className="ml-auto text-gray-500 text-xs">Assigned</span>}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-gray-500 mt-2">
                  {isNew ? 'Select courses that will be available to students in this organization.' : 'Select courses to add to this organization. Existing courses stay assigned.'}
                  {(isNew ? data.course_ids?.length : selectedCourseIds.length) > 0 && (
                    <span className="text-purple-600 ml-1">
                      ({isNew ? data.course_ids?.length : selectedCourseIds.length} selected)
                    </span>
                  )}
                </p>
                {!isNew && <div className="mt-3 space-y-2">
                  {assignmentError && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg">{assignmentError}</p>}
                  {assignmentNotice && <p role="status" className="text-green-700">{assignmentNotice}</p>}
                  <button type="button" onClick={() => void handleAssignCourses()} disabled={isBusy || selectedCourseIds.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isAssigning && <Loader2 className="w-4 h-4 animate-spin" />}{isAssigning ? 'Assigning…' : 'Assign Selected Courses'}
                  </button>
                  <p className="text-gray-500 text-sm">Assign courses here; Save Changes updates organization details.</p>
                </div>}
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
                  className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Saving…' : isNew ? 'Create Organization' : 'Save Changes'}
                </button>
              </div>
              </fieldset>
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
                      Admin signs in with the email and temporary password
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
                        {data.student_limit || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Courses Allotted:</span>
                      <span className="text-gray-900">
                        {isNew ? (data.course_ids?.length ?? 0) : (data.course_count ?? '—')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${(data.status || 'ACTIVE') === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {data.status || 'ACTIVE'}
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
