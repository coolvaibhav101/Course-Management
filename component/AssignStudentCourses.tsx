"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/src/utils/connection";
import { assignCoursesToStudent, getAssignableCourses, Student } from "@/src/services/students";
import type { Course } from "@/src/services/courses";

interface AssignStudentCoursesProps {
  student: Student;
  organizationId?: string;
  onAssigned: () => void;
  onClose: () => void;
}

export function AssignStudentCourses({ student, organizationId, onAssigned, onClose }: AssignStudentCoursesProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitPending = useRef(false);
  const mounted = useRef(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const assignedIds = Array.isArray(student.course_ids) ? student.course_ids : [];
  const scopedOrganizationId = organizationId || student.organization_id;

  useEffect(() => {
    mounted.current = true;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      mounted.current = false;
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const data = await getAssignableCourses(scopedOrganizationId);
        if (!cancelled) setCourses(data);
      } catch {
        if (!cancelled) setLoadError("Courses could not be loaded. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [scopedOrganizationId, attempt]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitPending.current || loading || loadError || selectedIds.length === 0) return;
    submitPending.current = true;
    setSaving(true);
    setSaveError("");
    try {
      // Include known assignments so an API that replaces the list preserves them.
      await assignCoursesToStudent(student.id, [...assignedIds, ...selectedIds]);
      if (mounted.current) {
        toast.success(`Courses assigned to ${student.name}`);
        onAssigned();
      }
    } catch (err) {
      const details = err instanceof ApiError ? err.data as { message?: string; detail?: string } : undefined;
      if (mounted.current) setSaveError(details?.message || details?.detail || (err instanceof Error ? err.message : "Courses could not be assigned. Please try again."));
    } finally {
      submitPending.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const visibleCourses = courses.filter((course) => course.title.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <dialog ref={dialog} aria-labelledby="assign-courses-title" aria-describedby="assign-courses-student"
      onCancel={(event) => { event.preventDefault(); if (!submitPending.current) onClose(); }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/40">
      <form onSubmit={submit}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">
          <div>
            <h2 id="assign-courses-title" className="text-xl font-semibold">Assign Courses</h2>
            <p id="assign-courses-student" className="mt-1 text-sm text-gray-600">{student.name} · {student.email}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close course picker" className="text-gray-500 hover:text-gray-900 disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          {loading ? <p role="status" className="flex items-center gap-2 text-gray-600"><Loader2 className="w-4 h-4 animate-spin" />Loading courses…</p> : loadError ? (
            <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700"><p>{loadError}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 underline">Retry</button></div>
          ) : courses.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-gray-600">No courses are available for this organization. Ask your platform administrator to allot courses first.</p>
          ) : (
            <fieldset disabled={saving} className="space-y-4">
              <label htmlFor="assign-course-search" className="sr-only">Search courses</label>
              <input id="assign-course-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses…" className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500" />
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {visibleCourses.length === 0 && <p className="text-gray-500">No courses match your search.</p>}
                {visibleCourses.map((course) => {
                  const assigned = assignedIds.includes(course.id);
                  return <label key={course.id} className={`flex items-center gap-3 rounded-lg border p-3 ${assigned ? "border-gray-200 bg-gray-50" : "border-gray-200 cursor-pointer hover:border-purple-300"}`}>
                    <input type="checkbox" disabled={assigned} checked={assigned || selectedIds.includes(course.id)}
                      onChange={() => { setSaveError(""); setSelectedIds((current) => current.includes(course.id) ? current.filter((id) => id !== course.id) : [...current, course.id]); }} className="w-4 h-4 accent-purple-600" />
                    <BookOpen className="w-4 h-4 shrink-0 text-purple-500" /><span className="flex-1">{course.title}</span>
                    {assigned && <span className="text-xs text-gray-500">Assigned</span>}
                  </label>;
                })}
              </div>
              <p className="text-sm text-gray-600">{selectedIds.length} {selectedIds.length === 1 ? "course" : "courses"} selected</p>
            </fieldset>
          )}
          {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{saveError}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={loading || saving || Boolean(loadError) || selectedIds.length === 0} className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? "Assigning…" : "Assign Courses"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
