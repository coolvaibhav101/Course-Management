import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
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
} from "lucide-react";
import RichTextInput from "./RichText/RichTextInput";
import api from "@/src/utils/connection";

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  videoFile?: File | null;
  videoUrl?: string;
}

interface CourseEditorProps {
  onSave: () => void;
  onCancel: () => void;
  formData: any;
  setFormData: (formData: any) => void;
  isEdit: any;
  setIsEdit: (isEdit: any) => void;
}

export function CourseEditor({
  onSave,
  onCancel,
  formData,
  setFormData,
  isEdit,
  setIsEdit,
}: CourseEditorProps) {
  const courseId = formData?.id;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [courseTitle, setCourseTitle] = useState(formData?.title || "");
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(null);

  // Track saved state per chapter to detect unsaved changes
  const savedSnapshotsRef = useRef<Record<string, string>>({});

  const getChapterSnapshot = (ch: Chapter) =>
    JSON.stringify({ title: ch.title, content: ch.content, order: ch.order });

  const hasUnsavedChanges = useCallback(() => {
    if (!selectedChapterId) return false;
    const current = chapters.find((ch) => ch.id === selectedChapterId);
    if (!current) return false;
    const saved = savedSnapshotsRef.current[selectedChapterId];
    // If no saved snapshot, it's a new unsaved chapter
    if (!saved) return true;
    return getChapterSnapshot(current) !== saved;
  }, [selectedChapterId, chapters]);

  const selectedChapter = chapters.find((ch) => ch.id === selectedChapterId);

  // Fetch existing chapters when editing a course
  useEffect(() => {
    if (!courseId || isEdit?.isNew) return;

    const fetchChapters = async () => {
      try {
        setIsLoadingChapters(true);
        const response = await api.get(`/courses/${courseId}/chapters/`);
        const fetched: Chapter[] = (response?.data ?? []).map((ch: any) => ({
          id: String(ch.id),
          title: ch.title || "",
          content: ch.content || "",
          order: ch.order ?? 1,
          videoFile: null,
          videoUrl: ch.video || "",
        }));
        setChapters(fetched);
        // Save snapshots for all fetched chapters (they are "saved" state)
        const snapshots: Record<string, string> = {};
        fetched.forEach((ch) => {
          snapshots[ch.id] = getChapterSnapshot(ch);
        });
        savedSnapshotsRef.current = snapshots;
        if (fetched.length > 0) {
          setSelectedChapterId(fetched[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      } finally {
        setIsLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [courseId, isEdit?.isNew]);

  // Check if a chapter is new (never saved to server)
  const isNewUnsavedChapter = (id: string) => !savedSnapshotsRef.current[id];

  // Create and select a new chapter
  const createNewChapter = () => {
    const newId = Date.now().toString();
    const newChapter: Chapter = {
      id: newId,
      title: `Chapter ${chapters.length + 1}`,
      content: "",
      order: chapters.length + 1,
      videoFile: null,
      videoUrl: "",
    };
    setChapters((prev) => [...prev, newChapter]);
    setSelectedChapterId(newId);
  };

  // Handle chapter switch with unsaved changes warning
  const handleChapterSwitch = (chapterId: string) => {
    if (chapterId === selectedChapterId) return;
    if (hasUnsavedChanges()) {
      setPendingChapterId(chapterId);
      return;
    }
    setSelectedChapterId(chapterId);
  };

  // Handle Add Chapter with unsaved changes check
  const addChapter = () => {
    if (hasUnsavedChanges()) {
      setPendingChapterId("__new__");
      return;
    }
    createNewChapter();
  };

  const confirmSwitch = () => {
    if (!pendingChapterId || !selectedChapterId) return;

    if (isNewUnsavedChapter(selectedChapterId)) {
      // New unsaved chapter — remove it from the list
      setChapters((prev) => prev.filter((ch) => ch.id !== selectedChapterId));
    } else {
      // Existing saved chapter — revert to saved snapshot
      const snapshot = savedSnapshotsRef.current[selectedChapterId];
      if (snapshot) {
        const saved = JSON.parse(snapshot);
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === selectedChapterId ? { ...ch, ...saved } : ch,
          ),
        );
      }
    }

    if (pendingChapterId === "__cancel__") {
      setPendingChapterId(null);
      onCancel();
    } else if (pendingChapterId === "__new__") {
      setPendingChapterId(null);
      setTimeout(() => createNewChapter(), 0);
    } else {
      setSelectedChapterId(pendingChapterId);
      setPendingChapterId(null);
    }
  };

  const cancelSwitch = () => {
    setPendingChapterId(null);
  };

  // Handle cancel/back with unsaved changes check
  const handleCancel = () => {
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
      const newCourse = coursesResponse?.data;
      setFormData(newCourse);
      setIsEdit({ status: true, isNew: false, formData: newCourse });
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // ─── Step 2: Chapter Management ──────────────────────────────────────────

  const updateChapter = (id: string, patch: Partial<Chapter>) => {
    setChapters(
      chapters.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)),
    );
  };

  const deleteChapter = (id: string) => {
    if (chapters.length === 1) {
      toast.error("Cannot delete the last chapter");
      return;
    }
    const updated = chapters.filter((ch) => ch.id !== id);
    setChapters(updated);
    if (selectedChapterId === id) {
      setSelectedChapterId(updated[0]?.id ?? null);
    }
    toast.success("Chapter deleted");
  };

  const handleSaveChapter = async () => {
    if (!selectedChapter) return;

    const { title, content, order, videoFile } = selectedChapter;

    // Required field validation
    if (!title.trim()) {
      toast.error("Chapter title is required!");
      return;
    }
    if (!order || order < 1) {
      toast.error("Chapter order is required and must be at least 1!");
      return;
    }
    if (!content.trim() || content === "<p><br></p>") {
      toast.error("Chapter content is required!");
      return;
    }
    // Duplicate order check
    const duplicateOrder = chapters.find(
      (ch) => ch.id !== selectedChapter.id && ch.order === order,
    );
    if (duplicateOrder) {
      toast.error(
        `Order ${order} is already used by "${duplicateOrder.title}"`,
      );
      return;
    }

    try {
      setIsSavingChapter(true);
      const data = new FormData();
      data.append("title", title);
      data.append("content", content);
      data.append("order", String(order));
      if (videoFile) {
        data.append("media_url", videoFile);
      }

      const response = await api.post(`/courses/${courseId}/chapters/`, data);
      console.log("chapter save response", response?.data);
      toast.success("Chapter saved successfully!");

      // Re-fetch chapters to update the list with server state
      try {
        const refreshResponse = await api.get(`/courses/${courseId}/chapters/`);
        const fetched: Chapter[] = (refreshResponse?.data ?? []).map(
          (ch: any) => ({
            id: String(ch.id),
            title: ch.title || "",
            content: ch.content || "",
            order: ch.order ?? 1,
            videoFile: null,
            videoUrl: ch.video || "",
          }),
        );
        setChapters(fetched);
        const snapshots: Record<string, string> = {};
        fetched.forEach((ch) => {
          snapshots[ch.id] = getChapterSnapshot(ch);
        });
        savedSnapshotsRef.current = snapshots;
        // Keep the saved chapter selected if it exists, otherwise select first
        const savedChapter = fetched.find(
          (ch) => ch.title === title && ch.order === order,
        );
        setSelectedChapterId(savedChapter?.id ?? fetched[0]?.id ?? null);
      } catch (refreshError) {
        console.error("Failed to refresh chapters:", refreshError);
      }
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast.error("Failed to save chapter. Please try again.");
    } finally {
      setIsSavingChapter(false);
    }
  };

  // ─── Step 1 UI: Create New Course ────────────────────────────────────────
  if (isEdit?.isNew) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-gray-900 text-xl font-semibold">
                Create New Course
              </h1>
              <p className="text-gray-500 text-sm">
                Start by giving your course a name
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateCourse}
            disabled={isCreating}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isCreating ? "Creating..." : "Create Course"}
          </button>
        </div>

        {/* Course Title Input */}
        <div className="flex flex-1 items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-10 w-full max-w-lg shadow-sm">
            <h2 className="text-gray-800 text-lg font-medium mb-1">
              Course Title
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Choose a clear, descriptive name for your course.
            </p>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCourse()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-base"
              placeholder="e.g., Advanced Python Programming"
              autoFocus
            />
            <button
              onClick={handleCreateCourse}
              disabled={isCreating}
              className="mt-5 w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="text-gray-600 hover:text-gray-900"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-gray-900 text-xl font-semibold">
              {formData?.title || courseTitle || "Edit Course"}
            </h1>
            <p className="text-gray-500 text-sm">
              Add chapters and content to your course
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveChapter}
          disabled={isSavingChapter || !selectedChapter}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSavingChapter ? "Saving..." : "Save Chapter"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel – Chapter List */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={addChapter}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              type="button"
            >
              <Plus className="w-4 h-4" />
              Add Chapter
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={`group p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedChapterId === chapter.id
                    ? "border-purple-600 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
                onClick={() => handleChapterSwitch(chapter.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <FileText
                        className={`w-4 h-4 flex-shrink-0 ${
                          selectedChapterId === chapter.id
                            ? "text-purple-600"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="text-gray-700 text-sm truncate font-medium">
                        {chapter.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 ml-6">
                      Order: {chapter.order}
                    </span>
                    {chapter.videoFile && (
                      <div className="flex items-center gap-1 text-gray-500 ml-6 mt-0.5">
                        <Video className="w-3 h-3" />
                        <span className="text-xs truncate">
                          {chapter.videoFile.name}
                        </span>
                      </div>
                    )}
                  </div>
                  {chapters.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChapter(chapter.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel – Chapter Editor */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!selectedChapter ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <FileText className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-base font-medium">No chapter selected</p>
              <p className="text-sm">
                Add a chapter from the left panel to get started.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-8">
              <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6 shadow-sm">
                {/* Chapter Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="Enter chapter title"
                  />
                </div>

                {/* Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Chapter Order <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={selectedChapter.order}
                    onChange={(e) =>
                      updateChapter(selectedChapter.id, {
                        order: Number(e.target.value),
                      })
                    }
                    className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                </div>

                {/* Chapter Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Chapter Content <span className="text-red-500">*</span>
                  </label>
                  <RichTextInput
                    value={selectedChapter.content}
                    onChange={(html: string) =>
                      updateChapter(selectedChapter.id, { content: html })
                    }
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    Add explanations, examples, and key concepts for this
                    chapter.
                  </p>
                </div>

                {/* Video Upload */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-gray-800 font-medium mb-4 flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-purple-600" />
                    Chapter Video
                  </h3>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 text-sm font-medium mb-1">
                      Upload a Video File
                    </p>
                    <p className="text-gray-500 text-xs mb-4">
                      MP4, MOV, AVI supported. Max file size 2GB.
                    </p>
                    <label className="cursor-pointer bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
                      Browse Files
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          updateChapter(selectedChapter.id, {
                            videoFile: file,
                          });
                        }}
                      />
                    </label>
                  </div>

                  {selectedChapter.videoFile && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <Video className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-green-900 text-sm font-medium">
                          Video selected
                        </p>
                        <p className="text-green-700 text-xs truncate">
                          {selectedChapter.videoFile.name}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateChapter(selectedChapter.id, { videoFile: null })
                        }
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {pendingChapterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-gray-900 text-lg font-semibold">
                Unsaved Changes
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              You have unsaved changes in this chapter. If you switch now, your
              changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelSwitch}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitch}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
