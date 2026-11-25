import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");
const originals = [
  { id: "a", title: "First", content: "First lesson", order: 1 },
  { id: "b", title: "Second", content: "Second lesson", order: 2 },
  { id: "c", title: "Third", content: "Third lesson", order: 3 },
];

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...nodes(node.props?.children)];
}

function videoElement({ currentTime = 0, duration = 10, ranges = [], ended = false } = {}) {
  return {
    currentTime, duration, ended,
    played: { length: ranges.length, start: index => ranges[index][0], end: index => ranges[index][1] },
  };
}

async function chapterAction(editor, label) {
  const control = editor.nodes().find(node => node.props?.["aria-label"] === label);
  assert.ok(control, `${label} action should be available`);
  await (control.props.onSelect ?? control.props.onClick)({ preventDefault() {}, stopPropagation() {} });
  return editor.refresh();
}

async function setup({ fail, courseFail = false, strictEffects = false, courseLoad, videos = {}, viewer = false, automation = false, completionFail = false, progressFail = false, deleteFail = false, completed = [] } = {}) {
  let cursor = 0;
  let closed = 0;
  let saved = 0;
  let course = { id: "course-1", title: "Test", description: "Course description" };
  const courseRequests = [];
  const courseLoads = [];
  const slots = [], effects = [], calls = [], notices = [], deletions = [], videoRequests = [];
  const server = new Map(originals.map(chapter => [chapter.id, { ...chapter, has_video: Boolean(videos[chapter.id]), is_completed: completed.includes(chapter.id) }]));
  const completions = [], observers = [], resizeObservers = [], timers = new Map(), visibilityListeners = new Set();
  let now = 0, timerId = 0, headerHeight = 80;
  const browserDocument = {
    visibilityState: "visible",
    addEventListener(name, listener) { if (name === "visibilitychange") visibilityListeners.add(listener); },
    removeEventListener(name, listener) { if (name === "visibilitychange") visibilityListeners.delete(listener); },
  };
  const scrollport = {};
  const completionTarget = {
    ownerDocument: browserDocument,
    closest(selector) { return selector === "main" ? scrollport : { querySelector: () => ({ getBoundingClientRect: () => ({ height: headerHeight }) }) }; },
  };
  class FakeIntersectionObserver {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  class FakeResizeObserver {
    constructor(callback) { this.callback = callback; resizeObservers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const hooks = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, dependencies) {
      const index = cursor++, previous = slots[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        const current = { dependencies, cleanup: undefined, setup: fn };
        slots[index] = current;
        effects.push(() => { previous?.cleanup?.(); current.cleanup = fn(); });
      }
    },
  };
  const api = {
    async get(url) {
      if (url.endsWith("/progress/")) {
        if (progressFail) throw new Error("Progress unavailable");
        const ids = [...server.values()].filter(chapter => chapter.is_completed).map(chapter => chapter.id);
        return { data: { course_id: "course-1", total_chapters: 3, completed_chapter_ids: ids, progress_percentage: ids.length / 3 * 100 } };
      }
      if (url.endsWith("/video-url/")) {
        const id = url.split("/").at(-3);
        videoRequests.push(id);
        return { data: { video_url: `https://cdn.example.com/${id}.mp4?version=${videoRequests.length}` } };
      }
      courseLoads.push(url);
      if (courseLoad) return courseLoad(url, courseLoads.length);
      return { data: { id: "course-1", chapters: [...server.values()].sort((a, b) => a.order - b.order) } };
    },
    async put(url, data) {
      if (url === "/courses/course-1/") {
        courseRequests.push({ method: "PUT", url, body: data });
        if (courseFail) throw new Error("Course update unavailable");
        course = { ...course, ...data };
        return { data: course };
      }
      const fields = data instanceof FormData ? Object.fromEntries(data.entries()) : data;
      const id = decodeURIComponent(url.split("/").at(-2)), order = fields.order === undefined ? server.get(id).order : Number(fields.order);
      calls.push({ id, url, title: fields.title, order, content: fields.content, video: fields.video != null, body: data });
      if (fail?.({ id, order, call: calls.length })) throw new Error("offline");
      if ([...server.values()].some(chapter => chapter.id !== id && chapter.order === order)) throw new Error("Duplicate order");
      const hasVideo = fields.video === null ? false : fields.video ? true : server.get(id).has_video;
      const { video: _video, ...changedFields } = fields;
      server.set(id, { ...server.get(id), ...changedFields, order, has_video: hasVideo });
      return { data: server.get(id) };
    },
    async post(url, data) {
      if (url === "/courses/course-1/chapters/reorder/") {
        calls.push({ id: "reorder", url, body: data });
        if (data.chapters.some(({ id, order }) => fail?.({ id, order, call: calls.length }))) throw new Error("offline");
        assert.equal(new Set(data.chapters.map(chapter => chapter.order)).size, data.chapters.length);
        for (const { id, order } of data.chapters) server.set(id, { ...server.get(id), order });
        return { data: {} };
      }
      if (!viewer || url !== "/students/complete-chapter/") throw new Error("Reordering must not create chapters");
      completions.push(data.chapter_id);
      if (completionFail) throw new Error("Completion unavailable");
      server.set(data.chapter_id, { ...server.get(data.chapter_id), is_completed: true });
      return { data: {} };
    },
    async delete(url) {
      if (url === "/courses/course-1/") {
        courseRequests.push({ method: "DELETE", url });
        if (courseFail) throw new Error("Course delete unavailable");
        return { data: null };
      }
      const id = decodeURIComponent(url.split("/").at(-2)); deletions.push(id); if (deleteFail) throw new Error("Delete unavailable"); server.delete(id);
    },
  };
  const cache = new Map();
  function load(filename) {
    filename = resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = name => {
      if (name === "react") return hooks;
      if (name === "sonner") return { toast: { success: message => notices.push(message), error: message => notices.push(message), info: message => notices.push(message) } };
      if (name === "@/src/utils/connection") return api;
      if (name === "./RichText/RichTextInput") return () => null;
      if (name === "dompurify") return { sanitize: value => value };
      if (name.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) };
      if (name.startsWith("@/")) return load(`${name.slice(2)}.${existsSync(`${name.slice(2)}.ts`) ? "ts" : "tsx"}`);
      if (name.startsWith(".")) return load(resolve(dirname(filename), `${name}.ts`));
      return require(name);
    };
    const browser = automation ? {
      document: browserDocument,
      window: { requestAnimationFrame: callback => callback() },
      IntersectionObserver: FakeIntersectionObserver,
      ResizeObserver: FakeResizeObserver,
      performance: { now: () => now },
      setInterval(callback, period) { const id = ++timerId; timers.set(id, { callback, period, next: now + period }); return id; },
      clearInterval(id) { timers.delete(id); },
    } : {};
    vm.runInNewContext(`(function(require, module, exports) {${compiled}\n})`, { FormData, Error, URL, AbortController, console: { log() {}, error() {} }, ...browser })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  const renderComponent = viewer
    ? load("component/student/StudentCourseViewer.tsx").StudentCourseViewer
    : load("component/CourseEditor.tsx").CourseEditor;
  const render = () => {
    cursor = 0;
    const tree = viewer ? renderComponent({ courseId: "course-1" })
      : renderComponent({ formData: course, isEdit: {}, onCancel() { closed++; }, onSave() { saved++; }, setFormData(data) { course = data; }, setIsEdit() {} });
    if (automation) {
      const footer = nodes(tree).find(node => node.props?.["data-course-completion"]);
      if (footer?.props.ref) footer.props.ref.current = completionTarget;
    }
    return tree;
  };
  const settle = async () => {
    for (let i = 0; i < 4; i++) { await new Promise(setImmediate); render(); for (const effect of effects.splice(0)) effect(); }
    return render();
  };
  render(); for (const effect of effects.splice(0)) effect();
  const replayEffects = () => {
    for (const slot of slots) if (slot?.setup) { slot.cleanup?.(); slot.cleanup = slot.setup(); }
  };
  if (strictEffects) replayEffects();
  let tree = await settle();
  const button = label => nodes(tree).find(node => node.type === "button" && node.props["aria-label"] === label);
  const refresh = async () => { tree = await settle(); return tree; };
  return {
    render: () => tree = render(), refresh, button, nodes: () => nodes(tree), calls, notices, server, deletions, videoRequests, completions, courseRequests, courseLoads, replayEffects,
    setCourse(data) { course = data; return render(); },
    bottomVisible(visible) { for (const observer of observers.filter(item => !item.disconnected)) observer.callback([{ target: observer.target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); },
    bottomBatch(values) { for (const observer of observers.filter(item => !item.disconnected)) observer.callback(values.map(visible => ({ target: observer.target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }))); },
    tabVisible(visible) { browserDocument.visibilityState = visible ? "visible" : "hidden"; for (const listener of visibilityListeners) listener(); },
    resizeHeader(height) { headerHeight = height; for (const observer of resizeObservers.filter(item => !item.disconnected)) observer.callback([]); },
    async advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers.values()].sort((a, b) => a.next - b.next)[0];
        if (!next || next.next > end) break;
        now = next.next; next.next += next.period; next.callback();
      }
      now = end; return refresh();
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    get closed() { return closed; },
    get saved() { return saved; },
    get course() { return course; },
  };
}

test("opening the course editor under Strict Mode sends only one course detail request", async () => {
  const editor = await setup({ strictEffects: true });
  assert.deepEqual(editor.courseLoads, ["/courses/course-1/"]);
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "First"));
});

