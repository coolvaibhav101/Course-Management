"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

type WatchProgress = { duration: number; watchedUntil: number; finished: boolean };
const EMPTY: WatchProgress = { duration: 0, watchedUntil: 0, finished: false };

export function useChapterVideoWatch(
  chapterKey: string,
  source: string | undefined,
  alreadyComplete: boolean,
  onFinish: () => void,
) {
  const recordsRef = useRef<Record<string, WatchProgress>>({});
  const [records, setRecords] = useState<Record<string, WatchProgress>>({});
  const activeRef = useRef({ chapterKey, source });
  const finishRef = useRef(onFinish);

  useEffect(() => {
    activeRef.current = { chapterKey, source };
    return () => { activeRef.current = { chapterKey: "", source: undefined }; };
  }, [chapterKey, source]);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  const isActive = () => Boolean(source && activeRef.current.chapterKey === chapterKey && activeRef.current.source === source);
  const save = (next: WatchProgress) => {
    const previous = recordsRef.current[chapterKey] ?? EMPTY;
    if (previous.duration === next.duration && previous.watchedUntil === next.watchedUntil && previous.finished === next.finished) return;
    recordsRef.current[chapterKey] = next;
    setRecords(current => ({ ...current, [chapterKey]: next }));
  };

  function readPlayed(media: HTMLVideoElement): WatchProgress | undefined {
    if (!isActive() || !Number.isFinite(media.duration) || media.duration <= 0) return;
    const saved = recordsRef.current[chapterKey] ?? EMPTY;
    const previous = saved.duration === media.duration ? saved : EMPTY;
    let watchedUntil = previous.watchedUntil;
    const tolerance = Math.min(.05, media.duration * .005);
    // Native played ranges exclude skipped portions of the video.
    const played = media.played;
    for (let index = 0; index < played.length; index++) {
      if (played.start(index) > watchedUntil + tolerance) break;
      watchedUntil = Math.max(watchedUntil, played.end(index));
    }
    return { duration: media.duration, watchedUntil: Math.min(media.duration, watchedUntil), finished: previous.finished };
  }

  const onTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const next = readPlayed(event.currentTarget);
    if (next) save(next);
  };
  const onLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const media = event.currentTarget;
    const next = readPlayed(media);
    if (!next) return;
    save(next);
    if (!alreadyComplete && !next.finished && next.watchedUntil > 0) media.currentTime = next.watchedUntil;
  };
  const onSeeking = (event: SyntheticEvent<HTMLVideoElement>) => {
    const media = event.currentTarget;
    const next = readPlayed(media);
    if (!next) return;
    save(next);
    if (!alreadyComplete && !next.finished && media.currentTime > next.watchedUntil + Math.min(.05, next.duration * .005)) {
      media.currentTime = next.watchedUntil;
    }
  };
  const onEnded = (event: SyntheticEvent<HTMLVideoElement>) => {
    const media = event.currentTarget;
    const next = readPlayed(media);
    if (!next || !media.ended) return;
    const finished = next.watchedUntil >= next.duration - Math.min(.05, next.duration * .005);
    save({ ...next, finished: next.finished || finished });
    if (finished && !next.finished && !alreadyComplete) finishRef.current();
  };

  const progress = records[chapterKey] ?? EMPTY;
  const percent = progress.finished ? 100 : progress.duration ? Math.min(99, Math.floor(progress.watchedUntil / progress.duration * 100)) : 0;
  return {
    ...progress, percent, onTimeUpdate, onLoadedMetadata, onSeeking, onEnded,
    canComplete: () => activeRef.current.chapterKey === chapterKey && Boolean(recordsRef.current[chapterKey]?.finished),
  };
}
