"use client";

import { useEffect, type RefObject } from "react";

export function syncCourseStickyLayout(header: HTMLElement, sidebar: HTMLElement) {
  const shell = header.closest<HTMLElement>("[data-course-layout]");
  const scrollport = header.closest("main");
  const viewportHeight = scrollport?.clientHeight ?? header.ownerDocument.documentElement.clientHeight;
  const headerHeight = header.getBoundingClientRect().height;
  const sidebarHeight = sidebar.getBoundingClientRect().height;
  shell?.style.setProperty("--course-header-height", `${headerHeight}px`);
  // A long list can scroll with the page before its bottom becomes sticky.
  sidebar.style.setProperty("--course-sidebar-top", `${Math.min(headerHeight + 12, viewportHeight - sidebarHeight - 12)}px`);
}

export function useCourseStickyLayout(
  headerRef: RefObject<HTMLElement | null>,
  sidebarRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const header = headerRef.current, sidebar = sidebarRef.current;
    if (!enabled || !header || !sidebar) return;
    const sync = () => syncCourseStickyLayout(header, sidebar);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(sync);
    observer?.observe(header);
    observer?.observe(sidebar);
    const scrollport = header.closest("main");
    if (scrollport) observer?.observe(scrollport);
    window.addEventListener("resize", sync);
    sync();
    return () => { observer?.disconnect(); window.removeEventListener("resize", sync); };
  }, [headerRef, sidebarRef, enabled]);
}