test("a later course editor load fetches fresh chapter data after the previous request settles", async () => {
  const editor = await setup({ strictEffects: true });
  editor.server.set("a", { ...editor.server.get("a"), title: "Updated on server" });
  editor.replayEffects();
  await editor.refresh();
  assert.equal(editor.courseLoads.length, 2);
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "Updated on server"));
});

test("a late course response cannot overwrite chapters loaded for another course", async () => {
  const pending = new Map();
  const editor = await setup({ courseLoad: url => new Promise(resolve => pending.set(url, resolve)) });
  editor.setCourse({ id: "course-2", title: "Other course" });
  await editor.refresh();
  pending.get("/courses/course-2/")({ data: { id: "course-2", chapters: [{ id: "other", title: "Other chapter", content: "Other lesson", order: 1 }] } });
  await editor.refresh();
  pending.get("/courses/course-1/")({ data: { id: "course-1", chapters: originals } });
  await editor.refresh();
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "Other chapter"));
  assert.equal(editor.nodes().some(node => node.type === "input" && node.props.value === "First"), false);
});

test("editing course details updates the header and preserves unsaved chapter content", async () => {
  const editor = await setup();
  editor.nodes().find(node => node.props?.value === "First lesson" && node.props.onChange).props.onChange("Unsaved lesson");
  editor.render();
  await chapterAction(editor, "Edit course");
  editor.nodes().find(node => node.props?.["aria-label"] === "Course title").props.onChange({ target: { value: "  Updated course  " } });
  editor.nodes().find(node => node.props?.["aria-label"] === "Course description").props.onChange({ target: { value: "New description" } });
  editor.render();
  await editor.button("Save course details").props.onClick();
  await editor.refresh();
  assert.equal(editor.course.title, "Updated course");
  assert.deepEqual(JSON.parse(JSON.stringify(editor.courseRequests)), [{ method: "PUT", url: "/courses/course-1/", body: { title: "Updated course", description: "New description" } }]);
  assert.equal(editor.course.description, "New description");
  assert.ok(editor.nodes().some(node => node.type === "h1" && node.props.children === "Updated course"));
  assert.ok(editor.nodes().some(node => node.props?.value === "Unsaved lesson"));
  assert.equal(editor.server.get("a").content, "First lesson");
  assert.equal(editor.closed + editor.saved, 0);
});

