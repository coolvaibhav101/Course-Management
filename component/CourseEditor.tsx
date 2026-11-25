"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Save,
  Plus,
  ChevronRight,
  Video,
  Upload,
  FileText,
  Trash2,
  Loader2,
  AlertTriangle,
  GripVertical,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import RichTextInput from "./RichText/RichTextInput";
import api from "@/src/utils/connection";
import { parseCourseContent } from "@/src/services/studentData";
import { moveChapter, saveChapterOrder, ChapterOrderSaveError, type OrderedChapter } from "@/src/services/chapterOrder";
import { useChapterVideo } from "@/src/hooks/useChapterVideo";
import { buildChapterSavePayload } from "@/src/services/chapterVideoPayload";
import { useCourseStickyLayout } from "@/src/hooks/useCourseStickyLayout";
import styles from "./CourseEditor.module.css";

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  videoFile?: File | null;
  hasVideo: boolean;
  removeVideo?: boolean;
}

interface CourseEditorProps {
  onSave: () => void;
  onCancel: () => void;
  formData: Record<string, unknown>;
  setFormData: (formData: Record<string, unknown>) => void;
  isEdit: Record<string, unknown>;
  setIsEdit: (isEdit: Record<string, unknown>) => void;
}

export function CourseEditor({
  onSave,
  onCancel,
  formData,
  setFormData,
  isEdit,
  setIsEdit,
}: CourseEditorProps) {
  const courseId = formData?.id as string | undefined;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [courseTitle, setCourseTitle] = useState(
    (formData?.title as string) || "",
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [loadedCourseId, setLoadedCourseId] = useState("");
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);
  const [orderError, setOrderError] = useState("");
  const [orderRecoveryNeeded, setOrderRecoveryNeeded] = useState(false);
  const [chapterAction, setChapterAction] = useState<{ type: "rename" | "delete"; id: string; title: string; isDraft: boolean } | null>(null);
  const [chapterName, setChapterName] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [courseAction, setCourseAction] = useState<"edit" | "delete" | null>(null);
  const [courseDescription, setCourseDescription] = useState("");
  const [courseActionError, setCourseActionError] = useState("");
  const [isSavingCourseAction, setIsSavingCourseAction] = useState(false);
  const courseActionPendingRef = useRef(false);
  const courseActionOpenRef = useRef(false);
  const courseActionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const actionPendingRef = useRef(false);
  const actionOpenRef = useRef(false);
  const addChapterRef = useRef<HTMLButtonElement | null>(null);
  const chapterActionTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const reloadOrderRef = useRef<HTMLButtonElement | null>(null);
  const orderSavePending = useRef(false);
  const draggedChapterRef = useRef<string | null>(null);
  const reorderFocusRef = useRef<HTMLElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const editorHeaderRef = useRef<HTMLDivElement | null>(null);
  const chapterSidebarRef = useRef<HTMLElement | null>(null);
  const editorPanelRef = useRef<HTMLDivElement | null>(null);
  const chapterLoadRef = useRef<{ courseId: string; request: ReturnType<typeof api.get> } | null>(null);
  const editorBusy = isSavingChapter || isReordering || isSavingAction || isSavingCourseAction || orderRecoveryNeeded;

  useEffect(() => {
    if (!isReordering && reorderFocusRef.current) {
      if (reorderFocusRef.current.isConnected) reorderFocusRef.current.focus({ preventScroll: true });
      reorderFocusRef.current = null;
    }
  }, [isReordering]);

  // Track saved state per chapter to detect unsaved changes
  const savedSnapshotsRef = useRef<Record<string, string>>({});

  // Debug: log mount/unmount cycles
  useEffect(() => {
    console.log("[CourseEditor] MOUNTED");
    return () => console.log("[CourseEditor] UNMOUNTED");
  }, []);

  const getChapterSnapshot = (ch: Pick<Chapter, "title" | "content" | "order">) =>
    JSON.stringify({ title: ch.title, content: ch.content, order: ch.order });

  const hasUnsavedChanges = useCallback(() => {
    if (!selectedChapterId) return false;
    const current = chapters.find((ch) => ch.id === selectedChapterId);
    if (!current) return false;
    if (current.videoFile || current.removeVideo) return true;
    const saved = savedSnapshotsRef.current[selectedChapterId];
    // If no saved snapshot, it's a new unsaved chapter
    if (!saved) return true;
    return getChapterSnapshot(current) !== saved;
  }, [selectedChapterId, chapters]);

  const selectedChapter = chapters.find((ch) => ch.id === selectedChapterId);
  const video = useChapterVideo(courseId ?? "", selectedChapter?.id, Boolean(
    selectedChapter?.hasVideo && !selectedChapter.videoFile && !selectedChapter.removeVideo && loadedCourseId === courseId && savedSnapshotsRef.current[selectedChapter.id],
  ));

  // Fetch existing chapters when editing a course
  const isNewCourse = Boolean(isEdit?.isNew);
  useCourseStickyLayout(editorHeaderRef, chapterSidebarRef, !isNewCourse);

  const showChapterEditor = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => editorPanelRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  };

  useEffect(() => {
    if (!courseId || isNewCourse) return;
    let cancelled = false;

    const fetchChapters = async () => {
      let pending = chapterLoadRef.current;
      try {
        setIsLoadingChapters(true);
        // Reuse the pending request when Strict Mode replays this mount effect.
        if (!pending || pending.courseId !== courseId) {
          pending = {
            courseId,
            request: api.get(`/courses/${encodeURIComponent(courseId)}/`, { skipAuthRefresh: true }),
          };
          chapterLoadRef.current = pending;
        }
        const response = await pending.request;
        if (cancelled) return;
        const data = parseCourseContent(response?.data, courseId).chapters;
        const fetched: Chapter[] = data.map((ch) => ({
          id: String(ch.id),
          title: String(ch.title || ""),
          content: String(ch.content || ""),
          order: Number(ch.order ?? 1),
          videoFile: null,
          hasVideo: ch.has_video,
          removeVideo: false,
        }));
        setChapters(fetched);
        setLoadedCourseId(courseId);
        // Save snapshots for all fetched chapters (they are "saved" state)
        const snapshots: Record<string, string> = {};
        fetched.forEach((ch) => {
          snapshots[ch.id] = getChapterSnapshot(ch);
        });
        savedSnapshotsRef.current = snapshots;
        setSelectedChapterId(fetched[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) console.error("Failed to fetch chapters:", error);
      } finally {
        if (chapterLoadRef.current === pending) chapterLoadRef.current = null;
        if (!cancelled) setIsLoadingChapters(false);
      }
    };

    void fetchChapters();
    return () => { cancelled = true; };
  }, [courseId, isNewCourse]);

  // Check if a chapter is new (never saved to server)
  const isNewUnsavedChapter = (id: string) => !savedSnapshotsRef.current[id];

  // Create and select a new chapter
  const createNewChapter = () => {
    const newId = Date.now().toString();
    setChapters((current) => [...current, {
      id: newId,
      title: `Chapter ${current.length + 1}`,
      content: "",
      order: Math.max(0, ...current.map(chapter => chapter.order)) + 1,
      videoFile: null,
      hasVideo: false,
      removeVideo: false,
    }]);
    setSelectedChapterId(newId);
    showChapterEditor();
  };

  // Handle chapter switch with unsaved changes warning
  const handleChapterSwitch = (chapterId: string) => {
    if (editorBusy || chapterAction || courseAction) return;
    if (chapterId === selectedChapterId) { showChapterEditor(); return; }
    if (hasUnsavedChanges()) {
      setPendingChapterId(chapterId);
      return;
    }
    setSelectedChapterId(chapterId);
    showChapterEditor();
  };

  // Handle Add Chapter with unsaved changes check
  const addChapter = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (editorBusy || chapterAction || courseAction) return;
    if (hasUnsavedChanges()) {
      setPendingChapterId("__new__");
      return;
    }
    createNewChapter();
  };

  const confirmSwitch = async () => {
    if (!pendingChapterId || !selectedChapterId || editorBusy || orderSavePending.current) return;

    if (isNewUnsavedChapter(selectedChapterId)) {
      if (!await deleteChapter(selectedChapterId, { allowEmpty: true, notify: false })) {
        setPendingChapterId(null);
        return;
      }
    } else {
      // Existing saved chapter — revert to saved snapshot
      const snapshot = savedSnapshotsRef.current[selectedChapterId];
      if (snapshot) {
        const saved = JSON.parse(snapshot);
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === selectedChapterId ? { ...ch, ...saved, videoFile: null, removeVideo: false } : ch,
          ),
        );
      }
    }

    if (pendingChapterId === "__cancel__") {
      setPendingChapterId(null);
      onCancel();
    } else if (pendingChapterId === "__new__") {
      setPendingChapterId(null);
      createNewChapter();
    } else {
      setSelectedChapterId(pendingChapterId);
      setPendingChapterId(null);
      showChapterEditor();
    }
  };

  const cancelSwitch = () => {
    if (orderSavePending.current) return;
    setPendingChapterId(null);
  };

  // Handle cancel/back with unsaved changes check
  const handleCancel = () => {
    if (editorBusy || chapterAction || courseAction) return;
    if (hasUnsavedChanges()) {
      setPendingChapterId("__cancel__");
      return;
    }
    onCancel();
  };

  // ─── Step 1: Create Course ────────────────────────────────────────────────
  const handleCreateCourse = async () => {
    const newTitle = courseTitle.trim();
    if (!newTitle) {
      toast.error("Please fill in the Course Title!");
      return;
    }
    try {
      setIsCreating(true);
      const coursesResponse = await api.post("/courses/", {
        title: newTitle,
      });
      console.log("coursesResponse?.data", coursesResponse?.data);
      toast.success("Course created! Now add chapters.");
      // Transition to edit mode with the new course ID
      const newCourse = coursesResponse?.data as Record<string, unknown>;
      setFormData(newCourse);
      setIsEdit({ status: true, isNew: false, formData: newCourse });
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const requestCourseAction = (type: "edit" | "delete") => {
    if (!courseId || editorBusy || isLoadingChapters || pendingChapterId || chapterAction || courseAction || orderSavePending.current || courseActionPendingRef.current) return;
    courseActionOpenRef.current = true;
    setCourseTitle((formData.title as string) || "");
    setCourseDescription((formData.description as string) || "");
    setCourseActionError("");
    setCourseAction(type);
  };

  const closeCourseAction = () => {
    if (courseActionPendingRef.current) return;
    courseActionOpenRef.current = false;
    setCourseAction(null);
    setCourseActionError("");
  };

  const confirmCourseAction = async () => {
    if (!courseAction || !courseId || editorBusy || orderSavePending.current || courseActionPendingRef.current) return;
    const title = courseTitle.trim();
    if (courseAction === "edit" && !title) {
      setCourseActionError("Enter a course title.");
      return;
    }
    courseActionPendingRef.current = true;
    setIsSavingCourseAction(true);
    setCourseActionError("");
    let completed = false;
    try {
      const endpoint = `/courses/${encodeURIComponent(courseId)}/`;
      if (courseAction === "edit") {
        const current = { title, description: courseDescription.trim() };
        const original = { title: ((formData.title as string) || "").trim(), description: ((formData.description as string) || "").trim() };
        const details = Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== original[key as keyof typeof original]));
        if (Object.keys(details).length) {
          await api.put(endpoint, details);
          setFormData({ ...formData, ...details });
          toast.success("Course updated");
        } else {
          toast.info("No changes to save");
        }
        setCourseTitle(title);
      } else {
        await api.delete(endpoint);
        toast.success("Course removed");
      }
      completed = true;
    } catch {
      setCourseActionError(courseAction === "edit"
        ? "Course details could not be saved. Please try again."
        : "Course could not be removed. Please try again.");
    } finally {
      courseActionPendingRef.current = false;
      setIsSavingCourseAction(false);
    }
    if (completed) {
      closeCourseAction();
      if (courseAction === "delete") onSave();
    }
  };

  // ─── Step 2: Chapter Management ──────────────────────────────────────────

  const updateChapter = (id: string, patch: Partial<Chapter>) => {
    if (editorBusy || chapterAction || courseAction) return;
    setChapters(
      chapters.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)),
    );
  };

  const deleteChapter = async (id: string, { allowEmpty = false, notify = true } = {}) => {
    if (!courseId || editorBusy || orderSavePending.current) return false;
    if (chapters.length === 1 && !allowEmpty) {
      toast.error("Cannot delete the last chapter");
      return false;
    }
    const remaining = chapters.filter(chapter => chapter.id !== id);
    const next = remaining.map((chapter, index) => ({ ...chapter, order: index + 1 }));
    const persisted: OrderedChapter[] = remaining
      .filter(chapter => savedSnapshotsRef.current[chapter.id])
      .map(chapter => ({ id: chapter.id, ...JSON.parse(savedSnapshotsRef.current[chapter.id]) }));
    let removed = false;
    let completed = false;
    orderSavePending.current = true;
    setIsReordering(true);
    setOrderError("");
    try {
      if (savedSnapshotsRef.current[id]) {
        await api.delete(`/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(id)}/`);
      }
      removed = true;
      delete savedSnapshotsRef.current[id];
      setChapters(next);
      if (selectedChapterId === id) setSelectedChapterId(next[0]?.id ?? null);
      await saveChapterOrder(courseId, persisted, next);
      for (const chapter of next) {
        const snapshot = savedSnapshotsRef.current[chapter.id];
        if (snapshot) savedSnapshotsRef.current[chapter.id] = JSON.stringify({ ...JSON.parse(snapshot), order: chapter.order });
      }
      if (notify) toast.success("Chapter deleted");
      completed = true;
    } catch (error) {
      if (removed) setChapters(remaining);
      setOrderError(removed && error instanceof Error ? error.message : "Chapter could not be deleted. Reload the current order before continuing.");
      setOrderRecoveryNeeded(!(removed && error instanceof ChapterOrderSaveError && error.restored));
    } finally {
      orderSavePending.current = false;
      setIsReordering(false);
    }
    return completed;
  };

  const reorderChapters = async (movedId: string, targetId: string, position: "before" | "after") => {
    if (!courseId || editorBusy || isLoadingChapters || pendingChapterId || chapterAction || courseAction || orderSavePending.current) return;
    const next = moveChapter(chapters, movedId, targetId, position);
    if (next === chapters) return;
    const previous = chapters;
    const persisted: OrderedChapter[] = previous
      .filter(chapter => savedSnapshotsRef.current[chapter.id])
      .map(chapter => ({ id: chapter.id, ...JSON.parse(savedSnapshotsRef.current[chapter.id]) }));
    orderSavePending.current = true;
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) reorderFocusRef.current = document.activeElement;
    setIsReordering(true);
    setOrderError("");
    setChapters(next);
    try {
      const changed = await saveChapterOrder(courseId, persisted, next);
      for (const chapter of next) {
        const snapshot = savedSnapshotsRef.current[chapter.id];
        if (snapshot) savedSnapshotsRef.current[chapter.id] = JSON.stringify({ ...JSON.parse(snapshot), order: chapter.order });
      }
      toast.success(changed ? "Chapter order saved" : "Chapter order updated");
    } catch (error) {
      setChapters(previous);
      setOrderError(error instanceof Error ? error.message : "Chapter order could not be saved.");
      setOrderRecoveryNeeded(!(error instanceof ChapterOrderSaveError && error.restored));
    } finally {
      orderSavePending.current = false;
      setIsReordering(false);
    }
  };

  const reloadChapterOrder = async () => {
    if (!courseId || orderSavePending.current) return;
    orderSavePending.current = true;
    setIsReordering(true);
    try {
      const response = await api.get(`/courses/${encodeURIComponent(courseId)}/`, { cache: "no-store" });
      const serverChapters = parseCourseContent(response.data, courseId).chapters;
      const local = new Map(chapters.map(chapter => [chapter.id, chapter]));
      const reloaded: Chapter[] = serverChapters.map(chapter => ({
        ...(local.get(chapter.id) ?? { id: chapter.id, title: chapter.title, content: chapter.content, videoFile: null }),
        order: chapter.order,
        hasVideo: chapter.has_video,
      }));
      const drafts = chapters.filter(chapter => !savedSnapshotsRef.current[chapter.id]);
      const lastOrder = Math.max(0, ...reloaded.map(chapter => chapter.order));
      reloaded.push(...drafts.map((chapter, index) => ({ ...chapter, order: lastOrder + index + 1 })));
      savedSnapshotsRef.current = Object.fromEntries(serverChapters.map(chapter => [chapter.id, getChapterSnapshot(chapter)]));
      setChapters(reloaded);
      setLoadedCourseId(courseId);
      if (!reloaded.some(chapter => chapter.id === selectedChapterId)) setSelectedChapterId(reloaded[0]?.id ?? null);
      setOrderRecoveryNeeded(false);
      setOrderError("");
    } catch {
      setOrderError("The current order could not be loaded. Please try again.");
    } finally {
      orderSavePending.current = false;
      setIsReordering(false);
    }
  };

  const moveChapterWithKeyboard = (chapter: Chapter, direction: "up" | "down") => {
    const index = chapters.findIndex(item => item.id === chapter.id);
    const target = chapters[index + (direction === "up" ? -1 : 1)];
    if (target) void reorderChapters(chapter.id, target.id, direction === "up" ? "before" : "after");
  };

  const requestChapterAction = (type: "rename" | "delete", id: string) => {
    if (editorBusy || isLoadingChapters || pendingChapterId || chapterAction || courseAction || orderSavePending.current || actionPendingRef.current) return;
    const target = chapters.find(chapter => chapter.id === id);
    if (!target) return;
    actionOpenRef.current = true;
    setChapterName(target.title);
    setActionError("");
    setChapterAction({ type, id, title: target.title, isDraft: isNewUnsavedChapter(id) });
  };

  const closeChapterAction = () => {
    if (actionPendingRef.current) return;
    actionOpenRef.current = false;
    setChapterAction(null);
    setActionError("");
  };

  const confirmChapterAction = async () => {
    if (!chapterAction || !courseId || editorBusy || orderSavePending.current || actionPendingRef.current) return;
    const target = chapters.find(chapter => chapter.id === chapterAction.id);
    if (!target) { closeChapterAction(); return; }
    const title = chapterName.trim();
    if (chapterAction.type === "rename" && !title) { setActionError("Enter a chapter name."); return; }
    actionPendingRef.current = true;
    setIsSavingAction(true);
    setActionError("");
    let close = false;
    try {
      if (chapterAction.type === "rename") {
        const snapshot = savedSnapshotsRef.current[target.id];
        if (snapshot) {
          const saved = JSON.parse(snapshot) as Pick<Chapter, "title" | "content" | "order">;
          if (title !== saved.title) await api.put(`/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(target.id)}/`, { title });
          savedSnapshotsRef.current[target.id] = JSON.stringify({ ...saved, title });
        }
        setChapters(current => current.map(chapter => chapter.id === target.id ? { ...chapter, title } : chapter));
        toast.success("Chapter renamed");
        close = true;
      } else {
        const deleted = await deleteChapter(target.id, { allowEmpty: true });
        close = deleted || !savedSnapshotsRef.current[target.id];
        if (!close) setActionError("Chapter could not be deleted. Close this dialog and reload the chapter list before trying again.");
      }
    } catch {
      setActionError("Chapter name could not be saved. Please try again.");
    } finally {
      actionPendingRef.current = false;
      setIsSavingAction(false);
    }
    if (close) closeChapterAction();
  };

  const actionChapter = chapters.find(chapter => chapter.id === chapterAction?.id) ?? chapterAction;

  const handleSaveChapter = async () => {
    if (!selectedChapter || editorBusy || chapterAction || courseAction || orderSavePending.current) return;

    const { title, content, order, videoFile } = selectedChapter;
    const snapshot = savedSnapshotsRef.current[selectedChapter.id];
    const isNewChapter = !snapshot;
    const data = buildChapterSavePayload(selectedChapter, snapshot ? JSON.parse(snapshot) : undefined);
    const hasField = (key: string) => data instanceof FormData ? data.has(key) : Object.prototype.hasOwnProperty.call(data, key);
    if (!isNewChapter && (data instanceof FormData ? [...data.keys()].length === 0 : Object.keys(data).length === 0)) {
      toast.info("No changes to save");
      return;
    }

    // Required field validation
    if ((isNewChapter || hasField("title")) && !title.trim()) {
      toast.error("Chapter title is required!");
      return;
    }
    if ((isNewChapter || hasField("order")) && (!order || order < 1)) {
      toast.error("Chapter order is required and must be at least 1!");
      return;
    }
    if ((isNewChapter || hasField("content")) && (!content.trim() || content === "<p><br></p>")) {
      toast.error("Chapter content is required!");
      return;
    }
    // Duplicate order check
    const duplicateOrder = chapters.find(
      (ch) => ch.id !== selectedChapter.id && ch.order === order,
    );
    if ((isNewChapter || hasField("order")) && duplicateOrder) {
      toast.error(
        `Order ${order} is already used by "${duplicateOrder.title}"`,
      );
      return;
    }

    try {
      setIsSavingChapter(true);

      console.log("[CourseEditor] Saving chapter...", {
        courseId,
        title,
        order,
      });
      const chaptersUrl = `/courses/${encodeURIComponent(courseId)}/chapters/`;
      const response = isNewChapter
        ? await api.post(chaptersUrl, data, { skipAuthRefresh: true })
        : await api.put(
            `${chaptersUrl}${encodeURIComponent(selectedChapter.id)}/`,
            data,
            { skipAuthRefresh: true },
          );
      const savedData = response?.data as { id?: string; has_video?: boolean; data?: { id?: string; has_video?: boolean } } | undefined;
      const savedChapterId = isNewChapter
        ? String(savedData?.id ?? savedData?.data?.id ?? "")
        : selectedChapter.id;
      if (savedChapterId) {
        const storedHasVideo = savedData?.has_video ?? savedData?.data?.has_video;
        const savedChapter = { ...selectedChapter, id: savedChapterId, videoFile: null, removeVideo: false,
          hasVideo: typeof storedHasVideo === "boolean" ? storedHasVideo : Boolean(videoFile || (selectedChapter.hasVideo && !selectedChapter.removeVideo)) };
        delete savedSnapshotsRef.current[selectedChapter.id];
        savedSnapshotsRef.current[savedChapterId] = getChapterSnapshot(savedChapter);
        setChapters((current) => current.map((chapter) => chapter.id === selectedChapter.id ? savedChapter : chapter));
        setSelectedChapterId(savedChapterId);
      }
      console.log("[CourseEditor] Save response:", response?.data);
      toast.success("Chapter saved successfully!");

      // Re-fetch chapters to update the list with server state
      try {
        console.log("[CourseEditor] Refreshing chapters...");
        const refreshResponse = await api.get(
          `/courses/${courseId}/`,
          {
            skipAuthRefresh: true,
          },
        );
        console.log("[CourseEditor] Refresh response:", refreshResponse?.data);
        const refreshData = parseCourseContent(refreshResponse?.data, courseId).chapters;
        const fetched: Chapter[] = refreshData.map((ch) => ({
          id: String(ch.id),
          title: String(ch.title || ""),
          content: String(ch.content || ""),
          order: Number(ch.order ?? 1),
          videoFile: null,
          hasVideo: ch.has_video,
          removeVideo: false,
        }));
        setChapters(fetched);
        setLoadedCourseId(courseId);
        const snapshots: Record<string, string> = {};
        fetched.forEach((ch) => {
          snapshots[ch.id] = getChapterSnapshot(ch);
        });
        savedSnapshotsRef.current = snapshots;
        // Keep the saved chapter selected if it exists, otherwise select first
        const savedChapter = fetched.find(
          (ch) => ch.id === savedChapterId,
        ) ?? fetched.find(
          (ch) => ch.title === title && ch.order === order,
        );
        setSelectedChapterId(savedChapter?.id ?? fetched[0]?.id ?? null);
        console.log("[CourseEditor] Chapters refreshed");
      } catch (refreshError) {
        console.error(
          "[CourseEditor] Failed to refresh chapters:",
          refreshError,
        );
      }
    } catch (error) {
      console.error("[CourseEditor] Error saving chapter:", error);
      toast.error("Failed to save chapter. Please try again.");
    } finally {
      console.log("[CourseEditor] Save chapter finished");
      setIsSavingChapter(false);
    }
  };

  // ─── Step 1 UI: Create New Course ────────────────────────────────────────
  if (isNewCourse) {
    return (
      <div className={styles.shell} data-course-layout data-course-editor>
        {/* Header */}
        <div className={styles.header}>
        <div className={styles.headerInner}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              aria-label="Back to courses"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-purple-600"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-slate-900 text-base font-semibold">
                Create New Course
              </h1>
              <p className="text-slate-600 text-xs mt-0.5">
                Start by giving your course a name
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Course Title Input */}
        <div className="flex flex-1 items-start justify-center">
          <div className={styles.createPanel}>
            <h2 className="text-slate-900 text-base font-semibold mb-1">
              Course Title
            </h2>
            <p className="text-slate-600 text-sm mb-4">
              Choose a clear, descriptive name for your course.
            </p>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCourse()}
              className="w-full px-3 py-2.5 text-sm"
              placeholder="e.g., Advanced Python Programming"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateCourse}
              disabled={isCreating}
              className={`${styles.primaryButton} mt-4 w-full`}
            >
              {isCreating ? "Creating..." : "Create Course →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2 UI: Edit Course / Add Chapters ────────────────────────────────
  return (
    <div className={styles.shell} data-course-layout data-course-editor>
      {/* Top Header */}
      <div ref={editorHeaderRef} data-editor-header className={styles.header} inert={Boolean(pendingChapterId || chapterAction || courseAction)}>
      <div className={styles.headerInner}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={editorBusy}
            aria-label="Back to courses"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-purple-600 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
            <h1 title={(formData?.title as string) || courseTitle} className="min-w-0 truncate text-slate-900 text-base font-semibold">
              {(formData?.title as string) || courseTitle || "Edit Course"}
            </h1>
            {hasUnsavedChanges() && <span className="hidden shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-amber-800 bg-amber-50 sm:inline">Unsaved</span>}
            </div>
            <p className="hidden text-slate-600 text-xs mt-0.5 sm:block">
              Edit chapters, content and video
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button ref={courseActionTriggerRef} type="button" aria-label="Course actions" title="Course actions" disabled={editorBusy || isLoadingChapters} className={`${styles.secondaryButton} ${styles.courseActionsButton}`}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Course actions</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4} className={styles.menuContent} onCloseAutoFocus={event => { if (courseActionOpenRef.current) event.preventDefault(); }}>
              <DropdownMenu.Item aria-label="Edit course" className={styles.menuItem} onSelect={() => requestCourseAction("edit")}>
                <Pencil className="h-4 w-4" />Edit course
              </DropdownMenu.Item>
              <DropdownMenu.Item aria-label="Remove course" className={`${styles.menuItem} ${styles.dangerAction}`} onSelect={() => requestCourseAction("delete")}>
                <Trash2 className="h-4 w-4" />Remove course
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <button
          type="button"
          onClick={handleSaveChapter}
          disabled={editorBusy || !selectedChapter}
          className={styles.primaryButton}
        >
          <Save className="w-4 h-4" />
          {isSavingChapter ? "Saving..." : "Save Chapter"}
        </button>
        </div>
      </div>
      </div>

      {/* Main Content */}
      <div className={styles.workspace} inert={Boolean(pendingChapterId || chapterAction || courseAction)}>
        {/* Left Panel – Chapter List */}
        <aside ref={chapterSidebarRef} data-editor-sidebar aria-labelledby="chapter-navigation-title" className={styles.sidebar}>
          <div className="pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between gap-2">
            <h2 id="chapter-navigation-title" className="text-sm font-semibold text-slate-900">Chapters <span className="ml-1 font-normal text-slate-600">{chapters.length}</span></h2>
            <button
              ref={addChapterRef}
              onClick={addChapter}
              disabled={editorBusy || isLoadingChapters}
              className={`${styles.primaryButton} ${styles.compactButton}`}
              type="button"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Chapter
            </button>
            </div>
            <div className="mt-2 text-xs text-slate-600" aria-live="polite">
              {isReordering ? <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Saving order...</span> : "Drag to reorder chapters."}
            </div>
            {orderError && <div role="alert" className="mt-3 text-sm text-red-700">
              <p>{orderError}</p>
              {orderRecoveryNeeded && <button ref={reloadOrderRef} type="button" onClick={reloadChapterOrder} disabled={isReordering} className="mt-2 underline disabled:opacity-60">Reload order</button>}
            </div>}
          </div>

          <div className="mt-2 space-y-1">
            {isLoadingChapters && (
              <div className="flex flex-col items-center justify-center mt-10 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
                <p className="text-sm">Loading chapters...</p>
              </div>
            )}
            {!isLoadingChapters && chapters.length === 0 && (
              <p className="text-gray-400 text-sm text-center mt-6 px-4">
                No chapters yet. Click &quot;Add Chapter&quot; to get started.
              </p>
            )}
            {chapters.map((chapter, chapterIndex) => (
              <div
                key={chapter.id}
                data-selected={selectedChapterId === chapter.id}
                className={`${styles.chapterRow} group ${draggedChapterId === chapter.id ? "opacity-50" : ""}`}
                onDragOver={(event) => {
                  if (!draggedChapterRef.current || editorBusy) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  const bounds = event.currentTarget.getBoundingClientRect();
                  setDropTarget({ id: chapter.id, position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const movedId = draggedChapterRef.current;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const position = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
                  draggedChapterRef.current = null;
                  setDraggedChapterId(null);
                  setDropTarget(null);
                  if (movedId) void reorderChapters(movedId, chapter.id, position);
                }}
              >
                {dropTarget?.id === chapter.id && draggedChapterId !== chapter.id && <div aria-hidden="true" className={`absolute inset-x-0 h-0.5 bg-purple-600 ${dropTarget.position === "before" ? "top-0" : "bottom-0"}`} />}
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    draggable={!editorBusy && !isLoadingChapters && chapters.length > 1}
                    disabled={editorBusy || isLoadingChapters || chapters.length < 2}
                    aria-label={`Reorder ${chapter.title}`}
                    title="Drag to reorder, or press Arrow Up / Arrow Down"
                    className="flex h-8 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-purple-100 hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                    onDragStart={(event) => {
                      draggedChapterRef.current = chapter.id;
                      setDraggedChapterId(chapter.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", chapter.id);
                    }}
                    onDragEnd={() => { draggedChapterRef.current = null; setDraggedChapterId(null); setDropTarget(null); }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                        event.preventDefault();
                        moveChapterWithKeyboard(chapter, event.key === "ArrowUp" ? "up" : "down");
                      }
                    }}
                  ><GripVertical className="h-4 w-4" /></button>
                  <button type="button" onClick={() => handleChapterSwitch(chapter.id)} disabled={editorBusy} aria-pressed={selectedChapterId === chapter.id} className="flex-1 min-w-0 text-left rounded focus-visible:outline-2 focus-visible:outline-purple-600 disabled:cursor-not-allowed">
                      <span title={chapter.title} className={styles.chapterTitle}>
                        {chapter.title}
                      </span>
                    <div className={styles.chapterMeta}>
                    <span>#{chapter.order}</span>
                    {((chapter.hasVideo && !chapter.removeVideo) || chapter.videoFile) && (
                      <span className="flex min-w-0 items-center gap-1">
                        <Video className="w-3 h-3" />
                        <span className="truncate">
                          {chapter.videoFile?.name ?? "Video attached"}
                        </span>
                      </span>
                    )}
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" aria-label={`Move ${chapter.title} up`} disabled={editorBusy || chapterIndex === 0} onClick={() => moveChapterWithKeyboard(chapter, "up")} className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-purple-100 hover:text-purple-700 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-purple-600"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={`Move ${chapter.title} down`} disabled={editorBusy || chapterIndex === chapters.length - 1} onClick={() => moveChapterWithKeyboard(chapter, "down")} className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-purple-100 hover:text-purple-700 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-purple-600"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button ref={node => { chapterActionTriggerRefs.current[chapter.id] = node; }} type="button" aria-label={`Actions for ${chapter.title}`} title="Chapter actions" disabled={editorBusy || isLoadingChapters} className={styles.chapterActionsButton}>
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" sideOffset={4} className={styles.menuContent} onCloseAutoFocus={event => { if (actionOpenRef.current) event.preventDefault(); }}>
                        <DropdownMenu.Item aria-label={`Rename ${chapter.title}`} onSelect={() => requestChapterAction("rename", chapter.id)} className={styles.menuItem}>
                          <Pencil className="h-4 w-4" />Rename chapter
                        </DropdownMenu.Item>
                        <DropdownMenu.Item aria-label={`Delete ${chapter.title}`} onSelect={() => requestChapterAction("delete", chapter.id)} className={`${styles.menuItem} ${styles.dangerAction}`}>
                          <Trash2 className="h-4 w-4" />{isNewUnsavedChapter(chapter.id) ? "Discard chapter" : "Delete chapter"}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Panel – Chapter Editor */}
        <div className="min-w-0 flex-1 bg-gray-50" inert={editorBusy}>
          {!selectedChapter ? (
            <div className={`${styles.editorPanel} flex flex-col items-center justify-center min-h-64 text-center text-slate-600`}>
              <FileText className="w-8 h-8 mb-3 text-slate-400" />
              <p className="text-sm font-semibold text-slate-900">No chapter selected</p>
              <p className="text-sm mt-1">
                Select a chapter or add one to start editing.
              </p>
            </div>
          ) : (
              <div ref={editorPanelRef} data-editor-panel className={`${styles.editorPanel} space-y-5`}>
                {/* Chapter Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chapter Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedChapter.title}
                    onChange={(e) =>
                      updateChapter(selectedChapter.id, {
                        title: e.target.value,
                      })
                    }
                    className="h-10 w-full px-3 text-sm"
                    placeholder="Enter chapter title"
                  />
                </div>

                {/* Chapter Content */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chapter Content <span className="text-red-500">*</span>
                  </label>
                  <RichTextInput
                    value={selectedChapter.content}
                    onChange={(html: string) =>
                      updateChapter(selectedChapter.id, { content: html })
                    }
                  />
                </div>

                {/* Video Upload */}
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-purple-600" />
                    Chapter Video
                  </h3>

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    aria-label="Upload chapter video"
                    className="hidden"
                    disabled={editorBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      updateChapter(selectedChapter.id, { videoFile: file, removeVideo: false });
                      event.target.value = "";
                    }}
                  />

                  {selectedChapter.hasVideo && !selectedChapter.removeVideo && !selectedChapter.videoFile ? <div>
                    {video.loading ? <p role="status" className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" />Loading video...</p>
                      : video.error ? <div role="alert" className="text-sm text-red-700"><p>{video.error}</p><button type="button" onClick={video.retry} className="mt-2 underline">Retry video</button></div>
                      : video.videoUrl && <video key={`${selectedChapter.id}:${video.videoUrl}`} src={video.videoUrl} onError={video.onPlaybackError} controls controlsList="nodownload" onContextMenu={(event) => event.preventDefault()} preload="metadata" className="w-full rounded-lg" />}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button type="button" aria-label="Remove attached video" disabled={editorBusy} onClick={() => updateChapter(selectedChapter.id, { removeVideo: true, videoFile: null })} className={`${styles.secondaryButton} ${styles.dangerAction}`}><Trash2 className="h-3.5 w-3.5" />Remove video</button>
                      <button type="button" disabled={editorBusy} onClick={() => videoInputRef.current?.click()} className={styles.secondaryButton}><Upload className="h-3.5 w-3.5" />Replace video</button>
                    </div>
                  </div> : selectedChapter.videoFile ? (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-purple-900 text-sm font-medium">
                          {selectedChapter.hasVideo ? "Replacement selected" : "Video selected"}
                        </p>
                        <p className="text-purple-700 text-xs truncate">
                          {selectedChapter.videoFile.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Cancel video selection"
                        disabled={editorBusy}
                        onClick={() =>
                          updateChapter(selectedChapter.id, { videoFile: null })
                        }
                        className="text-red-600 hover:text-red-700 disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-purple-800">Save Chapter to {selectedChapter.hasVideo ? "replace the attached video" : "upload this video"}.</p>
                    <button type="button" disabled={editorBusy} onClick={() => videoInputRef.current?.click()} className="mt-3 text-sm text-purple-700 underline focus-visible:outline-2 focus-visible:outline-purple-600 disabled:opacity-60">Choose another file</button>
                    </div>
                  ) : (
                    <>
                      {selectedChapter.removeVideo && <div className="mb-4 text-sm text-gray-700" role="status">
                        <p>Video removal is pending. Save Chapter to apply it.</p>
                        <button type="button" disabled={editorBusy} onClick={() => updateChapter(selectedChapter.id, { removeVideo: false })} className="mt-2 text-purple-700 underline focus-visible:outline-2 focus-visible:outline-purple-600 disabled:opacity-60">Undo removal</button>
                      </div>}
                      <div className={styles.uploadBox}>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-gray-700 text-sm font-medium mb-1">Upload a Video File</p>
                        <p className="text-gray-500 text-xs mb-4">MP4, MOV, AVI supported. Max file size 2GB.</p>
                        <button type="button" disabled={editorBusy} onClick={() => videoInputRef.current?.click()} className={styles.secondaryButton}>Browse Files</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
          )}
        </div>
      </div>

      {courseAction && (
        <Dialog.Root open onOpenChange={open => { if (!open) closeCourseAction(); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35" />
            <Dialog.Content className={styles.actionDialog} onCloseAutoFocus={event => {
              event.preventDefault();
              queueMicrotask(() => courseActionTriggerRef.current?.focus({ preventScroll: true }));
            }}>
              <Dialog.Title className="text-base font-semibold text-slate-900">{courseAction === "edit" ? "Edit course" : "Remove course"}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600 break-words">
                {courseAction === "edit"
                  ? "Update the course details. Your unsaved chapter changes will stay in the editor."
                  : `Remove “${(formData.title as string) || "this course"}”? All its chapters, content, videos and unsaved changes will be removed. This cannot be undone.`}
              </Dialog.Description>
              {courseAction === "edit" && <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="course-action-title" className="mb-1.5 block text-sm font-medium text-slate-700">Course title</label>
                  <input id="course-action-title" aria-label="Course title" className={`${styles.actionInput} ${styles.courseInput}`} value={courseTitle} disabled={isSavingCourseAction} onChange={event => setCourseTitle(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void confirmCourseAction(); } }} />
                </div>
                <div>
                  <label htmlFor="course-action-description" className="mb-1.5 block text-sm font-medium text-slate-700">Description (optional)</label>
                  <textarea id="course-action-description" aria-label="Course description" rows={3} className={`${styles.actionInput} ${styles.courseInput} resize-y`} value={courseDescription} disabled={isSavingCourseAction} onChange={event => setCourseDescription(event.target.value)} />
                </div>
              </div>}
              {courseActionError && <p role="alert" className="mt-3 text-sm text-red-700">{courseActionError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" aria-label="Cancel course action" onClick={closeCourseAction} disabled={isSavingCourseAction} className={styles.secondaryButton} autoFocus={courseAction === "delete"}>Cancel</button>
                <button type="button" aria-label={courseAction === "edit" ? "Save course details" : "Confirm course removal"} onClick={confirmCourseAction} disabled={editorBusy || (courseAction === "edit" && !courseTitle.trim())} className={`${styles.primaryButton} ${courseAction === "delete" ? styles.deleteButton : ""}`}>
                  {isSavingCourseAction ? <><Loader2 className="h-4 w-4 animate-spin" />{courseAction === "edit" ? "Saving..." : "Removing..."}</> : courseAction === "edit" ? "Save course" : "Remove course"}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {chapterAction && actionChapter && (
        <Dialog.Root open onOpenChange={open => { if (!open) closeChapterAction(); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35" />
            <Dialog.Content className={styles.actionDialog} onCloseAutoFocus={event => {
              event.preventDefault();
              const restoreFocus = () => {
                const target = [chapterActionTriggerRefs.current[chapterAction.id], reloadOrderRef.current, addChapterRef.current]
                  .find(node => node?.isConnected && !node.disabled);
                target?.focus({ preventScroll: true });
              };
              queueMicrotask(restoreFocus);
            }}>
              <Dialog.Title className="text-base font-semibold text-slate-900">
                {chapterAction.type === "rename" ? "Rename chapter" : chapterAction.isDraft ? "Discard chapter" : "Delete chapter"}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
                {chapterAction.type === "rename"
                  ? "Update the chapter name. Your draft content and video changes will stay as they are."
                  : `Delete “${actionChapter.title}”? Its content, video and any unsaved changes will be removed.`}
              </Dialog.Description>
              {chapterAction.type === "rename" && <div className="mt-4">
                <label htmlFor="chapter-action-name" className="mb-1.5 block text-xs font-semibold text-slate-700">Chapter name</label>
                <input id="chapter-action-name" aria-label="Chapter name" className={styles.actionInput} value={chapterName} disabled={isSavingAction} onChange={event => setChapterName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void confirmChapterAction(); } }} />
              </div>}
              {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" aria-label="Cancel chapter action" onClick={closeChapterAction} disabled={isSavingAction} className={styles.secondaryButton}>Cancel</button>
                <button type="button" aria-label={chapterAction.type === "rename" ? "Save chapter name" : "Confirm chapter deletion"} onClick={confirmChapterAction} disabled={editorBusy || (chapterAction.type === "rename" && !chapterName.trim())} className={`${styles.primaryButton} ${chapterAction.type === "delete" ? styles.deleteButton : ""}`}>
                  {isSavingAction ? <><Loader2 className="h-4 w-4 animate-spin" />{chapterAction.type === "rename" ? "Saving..." : "Deleting..."}</> : chapterAction.type === "rename" ? "Save name" : chapterAction.isDraft ? "Discard chapter" : "Delete chapter"}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Unsaved Changes Modal */}
      {pendingChapterId && (
        <Dialog.Root open onOpenChange={(open) => { if (!open && !orderSavePending.current) cancelSwitch(); }}>
          <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-11/12 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <Dialog.Title className="text-gray-900 text-lg font-semibold">
                Unsaved Changes
              </Dialog.Title>
            </div>
            <Dialog.Description className="text-gray-600 text-sm mb-6">
              You have unsaved changes in this chapter. If you switch now, your
              changes will be lost.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelSwitch}
                disabled={editorBusy}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSwitch}
                disabled={editorBusy}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
