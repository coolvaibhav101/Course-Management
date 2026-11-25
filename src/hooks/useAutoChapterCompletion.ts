"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const COMPLETION_DELAY = 5000;

export function useAutoChapterCompletion(
  targetRef: RefObject<HTMLElement | null>,
  chapterKey: string,
  enabled: boolean,
  onComplete: () => void,
) {
  const completeRef = useRef(onComplete);
  const [countdown, setCountdown] = useState<{ key: string; seconds: number | null }>({ key: "", seconds: null });
  const activeKey = enabled ? chapterKey : "";

  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const target = targetRef.current;
    if (!activeKey || !target || typeof IntersectionObserver === "undefined") return;
    const ownerDocument = target.ownerDocument;
    const root = target.closest("main");
    const header = target.closest("[data-course-layout]")?.querySelector("[data-course-header]");
    let headerHeight = header?.getBoundingClientRect().height ?? 0;
    let viewportHeight = root?.clientHeight ?? ownerDocument.documentElement?.clientHeight ?? 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let deadline = 0;
    let inView = false;
    let fired = false;
    let disposed = false;
    let observerVersion = 0;

    function update(seconds: number | null) {
      setCountdown(current => current.key === activeKey && current.seconds === seconds
        ? current : { key: activeKey, seconds });
    }

    function stop() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      deadline = 0;
      if (!disposed) update(null);
    }

    function start() {
      if (disposed || fired || timer !== undefined || !inView || ownerDocument.visibilityState !== "visible") return;
      deadline = performance.now() + COMPLETION_DELAY;
      update(5);
      timer = setInterval(() => {
        if (disposed || fired) return;
        if (!inView || ownerDocument.visibilityState !== "visible") { stop(); return; }
        const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
        update(seconds);
        if (seconds === 0) {
          fired = true;
          if (timer !== undefined) clearInterval(timer);
          timer = undefined;
          completeRef.current();
        }
      }, 200);
    }

    function onIntersection(entries: IntersectionObserverEntry[]) {
      if (disposed || fired) return;
      for (const entry of entries) {
        if (entry.target !== target) continue;
        inView = entry.isIntersecting && entry.intersectionRatio >= .5;
        if (inView) start(); else stop();
      }
    }
    function observeFooter() {
      const version = ++observerVersion;
      const next = new IntersectionObserver(entries => {
        if (version === observerVersion) onIntersection(entries);
      }, {
        root, rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: [0, .5, 1],
      });
      next.observe(target!);
      return next;
    }
    let observer = observeFooter();
    const onLayoutChange = () => {
      if (disposed || fired) return;
      const nextHeaderHeight = header?.getBoundingClientRect().height ?? 0;
      const nextViewportHeight = root?.clientHeight ?? ownerDocument.documentElement?.clientHeight ?? 0;
      if (nextHeaderHeight === headerHeight && nextViewportHeight === viewportHeight) return;
      headerHeight = nextHeaderHeight;
      viewportHeight = nextViewportHeight;
      stop();
      inView = false;
      observer.disconnect();
      observer = observeFooter();
    };
    const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(onLayoutChange);
    if (header) resizeObserver?.observe(header);
    if (root) resizeObserver?.observe(root);
    ownerDocument.defaultView?.addEventListener("resize", onLayoutChange);

    const onVisibilityChange = () => {
      if (ownerDocument.visibilityState === "visible") start(); else stop();
    };
    ownerDocument.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      resizeObserver?.disconnect();
      ownerDocument.defaultView?.removeEventListener("resize", onLayoutChange);
      ownerDocument.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeKey, targetRef]);

  return enabled && countdown.key === chapterKey ? countdown.seconds : null;
}
