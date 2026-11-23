"use client";

import { useCallback, useEffect, useState } from "react";
import { getEnrolledCourses, getCompletionDetails, EnrolledCourse, StudentCompletionDetails } from "@/src/services/student";

export function useStudentLearning() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [summary, setSummary] = useState<StudentCompletionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [courseResult, summaryResult] = await Promise.allSettled([
        getEnrolledCourses(), getCompletionDetails(),
      ]);
      if (cancelled) return;
      const failures: string[] = [];
      setCourses(courseResult.status === "fulfilled" ? courseResult.value : []);
      setSummary(summaryResult.status === "fulfilled" ? summaryResult.value : null);
      if (courseResult.status === "rejected") failures.push("Your courses could not be loaded.");
      if (summaryResult.status === "rejected") failures.push("Your completion details could not be loaded.");
      setErrors(failures);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [attempt]);

  return { courses, summary, loading, errors, reload };
}