test("course edits send only changed keys and allow clearing description", async () => {
  const editor = await setup();
  await chapterAction(editor, "Edit course");
  editor.nodes().find(node => node.props?.["aria-label"] === "Course title").props.onChange({ target: { value: "Only title changed" } });
  editor.render();
  await editor.button("Save course details").props.onClick();
  await editor.refresh();
  assert.deepEqual(JSON.parse(JSON.stringify(editor.courseRequests[0].body)), { title: "Only title changed" });
  await chapterAction(editor, "Edit course");
  editor.nodes().find(node => node.props?.["aria-label"] === "Course description").props.onChange({ target: { value: "" } });
  editor.render();
  await editor.button("Save course details").props.onClick();
  await editor.refresh();
  assert.deepEqual(JSON.parse(JSON.stringify(editor.courseRequests[1].body)), { description: "" });
  assert.equal(editor.course.title, "Only title changed");
});

test("saving unchanged course and chapter details makes no update requests", async () => {
  const editor = await setup();
  await chapterAction(editor, "Edit course");
  await editor.button("Save course details").props.onClick();
  await editor.refresh();
  await editor.nodes().find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Save Chapter")).props.onClick();
  await editor.refresh();
  await chapterAction(editor, "Rename First");
  await editor.button("Save chapter name").props.onClick();
  await editor.refresh();
  assert.equal(editor.courseRequests.length, 0);
  assert.equal(editor.calls.length, 0);
});

test("chapter updates send only changed text and use the new saved values on subsequent saves", async () => {
  const editor = await setup();
  const save = () => editor.nodes().find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Save Chapter"));
  editor.nodes().find(node => node.type === "input" && node.props.value === "First").props.onChange({ target: { value: "Changed title" } });
  editor.render();
  await save().props.onClick();
  await editor.refresh();
  assert.deepEqual(Object.fromEntries(editor.calls[0].body.entries()), { title: "Changed title" });
  editor.nodes().find(node => node.props?.value === "First lesson" && node.props.onChange).props.onChange("Changed content");
  editor.render();
  await save().props.onClick();
  await editor.refresh();
  assert.deepEqual(Object.fromEntries(editor.calls[1].body.entries()), { content: "Changed content" });
  assert.equal(editor.server.get("a").title, "Changed title");
  assert.equal(editor.server.get("a").order, 1);
});

test("blank course titles do not save and cancel preserves course details", async () => {
  const editor = await setup();
  await chapterAction(editor, "Edit course");
  editor.nodes().find(node => node.props?.["aria-label"] === "Course title").props.onChange({ target: { value: "   " } });
  editor.render();
  assert.equal(editor.button("Save course details").props.disabled, true);
  await editor.button("Save course details").props.onClick();
  await editor.refresh();
  assert.equal(editor.courseRequests.length, 0);
  editor.button("Cancel course action").props.onClick();
  await editor.refresh();
  assert.equal(editor.course.title, "Test");
  assert.equal(editor.nodes().some(node => node.props?.["aria-label"] === "Course title"), false);
});

test("a failed course edit keeps the dialog and entered title available for retry", async () => {
  const editor = await setup({ courseFail: true });
  await chapterAction(editor, "Edit course");
  editor.nodes().find(node => node.props?.["aria-label"] === "Course title").props.onChange({ target: { value: "Retry title" } });
  editor.render();
  await editor.button("Save course details").props.onClick();
  await editor.refresh();
  assert.equal(editor.course.title, "Test");
  assert.ok(editor.nodes().some(node => node.props?.["aria-label"] === "Course title" && node.props.value === "Retry title"));
  assert.ok(editor.nodes().some(node => node.props?.role === "alert"));
  assert.equal(editor.button("Cancel course action").props.disabled, false);
});

test("removing a course requires confirmation and cancel makes no deletion request", async () => {
  const editor = await setup();
  await chapterAction(editor, "Remove course");
  assert.equal(editor.courseRequests.length, 0);
  editor.button("Cancel course action").props.onClick();
  await editor.refresh();
  assert.equal(editor.courseRequests.length, 0);
  await chapterAction(editor, "Remove course");
  await editor.button("Confirm course removal").props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.courseRequests, [{ method: "DELETE", url: "/courses/course-1/" }]);
  assert.equal(editor.saved, 1);
});

test("failed course removal keeps the editor open with a retryable error", async () => {
  const editor = await setup({ courseFail: true });
  await chapterAction(editor, "Remove course");
  await editor.button("Confirm course removal").props.onClick();
  await editor.refresh();
  assert.equal(editor.saved + editor.closed, 0);
  assert.ok(editor.nodes().some(node => node.props?.role === "alert"));
  assert.equal(editor.button("Confirm course removal").props.disabled, false);
});

