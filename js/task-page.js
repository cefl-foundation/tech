
const TaskPage = (function () {
  "use strict";

  let main = null;       // the <main> element to draw into
  let settings = null;   // the page's settings
  let list = [];         // the page's tasks, in teaching order

  // The group a task belongs to: its strand, or the strand's round two
  // when roundTwo names the task. Both have a title and a text.
  function groupFor(entry) {
    const strand = Shell.strandFor(entry);
    return Shell.isRoundTwo(entry) ? strand.roundTwo : strand;
  }

  function draw(mainElement, pageSettings, tasks, task, at) {
    main = mainElement;
    settings = pageSettings;
    list = tasks;

    const group = groupFor(list[at]);
    document.title = `${task.title} - Tech Practice Hub`;
    main.innerHTML = `
      ${taskBarHtml(task, at, group)}
      <div class="wrap">
        <div class="task-stage" id="task-stage" hidden></div>
      </div>
      <div class="wrap task">
        <div class="brief">
          <p class="scene">${Dom.esc(group.text)}</p>
          ${group.watch ? watchNoteHtml(group.watch) : ""}
          <h2>Your brief</h2>
          ${briefHtml(task)}
          ${wordBankHtml(task.vocabulary || [])}
          ${hintsHtml(task.hints || [])}
        </div>
        <div class="work">
          <div id="task-area"></div>
          <div class="result" id="task-result" aria-live="polite"></div>
          ${pagerHtml(at)}
        </div>
      </div>`;
    bindHints();
  }

  // The red bar: where this task sits, its title, and a square for each task.
  function taskBarHtml(task, at, group) {
    let squares = "";
    list.forEach(function (entry, i) {
      const done = Shell.isDone(entry.id);
      const here = i === at;
      const state = here ? "this task" : done ? "done" : "to do";
      squares += `<a href="${Dom.esc(Shell.urlFor(entry))}"${done ? ' class="done"' : ""}${here ? ' aria-current="page"' : ""}><span class="visually-hidden">Task ${i + 1}, ${state}: ${Dom.esc(entry.title)}</span></a>`;
    });
    return `
      <section class="taskbar">
        <div class="wrap">
          <div>
            <p class="meta">Week ${Dom.esc(task.week)} · ${Dom.esc(group.title)} · Task ${at + 1} of ${list.length}</p>
            <h1>${Dom.esc(task.title)}</h1>
          </div>
          <nav class="steps" aria-label="All tasks">${squares}</nav>
        </div>
      </section>`;
  }
  // The reminder on the tasks of a strand that has watch-first videos.
  function watchNoteHtml(watch) {
    const links = watch.videos.map((video) => `<a href="https://www.youtube.com/shorts/${encodeURIComponent(video.id)}" target="_blank" rel="noopener">${Dom.esc(video.short)} (new tab)</a>`);
    return `<p class="watch-note"><b>Have you met the robots yet?</b> If not, watch them first: ${links.join(" and ")}. Both are on <a href="${Dom.esc(settings.page)}#watch-first">the task list</a> too.</p>`;
  }

  // The brief: paragraphs split at blank lines. A paragraph inside ``` marks
  // is sample code, shown as it is. Words from the word bank are in bold.
  function briefHtml(task) {
    const terms = (task.vocabulary || []).map((word) => word.term);
    let html = "";
    for (const paragraph of String(task.brief || "").split(/\n\n+/)) {
      const code = /^```\n?([\s\S]*?)\n?```$/.exec(paragraph.trim());
      if (code) {
        html += `<pre class="sample">${Dom.esc(code[1])}</pre>`;
      } else {
        html += `<p>${boldTerms(Dom.esc(paragraph), terms)}</p>`;
      }
    }
    return html;
  }

  // Put <b> round each word-bank term in a paragraph that is already escaped.
  function boldTerms(html, terms) {
    for (const term of terms) {
      if (term.includes("/")) { continue; }   // "ul / li" is two words, not one
      // Signs such as . or ( mean something in a pattern: \ makes them plain.
      const plain = Dom.esc(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // \b is the edge of a word: "id" is bold on its own, but not inside
      // "valid". A term that begins or ends with a sign, such as "<title>",
      // has no word edge there.
      const start = /^\w/.test(term) ? "\\b" : "";
      const end = /\w$/.test(term) ? "\\b" : "";
      html = html.replace(new RegExp(start + plain + end, "gi"), "<b>$&</b>");
    }
    return html;
  }

  // Each word opens to show its meaning: <details> does that without JavaScript.
  function wordBankHtml(vocabulary) {
    if (vocabulary.length === 0) { return ""; }
    let html = `<div class="wordbank"><h3>Word bank</h3>`;
    for (const word of vocabulary) {
      html += `<details><summary>${Dom.esc(word.term)}</summary><p>${Dom.esc(word.gloss)}</p></details>`;
    }
    return html + `</div>`;
  }

  // One button per hint. Only the first shows at the start; each later one
  // shows once the hint before it has been opened.
  function hintsHtml(hints) {
    if (hints.length === 0) { return ""; }
    let html = `<div class="hints"><h3>Stuck?</h3>`;
    hints.forEach(function (hint, i) {
      html += `
        <button type="button" class="hint-button" data-hint="${i}"${i > 0 ? " hidden" : ""}>Show hint ${i + 1}</button>
        <p class="hint" id="hint-${i}" hidden>${Dom.esc(hint)}</p>`;
    });
    return html + `</div>`;
  }

  function bindHints() {
    for (const button of main.querySelectorAll(".hint-button")) {
      button.addEventListener("click", function () {
        const i = Number(button.dataset.hint);
        const hint = document.getElementById(`hint-${i}`);
        hint.hidden = !hint.hidden;
        button.textContent = `${hint.hidden ? "Show" : "Hide"} hint ${i + 1}`;
        const nextButton = main.querySelector(`[data-hint="${i + 1}"]`);
        if (nextButton && !hint.hidden) { nextButton.hidden = false; }
      });
    }
  }

  // Previous and next follow the tasks on this page. At either end the
  // button goes back to the list.
  function pagerHtml(at) {
    const prev = list[at - 1];
    const next = list[at + 1];
    const back = prev
      ? `<a class="button" href="${Dom.esc(Shell.urlFor(prev))}">&larr; Task ${at}: ${Dom.esc(prev.title)}</a>`
      : `<a class="button" href="${Dom.esc(settings.page)}">&larr; All tasks</a>`;
    const forward = next
      ? `<a class="button black" href="${Dom.esc(Shell.urlFor(next))}">Task ${at + 2}: ${Dom.esc(next.title)} &rarr;</a>`
      : `<a class="button black" href="${Dom.esc(settings.page)}">All tasks &rarr;</a>`;
    return `<nav class="pager" aria-label="Previous and next task">${back} ${forward}</nav>`;
  }

  // Only draw() can be seen from outside this file.
  return { draw: draw };
})();