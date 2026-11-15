
(function () {
  "use strict";

  const make = Dom.make;
  const WAIT_MS = 300;

  // A code box: a black label bar, then line numbers beside the code.
  function codeBox(name, value) {
    const numbers = make("div", "gutter");
    numbers.setAttribute("aria-hidden", "true");
    const code = make("textarea", "code");
    code.value = value;
    code.spellcheck = false;
    code.setAttribute("aria-label", "Your " + name);
    const body = make("div", "edwrap");
    body.append(numbers, code);
    const box = make("div", "web-codebox " + name.toLowerCase());
    box.append(make("div", "lab", name), body);

    // One number for each line of code, scrolled level with the code.
    function renumber() {
      const lines = code.value.split("\n").length;
      const list = [];
      for (let i = 1; i <= lines; i++) { list.push(i); }
      numbers.textContent = list.join("\n");
      numbers.scrollTop = code.scrollTop;
    }

    // Tab puts in two spaces. Escape, then Tab, leaves the box, so nobody
    // who uses the keyboard is trapped in it.
    let leaving = false;
    code.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { leaving = true; return; }
      if (event.key === "Tab" && !event.shiftKey && !leaving) {
        event.preventDefault();
        code.setRangeText("  ", code.selectionStart, code.selectionEnd, "end");
        code.dispatchEvent(new Event("input"));
      }
      leaving = false;
    });
    code.addEventListener("input", renumber);
    code.addEventListener("scroll", function () { numbers.scrollTop = code.scrollTop; });
    renumber();
    return { node: box, code: code, renumber: renumber };
  }

  function draw(task, area) {
    const saved = Progress.getData(task.id);
    const html = codeBox("HTML", saved.html != null ? saved.html : task.starterHtml || "");
    const css = codeBox("CSS", saved.css != null ? saved.css : task.starterCss || "");
    area.append(html.node, css.node,
      make("p", "web-note", "Tab puts in two spaces. To leave a code box with the keyboard, press Escape, then Tab."));


    // ---------- the checklist, under the code boxes ----------
    const meterFill = make("i");
    const meter = make("span", "meter");
    meter.appendChild(meterFill);
    const score = make("b");
    const meterWrap = make("span", "meter-wrap");
    meterWrap.append(meter, score);
    const head = make("div", "checklist-head");
    head.append(make("h3", "web-heading", "Checklist"), meterWrap);
    const list = make("ul", "checklist");
    const items = task.checks.map(function (check) {
      const mark = make("span", "check-mark");
      const note = make("span", "check-note");
      const item = make("li", "check");
      item.append(mark, make("span", "check-label", check.label), note);
      list.appendChild(item);
      return { check: check, item: item, mark: mark, note: note };
    });
    area.append(head,
      make("p", "web-note", "Checked from the preview as you type. An item turns green the moment it is true. The task is complete when all of them are."),
      list);

    // ---------- the preview, across the page ----------
    const reset = make("button", null, "Reset to starter code");
    reset.type = "button";
    const win = BrowserWindow.withPage({
      url: "localhost:8000/index.html",
      secure: false,
      tools: [reset],
      frameTitle: "Preview of your page",
      untitled: "index.html",
      className: "preview"
    });
    // No allow-scripts: the student's page cannot run JavaScript, so it can
    // never reach into this page. allow-same-origin lets this page read the
    // preview: its title, and the checks.
    win.frame.setAttribute("sandbox", "allow-same-origin");
    Shell.stage().appendChild(win.node);

    // ---------- what happens ----------

    // Put the CSS into the HTML, just before </head>, and show the page.
    function showPage() {
      const style = "<style>\n" + css.code.value + "\n</style>\n";
      const page = html.code.value;
      const at = page.search(/<\/head>/i);
      win.frame.srcdoc = at === -1 ? style + page : page.slice(0, at) + style + page.slice(at);
    }

    // Draw the page again only when typing stops for a moment.
    let timer = null;
    function changed() {
      clearTimeout(timer);
      timer = setTimeout(showPage, WAIT_MS);
      Progress.saveData(task.id, task, { html: html.code.value, css: css.code.value });
    }
    html.code.addEventListener("input", changed);
    css.code.addEventListener("input", changed);

    reset.addEventListener("click", function () {
      if (!window.confirm("Put the starter code back? Your changes in this task will be lost.")) { return; }
      html.code.value = task.starterHtml || "";
      css.code.value = task.starterCss || "";
      html.renumber();
      css.renumber();
      changed();
    });

    // Each time the preview has loaded a page:
    win.frame.addEventListener("load", function () {
      const page = win.frame.contentDocument;
      // Links in the preview. A link to another website opens in a new tab:
      // most sites refuse to be shown inside another page. A "#" link scrolls
      // the preview. Any other link does nothing, so the student's page stays.
      page.addEventListener("click", function (event) {
        const link = event.target.closest("a[href]");
        if (link === null) { return; }
        event.preventDefault();
        const href = link.getAttribute("href");
        if (/^https?:\/\//i.test(href)) {
          window.open(link.href, "_blank", "noopener");
        } else if (href.startsWith("#")) {
          const target = page.getElementById(href.slice(1));
          if (target !== null) { target.scrollIntoView(); }
        }
      });
      checkPage(page);
    });


    // Run every check on the page in the preview, and show the results.
    let allGreen = false;
    function checkPage(page) {
      let passed = 0;
      for (const row of items) {
        const ok = Checks.passes(row.check, page, win.frame.contentWindow);
        const note = ok ? "" : Checks.note(row.check, page);
        // Grey: not yet. Yellow with a half: a count on its way. Green with a tick: done.
        const onTheWay = note !== "" && row.check.exact !== 0;
        row.item.className = "check " + (ok ? "pass" : onTheWay ? "part" : "todo");
        Dom.text(row.mark, ok ? "✓" : onTheWay ? "½" : "");
        Dom.text(row.note, note);
        if (ok) { passed++; }
      }
      const total = items.length;
      meterFill.style.width = Math.round(passed / total * 100) + "%";
      Dom.text(score, passed === total ? "All " + total + " green" : passed + " of " + total);

      // Say so once, when the last item turns green. Take it back if one turns grey again.
      if (passed === total && !allGreen) {
        Shell.taskPassed("Every item on the checklist is green. Well done!");
      } else if (passed < total && allGreen) {
        Shell.clearVerdict();
      }
      allGreen = passed === total;
    }

    showPage();
  }

  Shell.addType("html-editor", draw);
})();