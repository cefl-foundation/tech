/*
  js/progress.js - remembers a student's work in this browser only.

  Everything is kept under one key in localStorage, "tech-hub-progress-v1",
  as one object with an entry for each task the student has opened:

    {
      "web-w6-01": {
        "title": "Page structure and headings",
        "week": 6,
        "status": "passed",                      "started" or "passed"
        "attempts": 2,                           how many times Check or Run was pressed
        "firstPassedAt": "2026-11-20T10:12:00.000Z",
        "updatedAt": "2026-11-20T10:12:00.000Z",
        "lastCode": "<h1>My page</h1>",          what is in the code box
        "data": { "html": "<h1>My page</h1>" }   the student's answers
      }
    }

  Nothing here is sent anywhere. A browser can refuse to save (a private
  window, a locked-down computer), so every read and write is wrapped in
  try and catch, and the site keeps working with nothing saved.

  Pages use one name from this file: Progress.
*/

// Make a progress store that keeps its data in `storage`. On the site that
// is the browser's localStorage. In the tests it is a fake.
function makeProgress(storage) {
  "use strict";

  // Both hubs will live at cefl-foundation.github.io and share one
  // localStorage, so the key names this site. v1 is the shape of the data.
  const KEY = "tech-hub-progress-v1";

  // ---------- can this browser save? ----------

  // Try one small write. It fails when the browser refuses to save, and
  // when there is no storage at all (storage is null).
  function trySaving() {
    try {
      storage.setItem(KEY + "-check", "1");
      storage.removeItem(KEY + "-check");
      return true;
    } catch (error) {
      return false;
    }
  }

  const canSave = trySaving();

  // true if this browser lets the site save, false if it does not.
  function available() {
    return canSave;
  }

  // ---------- the whole object, in and out of storage ----------

  // localStorage holds only text. JSON.parse turns the saved text back
  // into an object. Nothing saved yet, or broken text, gives {}.
  function load() {
    try {
      const text = storage.getItem(KEY);
      const data = text ? JSON.parse(text) : {};
      return (data && typeof data === "object") ? data : {};
    } catch (error) {
      return {};
    }
  }

  // JSON.stringify turns the object into text, ready to store.
  // Returns false if the browser refused to save it.
  function save(data) {
    try {
      storage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  }

  // ---------- one task's entry ----------

  // The time now as text, such as "2026-11-20T10:12:00.000Z".
  function now() {
    return new Date().toISOString();
  }

  // The entry for one task inside data, made if it is not there yet.
  // A new entry starts as "started". The title and week are copied from
  // the task, so the saved data makes sense on its own.
  function entryFor(data, taskId, task) {
    if (!data[taskId]) {
      data[taskId] = { title: "", week: null, status: "started", attempts: 0, firstPassedAt: null };
    }
    const entry = data[taskId];
    if (task) {
      entry.title = task.title || entry.title;
      if (task.week != null) { entry.week = task.week; }
    }
    entry.updatedAt = now();
    return entry;
  }

  // What is saved for one task, or null if nothing is.
  function get(taskId) {
    return load()[taskId] || null;
  }

  // ---------- task status ----------

  // The student opened the task. A passed task stays passed.
  function markStarted(taskId, task) {
    const data = load();
    entryFor(data, taskId, task);
    save(data);
  }

  // The student pressed Check (or Run): one more try.
  function recordAttempt(taskId, task) {
    const data = load();
    const entry = entryFor(data, taskId, task);
    entry.attempts += 1;
    save(data);
  }

  // The student passed the task. The time of the first pass is kept,
  // even when the task is passed again later.
  function markPassed(taskId, task) {
    const data = load();
    const entry = entryFor(data, taskId, task);
    entry.status = "passed";
    if (!entry.firstPassedAt) { entry.firstPassedAt = now(); }
    save(data);
  }

  // Only these names can be seen from outside makeProgress.
  return {
    available: available,
    get: get,
    markStarted: markStarted,
    recordAttempt: recordAttempt,
    markPassed: markPassed
  };
}

// ---------- the store the pages use ----------

// The browser's localStorage, or null if the browser refuses it: even
// reading window.localStorage fails when saving is blocked. In Node, where
// the tests run, there is no window at all, so the answer is null there too.
function browserStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

const Progress = makeProgress(browserStorage());