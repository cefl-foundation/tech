
const TaskList = (function () {
  "use strict";

  let main = null;       // the <main> element to draw into
  let settings = null;   // the page's settings
  let list = [];         // the page's tasks, in teaching order

  // The words for the three states of a task. CSS sets them in capitals.
  const TAGS = { todo: "To do", next: "Next", done: "Done" };

  // The first task that is not done yet, or null when every task is done.
  function nextEntry() {
    return list.find((entry) => !Shell.isDone(entry.id)) || null;
  }

  function statusOf(entry, next) {
    if (Shell.isDone(entry.id)) { return "done"; }
    return entry === next ? "next" : "todo";
  }

  // ---------- the page ----------

  function draw(mainElement, pageSettings, tasks) {
    main = mainElement;
    settings = pageSettings;
    list = tasks;

    const next = nextEntry();
    let html = pageHeadHtml();
    html += deckHtml(next);
    for (const strand of settings.strands) {
      html += pileHtml(strand, next);
    }
    main.innerHTML = html;
  }

  // The red band at the top, with a link to each pile.
  function pageHeadHtml() {
    let chips = "";
    for (const strand of settings.strands) {
      chips += `<a class="chip" href="#${strand.key}">${Dom.esc(strand.title)}</a> `;
    }
    return `
      <section class="pagehead">
        <div class="wrap">
          <p class="eyebrow">${Dom.esc(settings.eyebrow)}</p>
          <h1>${Dom.esc(settings.title)}</h1>
          <p class="lede">${Dom.esc(settings.lede)}</p>
          <p class="chips">${chips}</p>
        </div>
      </section>`;
  }

  // Progress across the whole page: the words, then one segment per task.
  function deckHtml(next) {
    const done = list.filter((entry) => Shell.isDone(entry.id)).length;
    const nextText = next ? `Next: task ${list.indexOf(next) + 1}` : "All done";
    let segments = "";
    for (const entry of list) {
      segments += `<span class="${statusOf(entry, next)}"></span>`;
    }
    return `
      <section class="deck">
        <div class="wrap">
          <div class="deck-head">
            <div>
              <h2>The deck</h2>
              <p class="deck-text">${Dom.esc(settings.deckText)}</p>
            </div>
            <div class="deck-progress">
              <p class="deck-count"><b>${done} of ${list.length} done</b> <span>${nextText}</span></p>
              <div class="segments" aria-hidden="true">${segments}</div>
            </div>
          </div>
        </div>
      </section>`;
  }

  // One pile: the strand's heading, then a card for each of its tasks.
  function pileHtml(strand, next) {
    const mine = list.filter((entry) => entry.type === strand.type);
    if (mine.length === 0) { return ""; }
    const done = mine.filter((entry) => Shell.isDone(entry.id)).length;
    let cards = "";
    for (const entry of mine) {
      cards += cardHtml(entry, strand, next);
    }
    return `
      <section class="pile" id="${strand.key}">
        <div class="wrap">
          <div class="pile-head">
            <div>
              <p class="sub">${Dom.esc(strand.sub)}</p>
              <h2>${Dom.esc(strand.title)}</h2>
            </div>
            <p class="count">${done} of ${mine.length} done</p>
          </div>
          <div class="fcards">${cards}</div>
        </div>
      </section>`;
  }

  // "Inspect this page: The Corner Cafe" gives "The Corner Cafe":
  // the pile's heading already says "Inspect this page".
  function cardTitle(entry, strand) {
    const start = `${strand.title}: `;
    return entry.title.startsWith(start) ? entry.title.slice(start.length) : entry.title;
  }

  // One task as a plain card: its state, number, title, idea and Start button.
  function cardHtml(entry, strand, next) {
    const n = list.indexOf(entry) + 1;
    const status = statusOf(entry, next);
    const title = Dom.esc(cardTitle(entry, strand));
    const start = status === "done" ? `Open task ${n} again` : `Start task ${n}`;
    return `
      <article class="fcard ${strand.key}" data-id="${Dom.esc(entry.id)}">
        <div class="fcard-face fcard-back">
          <div class="fcard-top">
            <span class="fcard-tag ${status}">${TAGS[status]}</span>
            <h3>${Shell.pad2(n)} · ${title}</h3>
          </div>
          <p class="fcard-concept">${Dom.esc(entry.concept || "")}</p>
          <div class="fcard-actions">
            <a class="button start" href="${Dom.esc(Shell.urlFor(entry))}">${start} &rarr;</a>
          </div>
        </div>
      </article>`;
  }

  // Only draw() can be seen from outside this file.
  return { draw: draw };
})();