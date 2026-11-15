
const Shell = (function () {
  "use strict";

  const main = document.getElementById("main");
  let settings = null;   // what the page handed to init()
  let list = [];         // this page's tasks, in teaching order

  // ---------- helpers for both screens ----------

  // The address of one task: "practice-web.html?task=web-w6-01".
  function urlFor(entry) {
    return `${settings.page}?task=${encodeURIComponent(entry.id)}`;
  }

  // A task is done when its saved status is "passed".
  function isDone(id) {
    const saved = Progress.get(id);
    return Boolean(saved) && saved.status === "passed";
  }

  // 7 gives "07", so that every task number has two digits.
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // ---------- start ----------

  // Shown when the tasks cannot be loaded.
  function errorPage(message) {
    main.innerHTML = `
      <section class="notice">
        <div class="wrap">
          <h1>Could not load the tasks</h1>
          <p>${Dom.esc(message)}</p>
          <p>If you opened this page from a folder on your computer, open it from a web server instead (python3 -m http.server 8000).</p>
          <p><a class="button primary" href="${Dom.esc(settings.page)}">Try again</a> <a class="button" href="index.html">Back to the hub</a></p>
        </div>
      </section>`;
  }

  function init(pageSettings) {
    settings = pageSettings;
    Tasks.loadIndex()
      .then(function (index) {
        // Keep this page's task types only, in the order of the index.
        const types = settings.strands.map((strand) => strand.type);
        list = Tasks.flatList(index).filter((entry) => types.includes(entry.type));
        if (list.length === 0) {
          throw new Error("tasks/index.json has no tasks for this page yet.");
        }
        TaskList.draw(main, settings, list);
      })
      .catch(function (error) {
        console.error(error);   // the red line in the browser's Console, with the file and line
        errorPage(error.message);
      });
  }

  // The names the screens and the page can use.
  return {
    init: init,
    urlFor: urlFor,
    isDone: isDone,
    pad2: pad2
  };
})();