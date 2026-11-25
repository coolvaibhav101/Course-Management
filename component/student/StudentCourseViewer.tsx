"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { ArrowLeft, CheckCircle2, Circle, Loader2, PlayCircle, Timer, Video } from "lucide-react";
import { completeChapter, getCourseContent, getCourseProgress, StudentCourseContent, StudentCourseProgress } from "@/src/services/student";
import { SkeletonDashboard } from "@/component/SkeletonLoader";
import { useChapterVideo } from "@/src/hooks/useChapterVideo";
import { useCourseStickyLayout } from "@/src/hooks/useCourseStickyLayout";
import { useAutoChapterCompletion } from "@/src/hooks/useAutoChapterCompletion";
import { useChapterVideoWatch } from "@/src/hooks/useChapterVideoWatch";
import styles from "./StudentCourseViewer.module.css";

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
  const headerRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const completionRef = useRef<HTMLDivElement | null>(null);
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
  const video = useChapterVideo(courseId, chapter?.id, !loading && content?.id === courseId && chapter?.has_video === true);
  const isComplete = (id: string) => Boolean(content?.chapters.find((item) => item.id === id)?.is_completed || progress?.completed_chapter_ids.includes(id));
  const knownCompleted = content?.chapters.filter((item) => isComplete(item.id)).length ?? 0;
  const total = progress?.total_chapters ?? content?.chapters.length ?? 0;
  const done = progress?.completed_chapters ?? knownCompleted;
  const percent = progress?.progress ?? (total ? Math.min(100, done / total * 100) : 0);
  const displayPercent = Math.round(Math.min(100, Math.max(0, percent)));
  const chapterKey = JSON.stringify([courseId, chapter?.id]);
  const videoWatch = useChapterVideoWatch(chapterKey, video.videoUrl, Boolean(chapter && isComplete(chapter.id)), markComplete);
  const videoRequired = Boolean(chapter?.has_video && !isComplete(chapter.id) && !videoWatch.finished);
  useCourseStickyLayout(headerRef, sidebarRef, !loading && Boolean(content?.chapters.length));
  const autoCompletionEnabled = Boolean(chapter && !chapter.has_video && content?.id === courseId && !loading && !saving && progress && !isComplete(chapter.id) && !completionError);
  const remainingSeconds = useAutoChapterCompletion(completionRef, chapterKey, autoCompletionEnabled, markComplete);

  function selectChapter(id: string, focusHeading = false) {
    setSelectedId(id);
    setCompletionError("");
    if (typeof window !== "undefined") window.requestAnimationFrame(() => {
      articleRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      if (focusHeading) headingRef.current?.focus({ preventScroll: true });
    });
  }

  async function markComplete() {
    if (!chapter || saving || completionPending.current || !progress || isComplete(chapter.id)) return;
    if (chapter.has_video && !videoWatch.canComplete()) return;
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
  return (
    <div className={styles.shell} data-course-layout data-course-viewer>
      <div ref={headerRef} data-course-header className={styles.header}>
        <div className={styles.headerInner}>
          <div className="min-w-0">
            <Link href="/courses" className={styles.backLink}>
              <ArrowLeft className="h-4 w-4" />Back to courses
            </Link>
            {content && <h1 title={content.title} className={styles.courseTitle}>{content.title}</h1>}
          </div>
          {progress && content && <div className={styles.progressSummary}>
            <p className={styles.progressLabel}>
              <span>{done} of {total} chapters completed</span>
              <span className={styles.progressPercent}>{displayPercent}%</span>
            </p>
            <div className={styles.progressTrack} role="progressbar" aria-label="Course completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayPercent} aria-valuetext={done + " of " + total + " chapters completed"}>
              <div className={styles.progressFill} style={{ width: displayPercent + "%" }} />
            </div>
          </div>}
        </div>
      </div>
      <div className={styles.workspace}>
        {error ? (
          <div role="alert" className={styles.notice + " " + styles.error}>
            <p>{error}</p><button type="button" onClick={reload} className={styles.retry}>Retry</button>
          </div>
        ) : content && (
          <>
            {content.description && <p className={styles.courseDescription}>{content.description}</p>}
            {progressError && <div role="alert" className={styles.notice + " " + styles.warning}>
              <p>{progressError}</p><button type="button" onClick={reload} className={styles.retry} disabled={saving}>Retry progress</button>
            </div>}
            {content.chapters.length === 0 ? <p className={styles.empty}>No chapters available yet.</p> : (
              <>
                <nav ref={sidebarRef} data-course-sidebar aria-label="Course chapters" className={styles.sidebar}>
                  <h2 className={styles.sidebarHeading}>Chapters <span className="ml-1 font-normal text-slate-500">{content.chapters.length}</span></h2>
                  <div className={styles.chapterList}>
                    {content.chapters.map((item) => (
                      <button key={item.id} type="button" onClick={(event) => selectChapter(item.id, event?.detail === 0)} disabled={saving} aria-current={item.id === selectedId ? "step" : undefined} className={styles.chapterButton}>
                        {isComplete(item.id)
                          ? <CheckCircle2 aria-label="Completed" className={styles.completedStatus + " h-4 w-4"} />
                          : <Circle aria-hidden="true" className={styles.chapterStatus + " h-4 w-4"} />}
                        <span className="min-w-0">
                          <span className={styles.chapterTitle}>{item.title}</span>
                          {item.has_video && <span className={styles.videoLabel}><Video aria-hidden="true" className="h-3 w-3" />Video</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </nav>
                {chapter && <article ref={articleRef} data-course-article aria-labelledby="course-chapter-heading" className={styles.article}>
                  <h2 ref={headingRef} id="course-chapter-heading" tabIndex={-1} className={styles.chapterHeading}>{chapter.title}</h2>
                  {chapter.content ? <div className={styles.prose} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapter.content) }} /> : <p className="text-sm text-slate-500">No written content for this chapter.</p>}
                  {chapter.has_video && <section aria-label="Chapter video" className={styles.videoSection}>
                    <div className={styles.videoHeader}>
                      <h3 className={styles.videoHeading}><PlayCircle aria-hidden="true" className="h-4 w-4" />Chapter video</h3>
                      <span className={styles.watchStatus} data-watched={videoWatch.finished || isComplete(chapter.id)}>
                        {isComplete(chapter.id) ? "Chapter completed" : videoWatch.finished ? "Video watched" : `${videoWatch.percent}% watched`}
                      </span>
                    </div>
                    <p className={styles.videoHelp}>{isComplete(chapter.id) ? "Replay this lesson at any time." : "Watch the full video to complete this chapter. You can replay watched sections."}</p>
                    {video.loading ? <p role="status" className={styles.videoLoading}><Loader2 className="h-4 w-4 animate-spin" />Loading video...</p>
                      : video.error ? <div role="alert" className="text-sm text-red-700"><p>{video.error}</p><button type="button" onClick={video.retry} className={styles.retry}>Retry video</button></div>
                      : video.videoUrl && <video key={chapter.id + ":" + video.videoUrl} src={video.videoUrl} onError={video.onPlaybackError} onLoadedMetadata={videoWatch.onLoadedMetadata} onTimeUpdate={videoWatch.onTimeUpdate} onSeeking={videoWatch.onSeeking} onEnded={videoWatch.onEnded} controls controlsList="nodownload" onContextMenu={(event) => event.preventDefault()} preload="metadata" className={styles.player} />}
                    {video.videoUrl && <div className={styles.watchTrack} role="progressbar" aria-label="Video watched" aria-valuemin={0} aria-valuemax={100} aria-valuenow={isComplete(chapter.id) ? 100 : videoWatch.percent}>
                      <div className={styles.watchFill} style={{ width: `${isComplete(chapter.id) ? 100 : videoWatch.percent}%` }} />
                    </div>}
                  </section>}
                  <div ref={completionRef} data-course-completion className={styles.completionFooter}>
                    {autoCompletionEnabled && <p role="status" data-auto-completion className={styles.countdown}>
                      <Timer aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span>{remainingSeconds === null ? "Stay here for 5 seconds to complete this chapter automatically." : `Completing automatically in ${remainingSeconds}s`}</span>
                    </p>}
                    {completionError && <p role="alert" className="text-sm text-red-700">{completionError}</p>}
                    {videoRequired && <p className={styles.completionHint}>This chapter completes automatically after you finish watching the video.</p>}
                    <button type="button" onClick={markComplete} disabled={saving || !progress || isComplete(chapter.id) || videoRequired} data-completed={isComplete(chapter.id)} className={styles.completeButton}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{isComplete(chapter.id) ? "Completed" : saving ? "Saving..." : "Mark Chapter Complete"}
                    </button>
                  </div>
                </article>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
