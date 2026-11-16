
const Editor = (function () {
  "use strict";

  const make = Dom.make;
  const INDENT = "    ";   // four spaces: one level of indentation in Python

  // "helloworld.py" from the line "File: helloworld.py" at the top of a
  // starter, or "program.py" when the starter has no such line.
  function fileName(starter) {
    const found = /File: (\S+)/.exec(starter);
    return found ? found[1] : "program.py";
  }

  function create(options) {
    // ---------- the parts of the box ----------

    // The black bar: the file's name, and the Reset button.
    const reset = make("button", null, "Reset to starter code");
    reset.type = "button";
    const tools = make("span", "py-editor-tools");
    tools.append(reset);
    const bar = make("div", "py-editor-bar");
    bar.append(make("span", "py-editor-name", fileName(options.starter)), tools);

    // The line numbers, and the box the code is typed in.
    const gutter = make("div", "py-editor-gutter");
    gutter.setAttribute("aria-hidden", "true");
    const code = make("textarea", "py-editor-code");
    code.value = options.code;
    code.spellcheck = false;
    code.setAttribute("autocapitalize", "off");
    code.setAttribute("autocomplete", "off");
    code.setAttribute("aria-label", "Your code");
    const body = make("div", "py-editor-body");
    body.append(gutter, code);

    const node = make("div", "py-editor");
    node.append(bar, body);
    const note = make("p", "py-note", "Tab puts in four spaces. To leave the code box with the keyboard, press Escape, then Tab.");

    // ---------- line numbers ----------

    // One number for each line of code, scrolled level with the code.
    function renumber() {
      const count = code.value.split("\n").length;
      Dom.clear(gutter);
      for (let n = 1; n <= count; n++) {
        gutter.appendChild(make("span", null, n));
      }
      gutter.scrollTop = code.scrollTop;
    }

    // The box is as tall as its code, so the code should never scroll up
    // or down inside it. If a browser lets it, the numbers follow.
    code.addEventListener("scroll", function () {
      gutter.scrollTop = code.scrollTop;
    });

    // ---------- what the keys do ----------

    // Put text in at the cursor, in place of anything selected.
    function insert(text) {
      code.setRangeText(text, code.selectionStart, code.selectionEnd, "end");
      code.dispatchEvent(new Event("input"));   // tell the listeners that the code changed
    }

    // Tab puts in four spaces. Escape, then Tab, leaves the box, so nobody
    // who uses the keyboard is trapped in it. Enter starts the new line
    // with the indentation of the old one, and four spaces more after a colon.
    let leaving = false;
    code.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { leaving = true; return; }
      if (event.key === "Tab" && !event.shiftKey && !leaving) {
        event.preventDefault();
        insert(INDENT);
      }
      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        const before = code.value.slice(0, code.selectionStart);
        const line = before.slice(before.lastIndexOf("\n") + 1);   // the line the cursor is on, up to the cursor
        let indent = /^[ \t]*/.exec(line)[0];
        if (/:\s*(#.*)?$/.test(line)) { indent += INDENT; }
        insert("\n" + indent);
      }
      leaving = false;
    });

    // After every change: the numbers are counted again, and the page is
    // told.
    code.addEventListener("input", function () {
      renumber();
      options.onChange(code.value);
    });

    reset.addEventListener("click", function () {
      if (!window.confirm("Put the starter code back? Your changes in this task will be lost.")) { return; }
      code.value = options.starter;
      code.dispatchEvent(new Event("input"));
    });

    renumber();
    return {
      node: node,
      note: note,
      getCode: function () { return code.value; }
    };
  }

  // Only create() can be seen from outside this file.
  return { create: create };
})();