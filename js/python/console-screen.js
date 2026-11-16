
(function () {
  "use strict";

  const make = Dom.make;

  // MiniPy uses this kind for real Python that this site does not have.
  // The student has made no mistake, so it is shown as a note and not as
  // an error.
  function notOnThisSite(error) {
    return error.kind === "NotInMiniPy";
  }

  // An error as one line of words: "NameError on line 9: name 'prnt' is not defined."
  function errorText(error) {
    if (!error.kind) { return String(error.message || error); }   // not one of MiniPy's own errors
    if (notOnThisSite(error)) { return (error.line ? "Line " + error.line + ". " : "") + error.msg; }
    return error.kind + (error.line ? " on line " + error.line : "") + ": " + error.msg;
  }

  // "9, 17" for the answers a test types in, or "nothing".
  function typing(test) {
    const answers = test.stdin || [];
    return answers.length > 0 ? answers.join(", ") : "nothing";
  }

  function draw(task, area) {
    const saved = Progress.get(task.id);   // what this browser has saved for the task, or null
    const editor = Editor.create({
      code: saved && saved.lastCode != null ? saved.lastCode : task.starterCode,
      starter: task.starterCode,
      onChange: function (code) { Progress.saveCode(task.id, task, code); }
    });

    // ---------- the parts ----------

    const runButton = make("button", "button primary", "Run");
    runButton.type = "button";
    const testButton = make("button", "button black", "Run the tests");
    testButton.type = "button";
    const runRow = make("div", "py-runrow");
    runRow.append(runButton, testButton);

    // The answers for input(), one on each line. It starts with the
    // answers of the first test.
    const inputs = make("textarea");
    inputs.id = "py-inputs";
    inputs.rows = 3;
    inputs.spellcheck = false;
    inputs.value = ((task.tests[0] || {}).stdin || []).join("\n");
    const inputsLabel = make("label", null, "Keyboard input - what the user types, one answer per line (the tests use their own values)");
    inputsLabel.htmlFor = "py-inputs";
    const inputsBox = make("div", "py-inputs");
    inputsBox.append(inputsLabel, inputs);

    // The terminal can be scrolled, so the keyboard must be able to reach
    // it: tabIndex 0. The role and the label tell a screen reader what it is.
    const screen = make("pre", "py-terminal-screen");
    screen.tabIndex = 0;
    screen.setAttribute("role", "region");
    screen.setAttribute("aria-label", "Terminal: what your program printed");
    const terminal = make("div", "py-terminal");
    terminal.append(make("div", "py-terminal-bar", "Terminal"), screen);

    const report = make("div", "py-report");
    report.hidden = true;

    area.append(runRow, editor.node, editor.note, inputsBox, terminal, report);

    // ---------- showing a run ----------

    function clearAll() {
      Dom.clear(screen);
      Dom.clear(report);
      report.hidden = true;
      editor.markLine(0);
      Shell.clearVerdict();
    }

    // Put one run on the terminal: what the program printed, with the
    // typed answers in another colour, then the error that stopped it.
    function showRun(result) {
      Dom.clear(screen);
      let last = null;   // pieces of the same kind go into one <span>
      for (const piece of result.pieces) {
        if (last === null || last.typed !== piece.typed) {
          last = { typed: piece.typed, node: make("span", piece.typed ? "typed" : null, "") };
          screen.appendChild(last.node);
        }
        last.node.textContent += piece.text;
      }
      if (result.error && notOnThisSite(result.error)) {
        screen.appendChild(make("span", "note", errorText(result.error)));
      } else if (result.error) {
        screen.appendChild(make("span", "error", "Error: " + errorText(result.error)));
        editor.markLine(result.error.line);
      } else if (result.output === "") {
        screen.appendChild(make("span", "note", "(the program finished - nothing was printed)"));
      }
    }

    // The verdict for a run that an error stopped.
    function showError(error) {
      if (notOnThisSite(error)) {
        Shell.showVerdict("neutral", errorText(error));
      } else {
        Shell.showVerdict("bad", "The program stopped with an error. " + errorText(error));
      }
    }

    // false, with a verdict, when the program has no main() function.
    function hasMain(code) {
      if (ConsoleCheck.hasMain(code)) { return true; }
      Shell.showVerdict("bad", "Every program here needs a main() function. The last two lines of the file call it.");
      return false;
    }

    // ---------- Run ----------

    function runOnce() {
      const code = editor.getCode();
      clearAll();
      if (!hasMain(code)) { return; }
      // One answer on each line. An empty box means no answers at all.
      const answers = inputs.value === "" ? [] : inputs.value.replace(/\n$/, "").split("\n");
      const result = ConsoleCheck.run(code, answers);
      showRun(result);
      if (result.error) {
        showError(result.error);
      } else {
        Shell.showVerdict("neutral", "The program ran to the end. Use Run the tests to check its output against what the brief asks for.");
      }
    }

    // ---------- Run the tests ----------

    // One box for each test: its number, what it typed, and how it went.
    function testBox(result, number) {
      const box = make("div", "py-test " + (result.passed ? "passed" : "failed"));
      const head = make("p", "py-test-head");
      const title = result.test.name ? ": " + result.test.name : "";
      head.append(make("b", null, "Test " + number + title), " (typing: " + typing(result.test) + ") ",
        make("span", "py-test-tag", result.passed ? "Passed" : "Not yet"));
      box.appendChild(head);
      if (result.passed) { return box; }

      if (result.error) {
        box.appendChild(make("p", null, (notOnThisSite(result.error) ? "" : "The program stopped with an error. ") + errorText(result.error)));
        return box;
      }
      box.append(
        make("p", null, "The output is different."),
        make("p", "py-test-label", "Expected:"),
        make("pre", null, result.test.expectedStdout),
        make("p", "py-test-label", "Your program printed:"),
        make("pre", null, result.output === "" ? "(nothing)" : result.output)
      );
      if (result.hint) { box.appendChild(make("p", "py-test-hint", result.hint)); }
      return box;
    }

    function runTests() {
      const code = editor.getCode();
      clearAll();
      if (!hasMain(code)) { return; }

      const result = ConsoleCheck.check(task, code);
      const total = result.tests.length;
      const passed = result.tests.filter(function (test) { return test.passed; }).length;
      if (total === 0) {
        Shell.showVerdict("neutral", "This task has no tests yet, so it cannot be checked.");
        return;
      }

      // The first test that did not pass, if there is one. When it was
      // stopped by Python that this site does not have, the try is not counted.
      const first = result.tests.find(function (test) { return !test.passed; });
      const notHere = Boolean(first && first.error && notOnThisSite(first.error));
      if (!notHere) { Progress.recordAttempt(task.id, task); }

      // The terminal shows the first test's run. Every test gets a box.
      showRun(result.tests[0]);
      report.appendChild(make("h3", null, "The tests"));
      result.tests.forEach(function (test, i) { report.appendChild(testBox(test, i + 1)); });
      report.hidden = false;

      if (result.passed) {
        Shell.taskPassed(total === 1 ? "Your program passed the test. Well done!" : "Your program passed all " + total + " tests. Well done!");
      } else if (notHere) {
        showError(first.error);
      } else if (passed < total) {
        Shell.showVerdict("bad", passed + " of " + total + (total === 1 ? " test" : " tests") + " passed. Read what the tests say above, change your program and run the tests again.");
      } else {
        // The output is right, but the code does not do what the brief asks.
        const list = make("ul", "py-missing");
        for (const message of result.missing) {
          const item = make("li");
          item.innerHTML = Dom.code(message);   // safe: Dom.code() escapes the text
          list.appendChild(item);
        }
        report.append(make("p", "py-test-label", "The output is right - but read the brief again:"), list);
        Shell.showVerdict("neutral", "The output is right, but the program does not yet do what the brief asks. Read the list above, change your program and run the tests again.");
      }
    }

    runButton.addEventListener("click", runOnce);
    testButton.addEventListener("click", runTests);

    // Ctrl+Enter (Cmd+Enter on a Mac) in the code box or the input box
    // runs the tests.
    area.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runTests();
      }
    });
  }

  Shell.addType("console", draw);
})();