test("course action dialogs block chapter mutations and duplicate course submissions", async () => {
  const editor = await setup();
  await chapterAction(editor, "Edit course");
  editor.button("Move First down").props.onClick();
  await editor.refresh();
  assert.equal(editor.calls.length, 0);
  editor.nodes().find(node => node.props?.["aria-label"] === "Course title").props.onChange({ target: { value: "Updated title" } });
  editor.render();
  const submit = editor.button("Save course details").props.onClick;
  await Promise.all([submit(), submit()]);
  await editor.refresh();
  assert.equal(editor.courseRequests.length, 1);
});

test("automatic completion shows a countdown and writes once after five visible seconds", async () => {
  const viewer = await setup({ viewer: true, automation: true });
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, []);
  viewer.bottomVisible(true);
  viewer.render();
  assert.ok(viewer.nodes().some(node => node.props?.children === "Completing automatically in 5s"));
  await viewer.advance(4000);
  assert.deepEqual(viewer.completions, []);
  assert.ok(viewer.nodes().some(node => node.props?.children === "Completing automatically in 1s"));
  await viewer.advance(1000);
  assert.deepEqual(viewer.completions, ["a"]);
  assert.equal(viewer.server.get("a").is_completed, true);
  assert.ok(viewer.nodes().some(node => node.props?.["data-completed"] === true));
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, ["a"]);
});

test("automatic completion resets when the bottom or active tab is left", async () => {
  const viewer = await setup({ viewer: true, automation: true });
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  viewer.bottomVisible(false);
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, []);
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  viewer.tabVisible(false);
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, []);
  viewer.tabVisible(true);
  await viewer.advance(4000);
  assert.deepEqual(viewer.completions, []);
  await viewer.advance(1000);
  assert.deepEqual(viewer.completions, ["a"]);
});

test("automatic completion cancels the previous chapter and cleans up on unmount", async () => {
  const viewer = await setup({ viewer: true, automation: true });
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  viewer.nodes().find(node => node.type === "button" && node.key === "b").props.onClick();
  await viewer.refresh();
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, []);
  viewer.bottomVisible(true);
  await viewer.advance(5000);
  assert.deepEqual(viewer.completions, ["b"]);
  viewer.nodes().find(node => node.type === "button" && node.key === "c").props.onClick();
  await viewer.refresh();
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  viewer.unmount();
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, ["b"]);
});

test("automatic completion stops after a failed write and allows manual retry", async () => {
  const viewer = await setup({ viewer: true, automation: true, completionFail: true });
  viewer.bottomVisible(true);
  await viewer.advance(5000);
  assert.deepEqual(viewer.completions, ["a"]);
  assert.equal(viewer.server.get("a").is_completed, false);
  assert.ok(viewer.nodes().some(node => node.props?.role === "alert"));
  viewer.bottomVisible(false); viewer.bottomVisible(true);
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, ["a"]);
  await viewer.nodes().find(node => node.type === "button" && node.props.children?.includes("Mark Chapter Complete")).props.onClick();
  await viewer.refresh();
  assert.deepEqual(viewer.completions, ["a", "a"]);
});

test("automatic completion skips completed chapters and missing progress", async () => {
  for (const options of [{ completed: ["a", "b", "c"] }, { progressFail: true }]) {
    const viewer = await setup({ viewer: true, automation: true, ...options });
    viewer.bottomVisible(true);
    await viewer.advance(10000);
    assert.deepEqual(viewer.completions, []);
  }
});

test("manual completion during the countdown cannot create a duplicate completion write", async () => {
  const viewer = await setup({ viewer: true, automation: true });
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  const saving = viewer.nodes().find(node => node.type === "button" && node.props.children?.includes("Mark Chapter Complete")).props.onClick();
  await viewer.advance(1000);
  await saving;
  await viewer.refresh();
  assert.deepEqual(viewer.completions, ["a"]);
});

test("automatic completion resets its visible time when the sticky header changes size", async () => {
  const viewer = await setup({ viewer: true, automation: true });
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  viewer.resizeHeader(160);
  await viewer.advance(1000);
  assert.deepEqual(viewer.completions, []);
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  assert.deepEqual(viewer.completions, []);
  await viewer.advance(1000);
  assert.deepEqual(viewer.completions, ["a"]);
});

test("automatic completion respects every queued visibility change, including leaving and returning", async () => {
  const viewer = await setup({ viewer: true, automation: true });
  viewer.bottomVisible(true);
  await viewer.advance(4000);
  viewer.bottomBatch([false, true]);
  await viewer.advance(1000);
  assert.deepEqual(viewer.completions, []);
  await viewer.advance(4000);
  assert.deepEqual(viewer.completions, ["a"]);
  const hiddenViewer = await setup({ viewer: true, automation: true });
  hiddenViewer.bottomBatch([true, false]);
  await hiddenViewer.advance(5000);
  assert.deepEqual(hiddenViewer.completions, []);
});

