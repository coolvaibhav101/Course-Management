import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");

function setup(response = (_courseId, chapterId) => `https://cdn.example.com/${chapterId}.mp4`) {
  const slots = [], effects = [], calls = [];
  let cursor = 0, selection = ["course-1", "chapter-a", true], video;
  const hooks = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, dependencies) {
      const index = cursor++, previous = slots[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        const current = { dependencies, cleanup: undefined };
        slots[index] = current;
        effects.push(() => { previous?.cleanup?.(); current.cleanup = fn(); });
      }
    },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("../src/hooks/useChapterVideo.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { AbortController, Error })(name => {
    if (name === "react") return hooks;
    if (name === "@/src/services/student") return { getChapterVideoUrl: async (courseId, chapterId, signal) => {
      calls.push({ courseId, chapterId, signal });
      return response(courseId, chapterId, calls.length);
    } };
    return require(name);
  }, loaded, loaded.exports);
  const render = () => { cursor = 0; video = loaded.exports.useChapterVideo(...selection); return video; };
  const flush = async () => {
    for (let i = 0; i < 4; i++) { render(); for (const effect of effects.splice(0)) effect(); await new Promise(setImmediate); }
    return render();
  };
  return { calls, flush, render, select: (...next) => { selection = next; return render(); } };
}

test("chapters with has_video false or missing IDs do not request a video URL", async () => {
  const video = setup();
  video.select("course-1", "chapter-a", false);
  let state = await video.flush();
  assert.equal(video.calls.length, 0);
  assert.equal(state.videoUrl, undefined);
  assert.equal(state.loading, false);
  video.select("course-1", undefined, true);
  await video.flush();
  assert.equal(video.calls.length, 0);
});

test("a selected video chapter loads its own URL and clears it immediately when a chapter without video is selected", async () => {
  const video = setup();
  let state = await video.flush();
  assert.equal(state.videoUrl, "https://cdn.example.com/chapter-a.mp4");
  assert.deepEqual(video.calls.map(call => [call.courseId, call.chapterId]), [["course-1", "chapter-a"]]);
  state = video.select("course-1", "chapter-b", false);
  assert.equal(state.videoUrl, undefined);
  await video.flush();
  assert.equal(video.calls.length, 1);
  assert.equal(video.calls[0].signal.aborted, true);
});

test("late video responses cannot replace the selected chapter's player", async () => {
  let resolveFirst;
  const video = setup((_course, chapter) => chapter === "chapter-a"
    ? new Promise(resolve => { resolveFirst = resolve; }) : "https://cdn.example.com/chapter-b.mp4");
  await video.flush();
  video.select("course-1", "chapter-b", true);
  let state = await video.flush();
  assert.equal(state.videoUrl, "https://cdn.example.com/chapter-b.mp4");
  resolveFirst("https://cdn.example.com/chapter-a.mp4");
  state = await video.flush();
  assert.equal(state.videoUrl, "https://cdn.example.com/chapter-b.mp4");
  assert.equal(video.calls[0].signal.aborted, true);
});

test("failed video requests offer a retry that fetches a fresh URL", async () => {
  const video = setup((_course, _chapter, count) => {
    if (count === 1) throw new Error("offline");
    return "https://cdn.example.com/fresh.mp4";
  });
  let state = await video.flush();
  assert.match(state.error, /Video could not be loaded/);
  assert.equal(state.videoUrl, undefined);
  state.retry();
  state = await video.flush();
  assert.equal(state.videoUrl, "https://cdn.example.com/fresh.mp4");
  assert.equal(state.error, "");
  assert.equal(video.calls.length, 2);
});

test("playback failures clear the player and retry obtains another URL", async () => {
  const video = setup((_course, _chapter, count) => `https://cdn.example.com/lesson.mp4?version=${count}`);
  let state = await video.flush();
  state.onPlaybackError();
  state = video.render();
  assert.equal(state.videoUrl, undefined);
  assert.match(state.error, /could not be played/);
  state.retry();
  state = await video.flush();
  assert.equal(state.videoUrl, "https://cdn.example.com/lesson.mp4?version=2");
});
