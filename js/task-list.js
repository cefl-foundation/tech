
const TaskList = (function () {
  "use strict";

  let main = null;       // the <main> element to draw into
  let settings = null;   // the page's settings
  let list = [];         // the page's tasks, in teaching order

  // The words for the three states of a task. CSS sets them in capitals.
  const TAGS = { todo: "To do", next: "Next", done: "Done" };

  // A small line drawing, 24 by 24, in the colour of the text round it.
  function icon(path) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>`;
  }

  const FLIP_ICON = icon("M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M20 12a8 8 0 0 1-14 5.3M6 21v-4h4");
  const TICK_ICON = icon("M4 12.5l5 5L20 6.5");

  // The curved arrow at the end of the handwritten note.
  const ARROW = `<svg viewBox="0 0 56 96" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 10 C 40 14, 50 44, 34 88"></path><path d="M24 78 L 34 90 L 44 77"></path></svg>`;

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
    for (const strand of settings.strands) {
      if (strand.watch) { html += watchHtml(strand.watch); }
    }
    html += deckHtml(next);
    for (const strand of settings.strands) {
      html += pileHtml(strand, next);
    }
    main.innerHTML = html;

    bindFlips();
    if (next) { fillWords(next.id); }
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

  // The watch-first videos. youtube-nocookie.com is YouTube's own address
  // for videos on other sites: it sets no cookies until a video is played.
  function watchHtml(watch) {
    let figures = "";
    watch.videos.forEach(function (video, i) {
      const id = encodeURIComponent(video.id);
      figures += `
        <figure>
          <p class="lab">Video ${i + 1} · Short</p>
          <iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${Dom.esc(video.title)}" loading="lazy" allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          <figcaption>${Dom.esc(video.short)} <a href="https://www.youtube.com/shorts/${id}" target="_blank" rel="noopener">Open on YouTube (new tab)</a></figcaption>
        </figure>`;
    });
    return `
      <section class="watch" id="watch-first">
        <div class="wrap">
          <h2>${Dom.esc(watch.title)}</h2>
          <p class="watch-intro">${Dom.esc(watch.intro)}</p>
          <div class="watch-videos">${figures}</div>
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
    const note = next ? `<p class="deck-note">Tap a card to flip it. Card ${list.indexOf(next) + 1} is already flipped${ARROW}</p>` : "";
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
          <ol class="deck-how">
            <li><span class="n" aria-hidden="true">1</span><p><b>Find the card marked Next</b> It is your next task. The cards go in order, so do them one by one.</p></li>
            <li><span class="n" aria-hidden="true">2</span><p><b>Flip it</b> The back has the word bank: the words you need for the task.</p></li>
            <li><span class="n" aria-hidden="true">3</span><p><b>Start the task</b> It opens on its own page, with the brief, the word bank and hints.</p></li>
          </ol>
          ${note}
        </div>
      </section>`;
  }

  // One pile: the strand's heading, a card for each of its tasks, and the
  // strand's end card if it has one.
  function pileHtml(strand, next) {
    const mine = list.filter((entry) => entry.type === strand.type);
    if (mine.length === 0) { return ""; }
    const done = mine.filter((entry) => Shell.isDone(entry.id)).length;
    let cards = "";
    for (const entry of mine) {
      cards += cardHtml(entry, strand, next);
    }
    if (strand.endCard) { cards += endCardHtml(strand.endCard); }
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

  // One task as a flip card.
  function cardHtml(entry, strand, next) {
    const n = list.indexOf(entry) + 1;
    const status = statusOf(entry, next);
    const title = Dom.esc(cardTitle(entry, strand));
    const start = status === "done" ? `Open task ${n} again` : `Start task ${n}`;
    let chip = "";
    if (status === "done") {
      chip = `<span class="fcard-chip done">${TICK_ICON}Done</span>`;
    } else if (Shell.isRoundTwo(entry)) {
      chip = `<span class="fcard-chip">Round 2</span>`;
    }
    return `
      <article class="fcard ${strand.key}${status === "next" ? " flipped" : ""}" data-id="${Dom.esc(entry.id)}">
        <div class="fcard-inner">
          <div class="fcard-face fcard-front">
            <div class="fcard-top">
              <span class="fcard-strand">${icon(strand.icon)}${Dom.esc(strand.title)} · W${Dom.esc(entry.week)}</span>
              ${chip}
            </div>
            <div class="fcard-main">
              <span class="fcard-num" aria-hidden="true">${Shell.pad2(n)}</span>
              <h3><span class="visually-hidden">Task ${n}: </span>${title}</h3>
            </div>
            <button type="button" class="fcard-flip" aria-label="Flip card ${n} to see the word bank">${FLIP_ICON}Flip</button>
          </div>
          <div class="fcard-face fcard-back">
            <div class="fcard-top">
              <span class="fcard-tag ${status}">${TAGS[status]}</span>
              <h3>${Shell.pad2(n)} · ${title}</h3>
              <button type="button" class="fcard-unflip" aria-label="Flip card ${n} back">${FLIP_ICON}</button>
            </div>
            <p class="fcard-concept">${Dom.esc(entry.concept || "")}</p>
            <div class="fcard-words">
              <p class="lab">Word bank</p>
              <ul data-words="${Dom.esc(entry.id)}"><li>Loading…</li></ul>
            </div>
            <div class="fcard-actions">
              <a class="button start" href="${Dom.esc(Shell.urlFor(entry))}">${start} &rarr;</a>
            </div>
          </div>
        </div>
      </article>`;
  }

  // The card at the end of a pile: a note, or a link when it has an href.
  function endCardHtml(card) {
    const title = card.title ? `<h3>${Dom.esc(card.title)}</h3>` : "";
    const inner = `<p class="lab">${Dom.esc(card.label)}</p>${title}<p>${Dom.esc(card.text)}</p>`;
    if (card.href) {
      return `<a class="fcard-end extra" href="${Dom.esc(card.href)}">${inner}</a>`;
    }
    return `<div class="fcard-end note">${inner}</div>`;
  }

  // ---------- turning the cards over ----------

  // The word bank on the back of a card comes from the task's own file,
  // the first time the card is turned over.
  function fillWords(id) {
    const ul = main.querySelector(`[data-words="${id}"]`);
    if (!ul || ul.dataset.loaded) { return; }
    ul.dataset.loaded = "yes";
    Tasks.loadTask(id)
      .then(function (task) {
        const words = (task.vocabulary || []).map((word) => `<li>${Dom.esc(word.term)}</li>`);
        ul.innerHTML = words.length > 0 ? words.join("") : "<li>See the task</li>";
      })
      .catch(function () {
        ul.innerHTML = "<li>See the task</li>";
      });
  }

  function setFlipped(card, flipped) {
    card.classList.toggle("flipped", flipped);
    if (flipped) { fillWords(card.dataset.id); }
    // A hidden face cannot take the focus. The CSS shows it 0.25 seconds
    // into the turn, so the focus moves a moment after that: 0.32 seconds.
    const target = card.querySelector(flipped ? ".fcard-unflip" : ".fcard-flip");
    window.setTimeout(function () {
      target.focus({ preventScroll: true });
    }, 320);
  }

  // One listener for every card: a click anywhere on a front turns that
  // card over; the back's button, or Escape, turns it back.
  function bindFlips() {
    main.addEventListener("click", function (event) {
      const card = event.target.closest(".fcard");
      if (!card) { return; }
      if (event.target.closest(".fcard-unflip")) {
        setFlipped(card, false);
      } else if (event.target.closest(".fcard-front")) {
        setFlipped(card, true);
      }
    });
    main.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") { return; }
      const card = event.target.closest(".fcard.flipped");
      if (card) { setFlipped(card, false); }
    });
  }

  // Only draw() can be seen from outside this file.
  return { draw: draw };
})();