test("video chapters wait for the full video rather than the bottom countdown or manual button", async () => {
  const viewer = await setup({ viewer: true, automation: true, videos: { a: true } });
  viewer.bottomVisible(true);
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, []);
  const button = viewer.nodes().find(node => node.type === "button" && node.props["data-completed"] === false);
  assert.equal(button.props.disabled, true);
  await button.props.onClick();
  assert.deepEqual(viewer.completions, []);
  const player = viewer.nodes().find(node => node.type === "video");
  const skipped = videoElement({ currentTime: 10, ended: true, ranges: [[9, 10]] });
  player.props.onEnded({ currentTarget: skipped });
  await viewer.refresh();
  assert.deepEqual(viewer.completions, []);
  const watched = videoElement({ currentTime: 10, ended: true, ranges: [[0, 10]] });
  viewer.nodes().find(node => node.type === "video").props.onEnded({ currentTarget: watched });
  await viewer.refresh();
  assert.deepEqual(viewer.completions, ["a"]);
  assert.equal(viewer.server.get("a").is_completed, true);
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, ["a"]);
});

test("the video player reports watched progress and restricts seeking to watched sections", async () => {
  const viewer = await setup({ viewer: true, videos: { a: true } });
  const player = viewer.nodes().find(node => node.type === "video");
  assert.equal(typeof player.props.onTimeUpdate, "function");
  const media = videoElement({ currentTime: 2, ranges: [[0, 2]] });
  player.props.onTimeUpdate({ currentTarget: media });
  await viewer.refresh();
  assert.ok(viewer.nodes().some(node => node.props?.children === "20% watched"));
  media.currentTime = 8;
  viewer.nodes().find(node => node.type === "video").props.onSeeking({ currentTarget: media });
  assert.equal(media.currentTime, 2);
  media.currentTime = 1;
  viewer.nodes().find(node => node.type === "video").props.onSeeking({ currentTarget: media });
  assert.equal(media.currentTime, 1);
  assert.deepEqual(viewer.completions, []);
});

test("a late video-ended event from another chapter or replaced player cannot complete the selected chapter", async () => {
  const viewer = await setup({ viewer: true, videos: { a: true, b: true } });
  const previous = viewer.nodes().find(node => node.type === "video");
  assert.equal(typeof previous.props.onEnded, "function");
  viewer.nodes().find(node => node.type === "button" && node.key === "b").props.onClick();
  await viewer.refresh();
  previous.props.onEnded({ currentTarget: videoElement({ currentTime: 10, ended: true, ranges: [[0, 10]] }) });
  await viewer.refresh();
  assert.deepEqual(viewer.completions, []);
  const current = viewer.nodes().find(node => node.type === "video");
  current.props.onError();
  await viewer.refresh();
  current.props.onEnded({ currentTarget: videoElement({ currentTime: 10, ended: true, ranges: [[0, 10]] }) });
  await viewer.refresh();
  assert.deepEqual(viewer.completions, []);
});

test("a failed completion after watching the video keeps manual retry available without automatic retries", async () => {
  const viewer = await setup({ viewer: true, automation: true, videos: { a: true }, completionFail: true });
  const player = viewer.nodes().find(node => node.type === "video");
  assert.equal(typeof player.props.onEnded, "function");
  player.props.onEnded({ currentTarget: videoElement({ currentTime: 10, ended: true, ranges: [[0, 10]] }) });
  await viewer.refresh();
  assert.deepEqual(viewer.completions, ["a"]);
  const retry = viewer.nodes().find(node => node.type === "button" && node.props["data-completed"] === false);
  assert.equal(retry.props.disabled, false);
  viewer.bottomVisible(true);
  await viewer.advance(10000);
  assert.deepEqual(viewer.completions, ["a"]);
  // A later playback failure must not revoke the completed watch requirement.
  viewer.nodes().find(node => node.type === "video").props.onError();
  await viewer.refresh();
  await retry.props.onClick();
  await viewer.refresh();
  assert.deepEqual(viewer.completions, ["a", "a"]);
});

test("already completed video chapters can replay and seek without another completion request", async () => {
  const viewer = await setup({ viewer: true, videos: { a: true }, completed: ["a", "b", "c"] });
  const player = viewer.nodes().find(node => node.type === "video");
  assert.equal(typeof player.props.onSeeking, "function");
  const media = videoElement({ currentTime: 8 });
  player.props.onSeeking({ currentTarget: media });
  assert.equal(media.currentTime, 8);
  player.props.onEnded({ currentTarget: videoElement({ currentTime: 10, ended: true, ranges: [[0, 10]] }) });
  await viewer.refresh();
  assert.deepEqual(viewer.completions, []);
});

test("dropping a saved chapter renumbers the list, preserves selection and draft text, and saves only persisted content", async () => {
  const editor = await setup();
  editor.nodes().find(node => node.type === "button" && node.props["aria-pressed"] === false && nodes(node).some(child => child.props?.children === "Third")).props.onClick();
  editor.render();
  editor.nodes().find(node => node.type === "input" && node.props.value === "Third").props.onChange({ target: { value: "Third draft" } });
  editor.render();
  const transfer = { setData() {}, effectAllowed: "", dropEffect: "" };
  editor.button("Reorder Third draft").props.onDragStart({ dataTransfer: transfer });
  editor.render();
  const row = editor.nodes().find(node => node.key === "a" && node.props.onDrop);
  row.props.onDrop({ preventDefault() {}, clientY: 0, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 80 }) } });
  await editor.refresh();
  assert.deepEqual(editor.nodes().filter(node => node.props?.onDrop).map(node => node.key), ["c", "a", "b"]);
  assert.equal(editor.server.get("c").order, 1);
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "Third draft"));
  assert.equal(editor.server.get("c").content, "Third lesson");
  assert.equal(editor.calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.calls[0].body)), { chapters: [{ id: "c", order: 1 }, { id: "a", order: 2 }, { id: "b", order: 3 }] });
  assert.ok(editor.notices.includes("Chapter order saved"));
});

