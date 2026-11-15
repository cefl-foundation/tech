
(function () {
  "use strict";

  const make = Dom.make;
  const MIN_WORDS = 4;

  // How many words are in a piece of text.
  function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function draw(task, area) {
    const saved = Progress.getData(task.id);
    const ticks = saved.ticks || {};
    const reasons = saved.reasons || {};
    let revealed = saved.revealed === true;

    function save(patch) { Progress.saveData(task.id, task, patch); }

    // The address of the sample: with ?reveal=1 once Reveal has been pressed.
    function sampleAddress() {
      return revealed ? task.sample + "?reveal=1" : task.sample;
    }

    // ---------- the website, across the page ----------
    const newTab = make("a", null, "Open in a new tab ↗");
    newTab.href = sampleAddress();
    newTab.target = "_blank";
    newTab.rel = "noopener";
    const beside = make("button", null, "Open beside this page");
    beside.type = "button";
    const win = BrowserWindow.withPage({
      url: task.displayUrl || task.sample,
      tools: [newTab, beside],
      frameTitle: "The website to inspect",
      className: "sample"
    });
    win.frame.src = sampleAddress();
    const tip = make("p", "tip");
    tip.append(
      make("strong", null, "To see the real HTML: "),
      "open the website on its own with \"Open beside this page\" or \"Open in a new tab\". " +
      "Then right-click anything on it and choose Inspect. If you right-click it here, the developer " +
      "tools show the whole Practice Hub, with the website hidden inside an <iframe>."
    );
    Shell.stage().append(win.node, tip);

    // A narrow window at the right of the screen, beside this one.
    beside.addEventListener("click", function () {
      const width = Math.min(760, Math.round(screen.availWidth / 2));
      const height = Math.round(screen.availHeight * 0.9);
      const left = screen.availWidth - width;
      window.open(sampleAddress(), "sample-" + task.id,
        "popup=yes,width=" + width + ",height=" + height + ",left=" + left + ",top=0");
    });

    // ---------- the list of possible problems ----------
    area.append(
      make("h3", "web-heading", "What is wrong with this page?"),
      make("p", "web-note", "Tick the problems you find. For each one, write a sentence: why does it matter for a real user?")
    );
    const list = make("ul", "problems");
    const rows = task.problems.map(function (problem) {
      const tick = make("input");
      tick.type = "checkbox";
      tick.id = "tick-" + problem.id;
      tick.checked = ticks[problem.id] === true;
      const name = make("label", null, problem.label);
      name.htmlFor = tick.id;
      const top = make("div", "problem-top");
      top.append(tick, name);

      // The box for the reason shows only while the item is ticked.
      const reason = make("input");
      reason.type = "text";
      reason.id = "reason-" + problem.id;
      reason.value = reasons[problem.id] || "";
      reason.placeholder = "One sentence…";
      const reasonLabel = make("label", null, "Why does it matter for a real user?");
      reasonLabel.htmlFor = reason.id;
      const why = make("div", "problem-why");
      why.hidden = !tick.checked;
      why.append(reasonLabel, reason);

      const feedback = make("p", "problem-feedback");
      feedback.hidden = true;
      const item = make("li", "problem");
      item.append(top, why, feedback);
      list.appendChild(item);
      const row = { problem: problem, item: item, tick: tick, reason: reason, feedback: feedback };

      tick.addEventListener("change", function () {
        ticks[problem.id] = tick.checked;
        why.hidden = !tick.checked;
        save({ ticks: ticks });
        showNote(row, "", "");
      });
      reason.addEventListener("input", function () {
        reasons[problem.id] = reason.value;
        save({ reasons: reasons });
      });
      return row;
    });
    area.appendChild(list);

    const check = make("button", "button primary", "Check my answers");
    const reveal = make("button", "button", "Reveal the answers");
    check.type = "button";
    reveal.type = "button";
    const buttons = make("div", "web-buttons");
    buttons.append(check, reveal);
    area.appendChild(buttons);

    // ---------- what happens ----------

    // A note under one item, and the item's colour. An empty note hides the box.
    function showNote(row, kind, message) {
      row.item.className = kind === "" ? "problem" : "problem " + kind;
      Dom.text(row.feedback, message);
      row.feedback.hidden = message === "";
    }

    function showModelAnswer(row) {
      showNote(row, "revealed", "Model answer: " + row.problem.why);
    }

    check.addEventListener("click", function () {
      let real = 0;
      let found = 0;
      let decoys = 0;
      let unexplained = 0;
      for (const row of rows) {
        if (row.problem.decoy) {
          if (row.tick.checked) {
            decoys++;
            showNote(row, "bad", "This is not a problem on this page. Look again.");
          } else {
            showNote(row, "", "");
          }
          continue;
        }
        real++;
        if (!row.tick.checked) {
          // Say nothing here: a note under an unticked item would give the answer away.
          if (revealed) { showModelAnswer(row); } else { showNote(row, "", ""); }
        } else if (countWords(row.reason.value) < MIN_WORDS) {
          found++;
          unexplained++;
          showNote(row, "warn", "Found it. Now write a sentence about why it matters.");
        } else {
          found++;
          showNote(row, "good", "Yes. " + row.problem.why);
        }
      }

      if (found === real && decoys === 0 && unexplained === 0) {
        Shell.taskPassed("You found all " + real + " problems and said why each one matters. Well done!");
        return;
      }
      let message = "You have found " + found + " of " + real + " problems.";
      if (decoys === 1) { message += " 1 item you ticked is not a problem on this page."; }
      if (decoys > 1) { message += " " + decoys + " items you ticked are not problems on this page."; }
      if (unexplained === 1) { message += " 1 needs a sentence about why it matters."; }
      if (unexplained > 1) { message += " " + unexplained + " need a sentence about why it matters."; }
      if (decoys > 0 || unexplained > 0) {
        message += " Read the notes under the items, then check again.";
      } else {
        message += " Keep looking, then check again.";
      }
      Shell.showVerdict("bad", message);
    });

    function showRevealed() {
      reveal.disabled = true;
      Dom.text(reveal, "Answers are revealed");
      for (const row of rows) {
        if (!row.problem.decoy) { showModelAnswer(row); }
      }
    }

    reveal.addEventListener("click", function () {
      revealed = true;
      save({ revealed: true });
      win.frame.src = sampleAddress();
      newTab.href = sampleAddress();
      showRevealed();
      check.focus();   // the Reveal button is switched off, so move the focus next door
      Shell.showVerdict("neutral", "The real problems are outlined in red on the website. Tick them, write your own sentence for each, then check.");
    });

    if (revealed) { showRevealed(); }
  }

  Shell.addType("inspect", draw);
})();