"use client";

import { useCallback, useEffect, useState } from "react";
import { getChapterVideoUrl } from "@/src/services/student";

export function useChapterVideo(courseId: string, chapterId?: string, hasVideo = false) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: "", url: "", error: "" });
  const active = Boolean(courseId && chapterId && hasVideo);
  const key = active ? JSON.stringify([courseId, chapterId, attempt]) : "";
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  // Reset before paint so a previous chapter's video can never flash on selection.
  if (result.key !== key) setResult({ key, url: "", error: "" });

  useEffect(() => {
    if (!active || !chapterId) return;
    const controller = new AbortController();
    async function load() {
      try {
        const url = await getChapterVideoUrl(courseId, chapterId!, controller.signal);
        if (!controller.signal.aborted) setResult({ key, url, error: "" });
      } catch {
        if (!controller.signal.aborted) setResult({ key, url: "", error: "Video could not be loaded. Please try again." });
      }
    }
    void load();
    return () => controller.abort();
  }, [active, chapterId, courseId, key]);

  const onPlaybackError = useCallback(() => {
    setResult(current => current.key === key
      ? { ...current, url: "", error: "Video could not be played. Please try loading it again." }
      : current);
  }, [key]);

  return {
    videoUrl: active && result.key === key ? result.url || undefined : undefined,
    loading: active && (result.key !== key || (!result.url && !result.error)),
    error: active && result.key === key ? result.error : "",
    retry,
    onPlaybackError,
  };
}