test("keyboard and touch controls move chapters and keep boundary moves disabled", async () => {
  const editor = await setup();
  assert.equal(editor.button("Move First up").props.disabled, true);
  assert.equal(editor.button("Move Third down").props.disabled, true);
  editor.button("Reorder First").props.onKeyDown({ key: "ArrowDown", preventDefault() {} });
  await editor.refresh();
  assert.deepEqual(editor.nodes().filter(node => node.props?.onDrop).map(node => node.key), ["b", "a", "c"]);
  editor.button("Move Third up").props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.nodes().filter(node => node.props?.onDrop).map(node => node.key), ["b", "c", "a"]);
});

test("a failed save restores the visible order and shows a useful error", async () => {
  let failed = false;
  const editor = await setup({ fail: ({ id, order }) => { if (id === "c" && order === 2 && !failed) { failed = true; return true; } return false; } });
  editor.button("Move Third up").props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.nodes().filter(node => node.props?.onDrop).map(node => node.key), ["a", "b", "c"]);
  assert.ok(editor.nodes().some(node => node.props?.role === "alert"));
  assert.equal(editor.button("Move Third up").props.disabled, false);
});

test("failed recovery disables further writes until the current server order is reloaded", async () => {
  const editor = await setup({ fail: () => true });
  editor.button("Move Third up").props.onClick();
  await editor.refresh();
  assert.equal(editor.button("Move Third up").props.disabled, true);
  const reload = editor.nodes().find(node => node.type === "button" && node.props.children === "Reload order");
  await reload.props.onClick();
  await editor.refresh();
  assert.equal(editor.button("Move Third up").props.disabled, false);
});

test("deleting a saved chapter removes its server position before remaining chapters are renumbered", async () => {
  const editor = await setup();
  await chapterAction(editor, "Delete Second");
  await editor.button("Confirm chapter deletion").props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.deletions, ["b"]);
  assert.equal(editor.server.has("b"), false);
  editor.button("Move Third up").props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.nodes().filter(node => node.props?.onDrop).map(node => node.key), ["c", "a"]);
  assert.deepEqual([...editor.server.values()].sort((a, b) => a.order - b.order).map(chapter => chapter.order), [1, 2]);
});

test("renaming a saved chapter uses its PUT URL and preserves draft content and video", async () => {
  const editor = await setup({ videos: { a: true } });
  editor.nodes().find(node => node.props?.value === "First lesson" && node.props.onChange).props.onChange("Draft lesson");
  editor.render();
  editor.nodes().find(node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [new File(["replacement"], "draft.mp4")] } });
  await editor.refresh();
  await chapterAction(editor, "Rename First");
  editor.nodes().find(node => node.props?.["aria-label"] === "Chapter name").props.onChange({ target: { value: "  New chapter name  " } });
  editor.render();
  await editor.button("Save chapter name").props.onClick();
  await editor.refresh();
  assert.equal(editor.calls.length, 1);
  assert.equal(editor.calls[0].url, "/courses/course-1/chapters/a/");
  assert.equal(editor.calls[0].title, "New chapter name");
  assert.deepEqual(JSON.parse(JSON.stringify(editor.calls[0].body)), { title: "New chapter name" });
  assert.equal(editor.server.get("a").content, "First lesson");
  assert.equal(editor.calls[0].video, false);
  assert.equal(editor.server.get("a").has_video, true);
  assert.ok(editor.nodes().some(node => node.props?.value === "Draft lesson"));
  assert.ok(editor.nodes().some(node => node.props?.children === "draft.mp4"));
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "New chapter name"));
});

test("renaming another chapter preserves the current chapter selection and unsaved title", async () => {
  const editor = await setup();
  editor.nodes().find(node => node.type === "input" && node.props.value === "First").props.onChange({ target: { value: "First draft" } });
  editor.render();
  await chapterAction(editor, "Rename Second");
  editor.nodes().find(node => node.props?.["aria-label"] === "Chapter name").props.onChange({ target: { value: "Second renamed" } });
  editor.render();
  await editor.button("Save chapter name").props.onClick();
  await editor.refresh();
  assert.equal(editor.server.get("b").title, "Second renamed");
  assert.equal(editor.server.get("a").title, "First");
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "First draft"));
});

test("a failed chapter rename leaves the original chapter and rename dialog intact", async () => {
  const editor = await setup({ fail: () => true });
  await chapterAction(editor, "Rename Second");
  editor.nodes().find(node => node.props?.["aria-label"] === "Chapter name").props.onChange({ target: { value: "Second renamed" } });
  editor.render();
  await editor.button("Save chapter name").props.onClick();
  await editor.refresh();
  assert.equal(editor.server.get("b").title, "Second");
  assert.ok(editor.nodes().some(node => node.props?.["aria-label"] === "Chapter name" && node.props.value === "Second renamed"));
  assert.ok(editor.nodes().some(node => node.props?.role === "alert"));
  editor.button("Cancel chapter action").props.onClick();
  await editor.refresh();
  assert.equal(editor.button("Move First down").props.disabled, false);
});

test("chapter deletion requires confirmation and cancellation makes no requests", async () => {
  const editor = await setup();
  await chapterAction(editor, "Delete Second");
  assert.deepEqual(editor.deletions, []);
  assert.equal(editor.calls.length, 0);
  editor.button("Cancel chapter action").props.onClick();
  await editor.refresh();
  assert.equal(editor.server.has("b"), true);
  assert.deepEqual(editor.deletions, []);
});

