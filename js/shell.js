
const Shell = (function () {
  "use strict";

  const main = document.getElementById("main");
  let settings = null;   // what the page handed to init()
  let list = [];         // this page's tasks, in teaching order
  const drawers = {};    // the function that draws each task type
  let current = null;    // on a task page: the task, and its place in the list

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

    // The strand a task belongs to: the one with the same task type and,
  // if the strand names a world, the same world.
  function strandFor(entry) {
    return settings.strands.find((strand) => strand.type === entry.type && (!strand.world || strand.world === entry.world));
  }

  // A task is in round two when its strand's roundTwo list names it.
  function isRoundTwo(entry) {
    const round = strandFor(entry).roundTwo;
    return Boolean(round) && round.ids.includes(entry.id);
  }

  // 7 gives "07", so that every task number has two digits.
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // ---------- for the task types ----------

  // A task type's file hands over the function that draws it:
  // Shell.addType("walkthrough", draw). When a task of that type opens,
  // the shell calls draw(task, area). area is the empty right-hand column.
  function addType(type, draw) {
    drawers[type] = draw;
  }

  // Draw the task itself, or a note if its task type has no file yet.
  function drawTask(task) {
    const area = document.getElementById("task-area");
    const draw = drawers[task.type];
    if (draw) {
      draw(task, area);
    } else {
      area.appendChild(Dom.make("p", "not-ready", "This part of the page is still being built."));
    }
  }

  // The box across the page, above the two columns. It stays hidden
  // until a task type asks for it.
  function stage() {
    const box = document.getElementById("task-stage");
    box.hidden = false;
    return box;
  }

  // The heading of the result box for each kind of result.
  const HEADINGS = { good: "Well done", bad: "Not there yet", neutral: "Note" };

  // Show a result under the task. kind is "good", "bad" or "neutral".
  // Gives back the box, so that taskPassed() can add a link to it.
  function showVerdict(kind, message, heading) {
    const box = document.getElementById("task-result");
    box.className = "result " + kind;
    Dom.clear(box);
    box.append(Dom.make("h3", null, heading || HEADINGS[kind]), Dom.make("p", null, message));
    box.scrollIntoView({ block: "nearest" });
    return box;
  }

  // Empty the result box and hide it again.
  function clearVerdict() {
    const box = document.getElementById("task-result");
    box.className = "result";
    Dom.clear(box);
  }

  // The task is complete: save that, say so, and show the way on.
  // Calling it again does no harm: a passed task stays passed.
  function taskPassed(message) {
    Progress.markPassed(current.task.id, current.task);
    const next = list[current.at + 1];
    const link = Dom.make("a", "button primary", next ? `Next: task ${current.at + 2}, ${next.title} →` : "Back to all tasks →");
    link.href = next ? urlFor(next) : settings.page;
    const line = Dom.make("p", "next");
    line.appendChild(link);
    showVerdict("good", message, "Task complete").appendChild(line);
  }

  // ---------- start ----------

  // The task id in the address: "web-w6-01" for "practice-web.html?task=web-w6-01",
  // or null when the address has no ?task= part.
  function taskIdFromUrl() {
    return new URLSearchParams(window.location.search).get("task");
  }

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
               // Keep the tasks that belong to one of this page's strands, in the
        // order of the index.
        list = Tasks.flatList(index).filter((entry) => Boolean(strandFor(entry)));
        if (list.length === 0) {
          throw new Error("tasks/index.json has no tasks for this page yet.");
        }
        // The address chooses the screen: one task, or the list.
        const at = list.findIndex((entry) => entry.id === taskIdFromUrl());
        if (at === -1) {
          // Flip cards, unless the page handed over another list screen.
          const screen = settings.listScreen || TaskList;
          screen.draw(main, settings, list);
          return;
        }
        return Tasks.loadTask(list[at].id).then(function (task) {
          current = { task: task, at: at };
          TaskPage.draw(main, settings, list, task, at);
          Progress.markStarted(task.id, task);
          drawTask(task);
        });
      })
      .catch(function (error) {
        console.error(error);   // the red line in the browser's Console, with the file and line
        errorPage(error.message);
      });
  }

  // The names the two screens, the page and the task types can use.
  return {
    init: init,
    urlFor: urlFor,
    isDone: isDone,
    strandFor: strandFor,
    isRoundTwo: isRoundTwo,
    pad2: pad2,
    addType: addType,
    stage: stage,
    showVerdict: showVerdict,
    clearVerdict: clearVerdict,
    taskPassed: taskPassed
  };
})();