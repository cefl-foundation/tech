
const TaskRows = (function () {
  "use strict";

  function draw(main, settings, list) {
    const done = list.filter((entry) => Shell.isDone(entry.id)).length;
    const next = list.find((entry) => !Shell.isDone(entry.id));   // the first task that is not done, if there is one

    let groups = "";
    for (const strand of settings.strands) {
      groups += groupHtml(strand, list);
    }
    main.innerHTML = `
      ${headHtml(settings, list, done, next)}
      <section class="tasklist">
        <div class="wrap">${groups}</div>
      </section>`;
  }

  // The red band at the top: the page's words, how many tasks are done,
  // and a link to the next one.
  function headHtml(settings, list, done, next) {
    let go = "";
    if (next) {
      const words = done === 0 ? "Start at task 1" : `Next: task ${list.indexOf(next) + 1}`;
      go = `<a class="chip" href="${Dom.esc(Shell.urlFor(next))}">${words}</a>`;
    }
    return `
      <section class="pagehead">
        <div class="wrap">
          <p class="eyebrow">${Dom.esc(settings.eyebrow)}</p>
          <h1>${Dom.esc(settings.title)}</h1>
          <p class="lede">${Dom.esc(settings.lede)}</p>
          <p class="chips"><span class="chip on">${done} of ${list.length} done</span> ${go}</p>
        </div>
      </section>`;
  }

  // One group: a strand's heading and text, then a row for each of its
  // tasks. A strand with no tasks yet is left out.
  function groupHtml(strand, list) {
    const mine = list.filter((entry) => Shell.strandFor(entry) === strand);
    if (mine.length === 0) { return ""; }
    let rows = "";
    for (const entry of mine) {
      const done = Shell.isDone(entry.id);
      // The number is the task's place on the whole page, so it goes on
      // counting from one group to the next.
      rows += `
        <li>
          <a class="trow${done ? " done" : ""}" href="${Dom.esc(Shell.urlFor(entry))}">
            <span class="n"><span class="visually-hidden">Task </span>${list.indexOf(entry) + 1}</span>
            <span>
              <span class="t">${Dom.esc(entry.title)}</span>
              <span class="c">${Dom.esc(entry.concept)}</span>
            </span>
            <span class="s">${done ? "Done" : "To do"}</span>
          </a>
        </li>`;
    }
    return `
      <div class="group" id="${Dom.esc(strand.key)}">
        <div class="group-head">
          <div>
            <p class="sub">${Dom.esc(strand.sub)}</p>
            <h2>${Dom.esc(strand.title)}</h2>
          </div>
          <p class="text">${Dom.esc(strand.text)}</p>
        </div>
        <ul>${rows}</ul>
      </div>`;
  }

  // Only draw() can be seen from outside this file.
  return { draw: draw };
})();