test("the final saved chapter can be deleted and the empty editor remains usable", async () => {
  const editor = await setup();
  for (const title of ["Third", "Second", "First"]) {
    await chapterAction(editor, `Delete ${title}`);
    await editor.button("Confirm chapter deletion").props.onClick();
    await editor.refresh();
  }
  assert.deepEqual(editor.deletions, ["c", "b", "a"]);
  assert.equal(editor.server.size, 0);
  assert.ok(editor.nodes().some(node => node.props?.children === "No chapter selected"));
  assert.ok(editor.nodes().some(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Add Chapter") && node.props.disabled === false));
});

test("a failed chapter deletion keeps the chapter and allows closing the dialog to reload", async () => {
  const editor = await setup({ deleteFail: true });
  await chapterAction(editor, "Delete Second");
  await editor.button("Confirm chapter deletion").props.onClick();
  await editor.refresh();
  assert.equal(editor.server.has("b"), true);
  assert.equal(editor.button("Cancel chapter action").props.disabled, false);
  assert.ok(editor.nodes().some(node => node.props?.role === "alert"));
  editor.button("Cancel chapter action").props.onClick();
  await editor.refresh();
  await editor.nodes().find(node => node.type === "button" && node.props.children === "Reload order").props.onClick();
  await editor.refresh();
  assert.equal(editor.button("Move First down").props.disabled, false);
});

test("a draft chapter can be renamed locally without PUT before its initial save", async () => {
  const editor = await setup();
  editor.nodes().find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Add Chapter")).props.onClick();
  await editor.refresh();
  await chapterAction(editor, "Rename Chapter 4");
  editor.nodes().find(node => node.props?.["aria-label"] === "Chapter name").props.onChange({ target: { value: "New draft name" } });
  editor.render();
  await editor.button("Save chapter name").props.onClick();
  await editor.refresh();
  assert.equal(editor.calls.length, 0);
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "New draft name"));
});

test("discarding a draft moved to first renumbers and saves the remaining chapters", async () => {
  const editor = await setup();
  editor.nodes().find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Add Chapter")).props.onClick({ preventDefault() {}, stopPropagation() {} });
  editor.render();
  editor.button("Reorder Chapter 4").props.onDragStart({ dataTransfer: { setData() {} } });
  editor.render();
  editor.nodes().find(node => node.key === "a" && node.props.onDrop).props.onDrop({ preventDefault() {}, clientY: 0, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 80 }) } });
  await editor.refresh();
  editor.nodes().find(node => node.type === "button" && node.props["aria-pressed"] === false && nodes(node).some(child => child.props?.children === "First")).props.onClick();
  editor.render();
  await editor.nodes().find(node => node.type === "button" && node.props.children === "Discard Changes").props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.nodes().filter(node => node.props?.onDrop).map(node => node.key), ["a", "b", "c"]);
  assert.deepEqual([...editor.server.values()].map(chapter => chapter.order), [1, 2, 3]);
  assert.equal(editor.deletions.length, 0);
});

test("the unsaved-changes dialog blocks chapter moves until it is resolved", async () => {
  const editor = await setup();
  editor.nodes().find(node => node.type === "input" && node.props.value === "First").props.onChange({ target: { value: "First draft" } });
  editor.render();
  editor.nodes().find(node => node.type === "button" && node.props["aria-pressed"] === false && nodes(node).some(child => child.props?.children === "Second")).props.onClick();
  editor.render();
  editor.button("Move Third up").props.onClick();
  await editor.refresh();
  assert.equal(editor.calls.length, 0);
  assert.ok(editor.nodes().some(node => node.type === "input" && node.props.value === "First draft"));
});

test("failed order recovery during draft discard keeps the editor open for reload", async () => {
  let rejectWrites = false;
  const editor = await setup({ fail: () => rejectWrites });
  editor.nodes().find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Add Chapter")).props.onClick({ preventDefault() {}, stopPropagation() {} });
  editor.render();
  editor.button("Reorder Chapter 4").props.onDragStart({ dataTransfer: { setData() {} } });
  editor.render();
  editor.nodes().find(node => node.key === "a" && node.props.onDrop).props.onDrop({ preventDefault() {}, clientY: 0, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 80 }) } });
  await editor.refresh();
  editor.nodes().find(node => node.type === "button" && node.props.children?.props?.className?.includes("rotate-180")).props.onClick();
  editor.render();
  rejectWrites = true;
  await editor.nodes().find(node => node.type === "button" && node.props.children === "Discard Changes").props.onClick();
  await editor.refresh();
  assert.equal(editor.closed, 0);
  assert.ok(editor.nodes().some(node => node.type === "button" && node.props.children === "Reload order"));
  assert.equal(editor.nodes().some(node => node.type === "button" && node.props.children === "Discard Changes"), false);
});

test("the editor uses has_video and loads a saved video's URL only when its chapter is selected", async () => {
  const editor = await setup({ videos: { b: true } });
  assert.equal(editor.videoRequests.length, 0);
  assert.equal(editor.nodes().some(node => node.type === "video"), false);
  assert.ok(editor.nodes().some(node => node.props?.children === "Video attached"));
  editor.nodes().find(node => node.type === "button" && node.props["aria-pressed"] === false && nodes(node).some(child => child.props?.children === "Second")).props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.videoRequests, ["b"]);
  assert.equal(editor.nodes().find(node => node.type === "video").props.src, "https://cdn.example.com/b.mp4?version=1");
  const player = editor.nodes().find(node => node.type === "video");
  assert.equal(player.props.controlsList, "nodownload");
  let contextMenuBlocked = false;
  player.props.onContextMenu({ preventDefault() { contextMenuBlocked = true; } });
  assert.equal(contextMenuBlocked, true);
});

