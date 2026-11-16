
const ConsoleCheck = (function () {
  "use strict";

  // In the browser, MiniPy and Compare are already there: the page loaded
  // their files first. Node has no page, so this file asks for them itself.
  const inNode = typeof module !== "undefined";
  const Engine = inNode ? require("./minipy.js") : MiniPy;
  const Rules = inNode ? require("../compare.js") : Compare;

  // Run a program to its end. `inputs` is a list of the answers that
  // input() will get, in order. Gives back:
  //   output   everything the program printed, typed answers included
  //   pieces   the same text in pieces: { text, typed }, where typed is
  //            true for an answer that came from `inputs`
  //   error    null, or the error that stopped the program (MiniPy's
  //            errors have a kind, a msg and a line)
  function run(code, inputs) {
    const pieces = [];
    let runner = null;
    try {
      runner = new Engine.Runner(code, {
        inputs: inputs,
        onPrint: function (text, typed) { pieces.push({ text: text, typed: typed }); }
      });
      const steps = runner.run();
      while (!steps.next().done) { /* a console program has nothing to draw between steps */ }
      return { output: runner.out, pieces: pieces, error: null };
    } catch (error) {
      return { output: runner ? runner.out : "", pieces: pieces, error: error };
    }
  }

  // Every program on the site starts in a function called main().
  function hasMain(code) {
    return /\bdef\s+main\s*\(/.test(code);
  }

  // The messages of the task's requires that this code does not meet.
  // A pattern is kept as text in the task file, because JSON cannot hold
  // a pattern: new RegExp() turns the text into one.
  function missing(task, code) {
    const messages = [];
    for (const rule of task.requires || []) {
      let met = false;
      try { met = new RegExp(rule.pattern).test(code); }
      catch (error) { met = false; }   // a broken pattern counts as not met; it does not crash the page
      if (!met) { messages.push(rule.message); }
    }
    return messages;
  }

  // Run the program once for each of the task's tests. Gives back:
  //   tests     one result for each test: { test, output, pieces, error,
  //             passed, hint }
  //   missing   the messages of the requires that the code does not meet
  //   passed    true when every test passed and nothing is missing
  function check(task, code) {
    const tests = [];
    for (const test of task.tests || []) {
      const result = run(code, test.stdin || []);   // a test with no stdin types nothing
      const passed = result.error === null && Rules.compare(test.match, test.expectedStdout, result.output);
      // The first difference is worth a sentence only for the hub's own
      // rule, which compares line by line.
      const hint = !passed && result.error === null && test.match === undefined
        ? Rules.diffHint(test.expectedStdout, result.output)
        : "";
      tests.push({ test: test, output: result.output, pieces: result.pieces, error: result.error, passed: passed, hint: hint });
    }
    const unmet = missing(task, code);
    const allPassed = tests.length > 0 && tests.every(function (result) { return result.passed; });
    return { tests: tests, missing: unmet, passed: allPassed && unmet.length === 0 };
  }

  // Only these four names can be seen from outside this file.
  return { run: run, hasMain: hasMain, missing: missing, check: check };
})();

// In the browser there is no "module", so this line does nothing.
// In Node it hands ConsoleCheck to the tests.
if (typeof module !== "undefined") { module.exports = ConsoleCheck; }