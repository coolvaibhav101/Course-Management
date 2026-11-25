interface ChapterSaveFields {
  title: string;
  content: string;
  order: number;
  videoFile?: File | null;
  removeVideo?: boolean;
}

type ChapterTextFields = Pick<ChapterSaveFields, 'title' | 'content' | 'order'>;

/** New chapters send all fields; updates send only changes, including video changes. */
export function buildChapterSavePayload(chapter: ChapterSaveFields, original?: ChapterTextFields): FormData | (Partial<ChapterTextFields> & { video: null }) {
  const fields: ChapterTextFields = { title: chapter.title, content: chapter.content, order: chapter.order };
  const updates = original ? Object.fromEntries(Object.entries(fields).filter(([key, value]) =>
    value !== original[key as keyof ChapterTextFields],
  )) as Partial<ChapterTextFields> : fields;
  if (chapter.removeVideo && !chapter.videoFile) {
    return { ...updates, video: null };
  }
  const data = new FormData();
  for (const [key, value] of Object.entries(updates)) data.append(key, String(value));
  if (chapter.videoFile) data.append("video", chapter.videoFile);
  return data;
}