test("editor video retries fetch a fresh URL and selecting a replacement file hides the stored video", async () => {
  const editor = await setup({ videos: { a: true } });
  editor.nodes().find(node => node.type === "video").props.onError();
  editor.render();
  editor.nodes().find(node => node.type === "button" && node.props.children === "Retry video").props.onClick();
  await editor.refresh();
  assert.equal(editor.nodes().find(node => node.type === "video").props.src, "https://cdn.example.com/a.mp4?version=2");
  editor.nodes().find(node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [new File(["video"], "replacement.mp4")] } });
  await editor.refresh();
  assert.equal(editor.nodes().some(node => node.type === "video"), false);
  assert.equal(editor.videoRequests.length, 2);
});

test("the student viewer requests video only for the selected chapter with has_video true", async () => {
  const editor = await setup({ viewer: true, videos: { b: true } });
  assert.equal(editor.videoRequests.length, 0);
  editor.nodes().find(node => node.type === "button" && node.key === "b").props.onClick();
  await editor.refresh();
  assert.deepEqual(editor.videoRequests, ["b"]);
  assert.equal(editor.nodes().find(node => node.type === "video").props.src, "https://cdn.example.com/b.mp4?version=1");
  const player = editor.nodes().find(node => node.type === "video");
  assert.equal(player.props.controlsList, "nodownload");
  let contextMenuBlocked = false;
  player.props.onContextMenu({ preventDefault() { contextMenuBlocked = true; } });
  assert.equal(contextMenuBlocked, true);
  editor.nodes().find(node => node.type === "button" && node.key === "c").props.onClick();
  editor.render();
  assert.equal(editor.nodes().some(node => node.type === "video"), false);
  await editor.refresh();
  assert.equal(editor.videoRequests.length, 1);
});

test("video removal stays pending, can be undone, and saves video null through the chapter PUT", async () => {
  const editor = await setup({ videos: { a: true } });
  editor.nodes().find(node => node.type === "button" && node.props["aria-label"] === "Remove attached video").props.onClick();
  await editor.refresh();
  assert.equal(editor.nodes().some(node => node.type === "video"), false);
  assert.equal(editor.calls.length, 0);
  editor.nodes().find(node => node.type === "button" && node.props.children === "Undo removal").props.onClick();
  await editor.refresh();
  assert.ok(editor.nodes().some(node => node.type === "video"));
  editor.nodes().find(node => node.type === "button" && node.props["aria-label"] === "Remove attached video").props.onClick();
  await editor.refresh();
  await editor.nodes().find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Save Chapter")).props.onClick();
  await editor.refresh();
  assert.equal(editor.calls.at(-1).body.video, null);
  assert.equal(editor.server.get("a").has_video, false);
  assert.equal(editor.nodes().some(node => node.type === "video"), false);
});

test("selecting and saving a replacement video updates the existing chapter's video file", async () => {
  const editor = await setup({ videos: { a: true } });
  editor.nodes().find(node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [new File(["new-video"], "replacement.mp4")] } });
  await editor.refresh();
  assert.equal(editor.nodes().some(node => node.type === "video"), false);
  await editor.nodes().find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Save Chapter")).props.onClick();
  await editor.refresh();
  assert.equal(editor.calls.at(-1).body.get("video").name, "replacement.mp4");
  assert.equal(editor.calls.at(-1).body.has("media_url"), false);
  assert.equal(editor.server.get("a").has_video, true);
  assert.ok(editor.nodes().some(node => node.type === "video"));
});

test("video-only changes trigger the unsaved-changes dialog and discard restores the attached video", async () => {
  const editor = await setup({ videos: { a: true } });
  editor.nodes().find(node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [new File(["video"], "replacement.mp4")] } });
  await editor.refresh();
  editor.nodes().find(node => node.type === "button" && node.props["aria-pressed"] === false && nodes(node).some(child => child.props?.children === "Second")).props.onClick();
  editor.render();
  const discard = editor.nodes().find(node => node.type === "button" && node.props.children === "Discard Changes");
  assert.ok(discard);
  await discard.props.onClick();
  await editor.refresh();
  assert.equal(editor.calls.length, 0);
  assert.equal(editor.server.get("a").has_video, true);
  editor.nodes().find(node => node.type === "button" && node.props["aria-pressed"] === false && nodes(node).some(child => child.props?.children === "First")).props.onClick();
  await editor.refresh();
  assert.ok(editor.nodes().some(node => node.type === "video"));
  assert.equal(editor.nodes().some(node => node.props?.children === "replacement.mp4"), false);
});

test("reordering keeps a pending video removal local until Save Chapter", async () => {
  const editor = await setup({ videos: { a: true } });
  editor.nodes().find(node => node.type === "button" && node.props["aria-label"] === "Remove attached video").props.onClick();
  await editor.refresh();
  editor.button("Move First down").props.onClick();
  await editor.refresh();
  assert.equal(editor.server.get("a").has_video, true);
  assert.ok(editor.calls.every(call => call.body.chapters.every(chapter => Object.keys(chapter).sort().join() === "id,order")));
  assert.ok(editor.nodes().some(node => node.props?.children === "Video removal is pending. Save Chapter to apply it."));
});
