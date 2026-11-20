"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { completeChapter, getCourseContent, getCourseProgress, StudentCourseContent, StudentCourseProgress } from "@/src/services/student";
import { SkeletonDashboard } from "@/component/SkeletonLoader";

function safeVideoUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch { return undefined; }
}

export function StudentCourseViewer({ courseId }: { courseId: string }) {
  const [content, setContent] = useState<StudentCourseContent | null>(null);
  const [progress, setProgress] = useState<StudentCourseProgress | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [completionError, setCompletionError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const completionPending = useRef(false);
  const lifecycle = useRef<AbortController | null>(null);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    lifecycle.current = controller;
    async function load() {
      setLoading(true);
      setError("");
      setProgressError("");
      setCompletionError("");
      const [contentResult, progressResult] = await Promise.allSettled([
        getCourseContent(courseId), getCourseProgress(courseId),
      ]);
      if (cancelled || controller.signal.aborted) return;
      if (contentResult.status === "fulfilled") {
        const nextContent = contentResult.value;
        setContent(nextContent);
        const completedIds = progressResult.status === "fulfilled" ? progressResult.value.completed_chapter_ids : [];
        setSelectedId((selected) => nextContent.chapters.some((chapter) => chapter.id === selected) ? selected :
          (nextContent.chapters.find((chapter) => !chapter.is_completed && !completedIds.includes(chapter.id)) ?? nextContent.chapters[0])?.id ?? null);
      } else {
        setContent(null);
        setError("Course content could not be loaded. Please try again.");
      }
      setProgress(progressResult.status === "fulfilled" ? progressResult.value : null);
      if (progressResult.status === "rejected") setProgressError("Course progress could not be loaded. Please retry before marking chapters complete.");
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [courseId, attempt]);

  const chapter = content?.chapters.find((item) => item.id === selectedId);
  const isComplete = (id: string) => Boolean(content?.chapters.find((item) => item.id === id)?.is_completed || progress?.completed_chapter_ids.includes(id));
  const knownCompleted = content?.chapters.filter((item) => isComplete(item.id)).length ?? 0;
  const total = progress?.total_chapters ?? content?.chapters.length ?? 0;
  const done = progress?.completed_chapters ?? knownCompleted;
  const percent = progress?.progress ?? (total ? Math.min(100, done / total * 100) : 0);

  async function markComplete() {
    if (!chapter || saving || completionPending.current || !progress || isComplete(chapter.id)) return;
    completionPending.current = true;
    setSaving(true);
    setCompletionError("");
    const controller = lifecycle.current;
    try {
      await completeChapter(chapter.id);
      if (!controller || controller.signal.aborted) return;
      // Update the chapter only after the write succeeds, then reload server progress.
      setContent((current) => current ? { ...current, chapters: current.chapters.map((item) => item.id === chapter.id ? { ...item, is_completed: true } : item) } : current);
      try {
        const updated = await getCourseProgress(courseId);
        if (!controller.signal.aborted) {
          setProgress(updated);
          setProgressError("");
        }
      } catch {
        if (!controller.signal.aborted) {
          setProgress(null);
          setProgressError("Chapter saved, but progress could not be refreshed. Please retry.");
        }
      }
    } catch {
      if (controller && !controller.signal.aborted) setCompletionError("This chapter could not be marked complete. Please try again.");
    } finally {
      completionPending.current = false;
      if (controller && !controller.signal.aborted) setSaving(false);
    }
  }

  if (loading) return <SkeletonDashboard />;
  const videoUrl = safeVideoUrl(chapter?.video_url);
  return (
    <div className="space-y-6">
      <Link href="/courses" className="inline-flex items-center gap-2 text-purple-600"><ArrowLeft className="w-4 h-4" />Back to courses</Link>
      {error ? (
        <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-6"><p>{error}</p><button onClick={reload} className="mt-3 underline">Retry</button></div>
      ) : content && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900">{content.title}</h1>
            {content.description && <p className="text-gray-600 mt-2">{content.description}</p>}
            {progress && <p className="text-purple-700 mt-4">{done} of {total} chapters completed · {Math.round(percent)}%</p>}
            {progressError && <div role="alert" className="text-amber-800 mt-3"><p>{progressError}</p><button onClick={reload} className="underline" disabled={saving}>Retry progress</button></div>}
          </div>
          {content.chapters.length === 0 ? <p className="text-gray-600">No chapters available yet.</p> : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <nav aria-label="Course chapters" className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                {content.chapters.map((item) => (
                  <button key={item.id} onClick={() => { setSelectedId(item.id); setCompletionError(""); }} disabled={saving} aria-current={item.id === selectedId ? "step" : undefined} className={`w-full text-left flex items-center gap-2 rounded-lg p-3 disabled:opacity-60 ${item.id === selectedId ? "bg-purple-100 text-purple-900" : "text-gray-700 hover:bg-gray-50"}`}>
                    {isComplete(item.id) && <CheckCircle2 aria-label="Completed" className="w-4 h-4 shrink-0 text-green-600" />}{item.title}
                  </button>
                ))}
              </nav>
              {chapter && <article className="lg:col-span-3 bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">{chapter.title}</h2>
                {videoUrl && <video key={videoUrl} src={videoUrl} controls preload="metadata" className="w-full rounded-lg" />}
                {chapter.content ? <div className="text-gray-800 break-words [&_a]:text-purple-600 [&_a]:underline [&_img]:max-w-full [&_h2]:text-xl [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapter.content) }} /> : <p className="text-gray-500">No written content for this chapter.</p>}
                {completionError && <p role="alert" className="text-red-700">{completionError}</p>}
                <button onClick={markComplete} disabled={saving || !progress || isComplete(chapter.id)} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{isComplete(chapter.id) ? "Completed" : saving ? "Saving…" : "Mark Chapter Complete"}
                </button>
              </article>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
