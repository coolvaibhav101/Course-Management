import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const original = [
  { id: "a", title: "First", content: "<p>First</p>", order: 1 },
  { id: "b", title: "Second", content: "<p>Second</p>", order: 2 },
  { id: "c", title: "Third", content: "<p>Third</p>", order: 3 },
];
const plain = value => JSON.parse(JSON.stringify(value));

function setup({ fail } = {}) {
  const chapters = new Map(original.map(chapter => [chapter.id, { ...chapter }]));
  const calls = [];
  const api = { post: async (url, data) => {
    calls.push({ url, body: plain(data) });
    if (fail?.({ chapters: data.chapters, call: calls.length })) throw new Error("offline");
    assert.equal(new Set(data.chapters.map(chapter => chapter.order)).size, data.chapters.length);
    for (const { id, order } of data.chapters) chapters.set(id, { ...chapters.get(id), order });
  } };
  const source = readFileSync(new URL("../src/services/chapterOrder.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exported = {};
  vm.runInNewContext(`(function(require, exports) {${compiled}\n})`, { FormData, Error, Map, Set })
    (() => ({ default: api }), exported);
  return { ...exported, chapters, calls };
}

test("dropping chapters above or below a target assigns consecutive orders without changing content", () => {
  const { moveChapter } = setup();
  const moved = moveChapter(original, "c", "a", "before");
  assert.deepEqual(plain(moved).map(chapter => [chapter.id, chapter.order]), [["c", 1], ["a", 2], ["b", 3]]);
  assert.deepEqual(plain(moveChapter(original, "a", "c", "after")).map(chapter => [chapter.id, chapter.order]), [["b", 1], ["c", 2], ["a", 3]]);
  assert.equal(moved[0].content, "<p>Third</p>");
  assert.equal(original[2].order, 3);
  assert.deepEqual(plain(moveChapter(original, "a", "a", "before")), original);
});

test("saving a reorder sends one bulk POST containing only chapter IDs and orders", async () => {
  const { moveChapter, saveChapterOrder, chapters, calls } = setup();
  const next = moveChapter(original, "c", "a", "before").map(chapter => ({ ...chapter, content: "Unsaved draft" }));
  await saveChapterOrder("course/1", original, next);
  assert.deepEqual([...chapters.values()].sort((a, b) => a.order - b.order).map(chapter => chapter.id), ["c", "a", "b"]);
  assert.deepEqual(calls, [{ url: "/courses/course%2F1/chapters/reorder/", body: { chapters: [
    { id: "c", order: 1 }, { id: "a", order: 2 }, { id: "b", order: 3 },
  ] } }]);
  assert.equal(chapters.get("c").content, "<p>Third</p>");
});

test("unsaved chapter IDs are reordered locally without sending creation or update requests for them", async () => {
  const { saveChapterOrder, chapters, calls } = setup();
  const next = [{ id: "draft", title: "", content: "", order: 1 }, ...original.map(chapter => ({ ...chapter, order: chapter.order + 1 }))];
  await saveChapterOrder("course-1", original, next);
  assert.deepEqual(calls[0].body.chapters, [{ id: "a", order: 2 }, { id: "b", order: 3 }, { id: "c", order: 4 }]);
  assert.deepEqual([...chapters.values()].map(chapter => chapter.order), [2, 3, 4]);
});

test("a failed reorder restores the previous order through the bulk endpoint", async () => {
  const { moveChapter, saveChapterOrder, chapters, calls } = setup({ fail: ({ call }) => call === 1 });
  await assert.rejects(saveChapterOrder("course-1", original, moveChapter(original, "c", "a", "before")), error => error.restored === true);
  assert.deepEqual([...chapters.values()], original);
  assert.deepEqual(calls[1].body.chapters, [{ id: "a", order: 1 }, { id: "b", order: 2 }, { id: "c", order: 3 }]);
});

test("failed recovery is reported so the editor can reload server order before another move", async () => {
  const { moveChapter, saveChapterOrder } = setup({ fail: () => true });
  await assert.rejects(saveChapterOrder("course-1", original, moveChapter(original, "c", "a", "before")), error => error.restored === false);
});

test("an unchanged order makes no update requests", async () => {
  const { saveChapterOrder, calls } = setup();
  await saveChapterOrder("course-1", original, original);
  assert.equal(calls.length, 0);
});
