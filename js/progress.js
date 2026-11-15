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

  // ---------- code and answers ----------

  // A code box calls saveCode() at every key press. Writing to storage each
  // time would be wasteful, so changes wait here and are written once the
  // student has stopped typing for DELAY milliseconds.
  const DELAY = 400;
  let waiting = {};   // changes not written yet, by task id
  let timer = null;

  // Start the wait again: each key press puts the save off by DELAY.
  function restartTimer() {
    clearTimeout(timer);
    timer = setTimeout(flush, DELAY);
  }

  // The waiting change for one task, made the first time it is needed.
  function waitingFor(taskId, task) {
    if (!waiting[taskId]) { waiting[taskId] = { task: task }; }
    return waiting[taskId];
  }

  // The student typed in a code box.
  function saveCode(taskId, task, code) {
    waitingFor(taskId, task).code = code;
    restartTimer();
  }

  // The student changed an answer: ticked a box, chose from a list, typed
  // in a box. `answers` holds only what changed, such as { html: "<p>Hi</p>" }.
  function saveData(taskId, task, answers) {
    const change = waitingFor(taskId, task);
    change.data = Object.assign(change.data || {}, answers);
    restartTimer();
  }

  // Write every waiting change now. The timer calls this, and so does the
  // page when the student leaves it.
  function flush() {
    clearTimeout(timer);
    const ids = Object.keys(waiting);
    if (ids.length === 0) { return; }
    const data = load();
    for (const taskId of ids) {
      const change = waiting[taskId];
      const entry = entryFor(data, taskId, change.task);
      if (change.code !== undefined) { entry.lastCode = change.code; }
      if (change.data) { entry.data = Object.assign(entry.data || {}, change.data); }
    }
    waiting = {};
    save(data);
  }

  // The answers saved for one task, or {} if there are none.
  function getData(taskId) {
    const entry = get(taskId);
    return (entry && entry.data) ? entry.data : {};
  }

  // ---------- the home page ----------

  // How many tasks are passed in each week of the task list:
  // [{ week: 6, title: "...", done: 3, total: 11 }, ...]
  function summary(index) {
    const data = load();
    const rows = [];
    for (const week of index.weeks) {
      let done = 0;
      for (const task of week.tasks) {
        if (data[task.id] && data[task.id].status === "passed") { done += 1; }
      }
      rows.push({ week: week.week, title: week.title, done: done, total: week.tasks.length });
    }
    return rows;
  }

  // ---------- starting again ----------

  // Remove everything this site has saved in this browser, and drop the
  // changes still waiting, so nothing comes back DELAY ms later. Only this
  // site's key goes, never storage.clear(): that would empty the other hub.
  // Returns true if it worked.
  function clearAll() {
    clearTimeout(timer);
    waiting = {};
    try {
      storage.removeItem(KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Only these names can be seen from outside makeProgress.
  return {
    available: available,
    get: get,
    markStarted: markStarted,
    recordAttempt: recordAttempt,
    markPassed: markPassed,
    saveCode: saveCode,
    saveData: saveData,
    getData: getData,
    flush: flush,
    summary: summary,
    clearAll: clearAll
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

// A change still waiting when the student leaves the page is written at once.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", Progress.flush);
}

// In the browser this line does nothing. In Node it hands makeProgress to the tests.
if (typeof module !== "undefined") {
  module.exports = { makeProgress: makeProgress };
}