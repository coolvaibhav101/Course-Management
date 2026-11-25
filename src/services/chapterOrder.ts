import api from "@/src/utils/connection";

export interface OrderedChapter {
  id: string;
  title: string;
  content: string;
  order: number;
}

export function moveChapter<T extends OrderedChapter>(
  chapters: T[],
  movedId: string,
  targetId: string,
  position: "before" | "after",
): T[] {
  if (movedId === targetId) return chapters;
  const moved = chapters.find(chapter => chapter.id === movedId);
  if (!moved || !chapters.some(chapter => chapter.id === targetId)) return chapters;
  const next = chapters.filter(chapter => chapter.id !== movedId);
  const targetIndex = next.findIndex(chapter => chapter.id === targetId);
  next.splice(targetIndex + (position === "after" ? 1 : 0), 0, moved);
  if (next.every((chapter, index) => chapter.id === chapters[index].id)) return chapters;
  return next.map((chapter, index) => ({ ...chapter, order: index + 1 }));
}

export class ChapterOrderSaveError extends Error {
  constructor(public readonly restored: boolean) {
    super(restored
      ? "Chapter order could not be saved. The previous order was restored."
      : "Chapter order could not be saved. Reload the current order before continuing.");
    this.name = "ChapterOrderSaveError";
  }
}

/** Save only persisted chapter IDs and orders; draft text and video stay local. */
export async function saveChapterOrder(
  courseId: string,
  previous: OrderedChapter[],
  next: OrderedChapter[],
): Promise<number> {
  if (!courseId?.trim()) throw new Error("Course ID is required");
  const originals = new Map(previous.map(chapter => [chapter.id, chapter]));
  const changed = next.filter(chapter => originals.has(chapter.id) && originals.get(chapter.id)!.order !== chapter.order);
  if (!changed.length) return 0;
  const endpoint = `/courses/${encodeURIComponent(courseId.trim())}/chapters/reorder/`;
  const payload = (chapters: OrderedChapter[]) => ({
    chapters: chapters.filter(chapter => originals.has(chapter.id)).map(({ id, order }) => ({ id, order })),
  });

  try {
    await api.post(endpoint, payload(next));
  } catch {
    try {
      // A lost response may follow a committed reorder; restore before retrying.
      await api.post(endpoint, payload(previous));
    } catch {
      throw new ChapterOrderSaveError(false);
    }
    throw new ChapterOrderSaveError(true);
  }
  return changed.length;
}
