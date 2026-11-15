
(function () {
  "use strict";

  const make = Dom.make;
  const MIN_WORDS = 15;

  // How many words are in a piece of text.
  function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  // The list in a mixed-up order: the same order every time for the same
  // task, because the task's id is the seed.
  function shuffled(list, seed) {
    const copy = list.slice();
    let h = 0;
    for (let i = 0; i < seed.length; i++) { h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
    for (let j = copy.length - 1; j > 0; j--) {
      h = (h * 1103515245 + 12345) >>> 0;
      const k = h % (j + 1);
      const swap = copy[j];
      copy[j] = copy[k];
      copy[k] = swap;
    }
    return copy;
  }

  // Put a step's text into a paragraph, with its key term in bold.
  function showText(paragraph, step) {
    Dom.clear(paragraph);
    const safe = step.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const part of step.text.split(new RegExp("(" + safe + ")", "i"))) {
      if (part.toLowerCase() === step.term.toLowerCase()) {
        paragraph.appendChild(make("strong", "key-term", part));
      } else {
        paragraph.appendChild(document.createTextNode(part));
      }
    }
  }

  function draw(task, area) {
    const saved = Progress.getData(task.id);
    const steps = task.steps;
    const answers = saved.answers || {};
    let step = saved.step != null ? saved.step : -1;   // -1: Enter not pressed yet
    let finished = saved.finished === true;            // the last step has been reached

    function save(patch) { Progress.saveData(task.id, task, patch); }

    // ---------- the address bar: a small browser window with a text box ----------
    const label = task.urlLabel || "Type a website address and press Enter";
    const example = task.urlPlaceholder || "www.beds.ac.uk";
    const tabs = BrowserWindow.tabStrip(saved.url || "New tab");
    const input = make("input", "browser-input");
    input.type = "text";
    input.value = saved.url || "";
    input.placeholder = label + ", e.g. " + example;
    input.setAttribute("aria-label", label);
    input.autocomplete = "off";
    const go = make("button", "button primary", task.goLabel || "Go");
    go.type = "submit";
    const bar = make("div", "browser-bar");
    bar.append(BrowserWindow.arrows(), input, go);
    const form = make("form", "browser mini");
    form.append(tabs.node, bar);
    area.appendChild(form);

    // ---------- the diagram: one numbered box per step ----------
    const diagram = make("ol", "walk-diagram");
    const boxes = steps.map(function (s, i) {
      const box = make("li", "walk-node");
      box.append(make("span", "walk-node-num", String(i + 1)), make("span", "walk-node-term", s.term));
      diagram.appendChild(box);
      return box;
    });
    area.appendChild(diagram);

    // ---------- the card for the step we are on ----------
    const cardTitle = make("h3");
    const cardText = make("p");
    const cardCount = make("p", "web-note");
    const back = make("button", "button", "← Back");
    const next = make("button", "button primary", "Next step →");
    back.type = "button";
    next.type = "button";
    const stepButtons = make("div", "web-buttons");
    stepButtons.append(back, next);
    const card = make("div", "walk-card");
    card.setAttribute("aria-live", "polite");   // a screen reader reads out each new step
    card.append(cardTitle, cardText, cardCount, stepButtons);
    area.appendChild(card);

    // ---------- the matching exercise ----------
    const matching = make("section", "walk-matching");
    matching.append(
      make("h3", "web-heading", "Match the words to their meanings"),
      make("p", "web-note", "Choose the right word for each meaning, then press Check.")
    );
    const terms = task.matching.map(function (pair) { return pair.term; });
    const rows = shuffled(task.matching, task.id).map(function (pair, i) {
      const choice = make("select");
      choice.id = "match-" + i;
      choice.appendChild(new Option("choose…", ""));
      for (const term of terms) { choice.appendChild(new Option(term, term)); }
      choice.value = answers[pair.term] || "";
      const meaning = make("label", null, pair.definition);
      meaning.htmlFor = choice.id;
      const mark = make("span", "match-mark");
      const row = make("div", "match-row");
      row.append(choice, meaning, mark);
      matching.appendChild(row);

      choice.addEventListener("change", function () {
        answers[pair.term] = choice.value;
        save({ answers: answers });
        row.className = "match-row";
        Dom.text(mark, "");
      });
      return { pair: pair, choice: choice, row: row, mark: mark };
    });
    const check = make("button", "button primary", "Check");
    check.type = "button";
    matching.appendChild(check);
    area.appendChild(matching);

    // ---------- the writing box ----------
    const prompt = make("label", null, task.writingPrompt || "Explain it in your own words.");
    prompt.htmlFor = "walkWriting";
    const box = make("textarea");
    box.id = "walkWriting";
    box.rows = 4;
    box.value = saved.writing || "";
    const count = make("p", "web-note");
    const finish = make("button", "button primary", "Finish the task");
    finish.type = "button";
    const writing = make("section", "walk-writing");
    writing.append(make("h3", "web-heading", "Now explain it yourself"), prompt, box, count, finish);
    area.appendChild(writing);

    // ---------- what happens ----------

    // Show the step we are on. The two exercises appear once the last
    // step has been reached, and stay after that.
    function showStep() {
      boxes.forEach(function (b, i) {
        b.className = "walk-node" + (i === step ? " current" : i < step ? " done" : "");
      });
      matching.hidden = !finished;
      writing.hidden = !finished;
      card.hidden = step < 0;
      if (step < 0) { return; }
      Dom.text(cardTitle, (step + 1) + ". " + steps[step].title);
      showText(cardText, steps[step]);
      Dom.text(cardCount, "Step " + (step + 1) + " of " + steps.length);
      back.disabled = step === 0;
      Dom.text(next, step === steps.length - 1 ? "Done: go to the matching ↓" : "Next step →");
    }

    function goTo(number) {
      step = number;
      if (step === steps.length - 1) { finished = true; }
      save({ step: step, finished: finished });
      showStep();
    }

    // Enter in the box, or the Go button: the journey starts at step 1.
    form.addEventListener("submit", function (event) {
      event.preventDefault();   // a form would load a new page: stay on this one
      const typed = input.value.trim() || example;
      input.value = typed;
      tabs.setTitle(typed);
      save({ url: typed });
      goTo(0);
    });

    back.addEventListener("click", function () { goTo(step - 1); });

    next.addEventListener("click", function () {
      if (step < steps.length - 1) {
        goTo(step + 1);
      } else {
        rows[0].choice.focus();   // to the first question of the matching
      }
    });

    check.addEventListener("click", function () {
      let right = 0;
      for (const r of rows) {
        const ok = r.choice.value === r.pair.term;
        r.row.className = "match-row " + (ok ? "good" : "bad");
        Dom.text(r.mark, ok ? "✓" : r.choice.value ? "✗ not this one" : "✗ choose a word");
        if (ok) { right++; }
      }
      if (right === rows.length) {
        Shell.showVerdict("good", "All " + right + " are right. Now write your explanation below.");
      } else {
        Shell.showVerdict("bad", right + " of " + rows.length + " are right. Change the ones marked ✗ and check again.");
      }
    });

    function showCount() {
      const n = countWords(box.value);
      Dom.text(count, n + (n === 1 ? " word" : " words") + ". Two sentences are about 20 to 40 words.");
    }

    box.addEventListener("input", function () {
      showCount();
      save({ writing: box.value });
    });

    finish.addEventListener("click", function () {
      const allRight = rows.every(function (r) { return r.choice.value === r.pair.term; });
      const n = countWords(box.value);
      if (!allRight) {
        Shell.showVerdict("bad", "Check the matching first: every word must be right.");
      } else if (n < MIN_WORDS) {
        Shell.showVerdict("bad", "Your explanation has " + n + " words. Two full sentences usually have at least " + MIN_WORDS + ". " + (task.writingHint || "Say what it is, then what it does."));
      } else {
        Shell.taskPassed("Every match is right, and your explanation is saved in this browser. Well done!");
      }
    });

    showCount();
    showStep();
  }

  Shell.addType("walkthrough", draw);
})();