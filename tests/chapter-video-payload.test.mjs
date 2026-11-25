import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function payload(chapter, original) {
  const compiled = ts.transpileModule(readFileSync(new URL("../src/services/chapterVideoPayload.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const exported = {};
  vm.runInNewContext(`(function(exports){${compiled}\n})`, { FormData })(exported);
  return exported.buildChapterSavePayload(chapter, original);
}
const chapter = { title: "First", content: "First lesson", order: 1 };

test("removing an existing video sends video null with the chapter fields", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(payload({ ...chapter, removeVideo: true }))), { ...chapter, video: null });
});

test("a replacement file sends only the video file and takes precedence over removal", () => {
  const body = payload({ ...chapter, removeVideo: true, videoFile: new File(["video"], "replacement.mp4") });
  assert.equal(body.get("video").name, "replacement.mp4");
  assert.equal(body.has("media_url"), false);
  assert.equal(body.get("title"), "First");
  assert.equal(body.get("order"), "1");
});

test("saving other fields leaves an existing video unchanged", () => {
  const body = payload(chapter);
  assert.equal(body.has("video"), false);
  assert.equal(body.has("media_url"), false);
});

test("a chapter title update sends only title", () => {
  assert.deepEqual(Object.fromEntries(payload({ ...chapter, title: "New title" }, chapter).entries()), { title: "New title" });
});

test("video-only updates omit all unchanged chapter fields", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(payload({ ...chapter, removeVideo: true }, chapter))), { video: null });
  const body = payload({ ...chapter, videoFile: new File(["video"], "new.mp4") }, chapter);
  assert.deepEqual([...body.keys()], ["video"]);
});

test("unchanged chapters produce an empty payload and new chapters keep all creation fields", () => {
  assert.equal([...payload(chapter, chapter).keys()].length, 0);
  assert.deepEqual(Object.fromEntries(payload(chapter).entries()), { title: "First", content: "First lesson", order: "1" });
});
