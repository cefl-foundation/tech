
const Tasks = (function () {
  "use strict";

  // Where tasks/ is, worked out from the address of this file:
  // js/tasks.js -> ../tasks/. Right on GitHub Pages (/tech/), on the Mac,
  // and from a page in any folder.
  const TASKS_BASE = new URL("../tasks/", document.currentScript.src).href;

  let indexCache = null;   // the index, once it has arrived
  const taskCache = new Map();   // each task file, once it has arrived

  // Ask the server for a JSON file and turn its text into an object.
  function fetchJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load " + url + " (" + response.status + ")");
      }
      return response.json();
    });
  }

  // The index. Fetched once; after that the saved copy is used.
  function loadIndex() {
    if (indexCache) { return Promise.resolve(indexCache); }
    return fetchJson(TASKS_BASE + "index.json").then(function (index) {
      indexCache = index;
      return index;
    });
  }

  // Every task of every week in one list, in the order of the index.
  // Each entry also says which week it belongs to.
  function flatList(index) {
    const list = [];
    for (const week of index.weeks || []) {
      for (const entry of week.tasks || []) {
                list.push({ id: entry.id, type: entry.type, world: entry.world, file: entry.file, title: entry.title, concept: entry.concept, week: week.week });
      }
    }
    return list;
  }

  // The tasks just before and just after one task, in the whole list.
  // null where there is none: the first task has no previous one.
  function neighbours(index, id) {
    const list = flatList(index);
    const at = list.findIndex(function (entry) { return entry.id === id; });
    return {
      prev: at > 0 ? list[at - 1] : null,
      next: at >= 0 && at < list.length - 1 ? list[at + 1] : null
    };
  }

  // One task's own file, found through the index.
  function loadTask(id) {
    if (taskCache.has(id)) { return Promise.resolve(taskCache.get(id)); }
    return loadIndex().then(function (index) {
      const entry = flatList(index).find(function (e) { return e.id === id; });
      if (!entry) { throw new Error("There is no task called " + id + "."); }
      return fetchJson(TASKS_BASE + entry.file);
    }).then(function (task) {
      taskCache.set(id, task);
      return task;
    });
  }

  // The questions of the quick vocabulary practice. A page asks for them
  // once, so no copy is kept.
  function loadQuiz() {
    return fetchJson(TASKS_BASE + "quiz.json");
  }

  // Only these five names can be seen from outside this file.
  return { loadIndex: loadIndex, flatList: flatList, neighbours: neighbours, loadTask: loadTask, loadQuiz: loadQuiz };
})();