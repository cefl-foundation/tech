
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const ConsoleCheck = require("../js/python/console-check.js");
const { normalise } = require("../js/compare.js");

const TASKS = path.join(__dirname, "..", "tasks");
const index = JSON.parse(fs.readFileSync(path.join(TASKS, "index.json"), "utf8"));
const entries = index.weeks.flatMap((week) => week.tasks).filter((entry) => entry.type === "console");

// Is real Python on this computer?
const hasPython = spawnSync("python3", ["--version"]).status === 0;

// The site shows what the user typed after each prompt. Real Python does
// not, so these lines make input() do the same before the program runs.
const PRELUDE = [
  "import builtins, sys",
  "_typed = sys.stdin.read().split('\\n')",
  "def _input(prompt=''):",
  "    sys.stdout.write(str(prompt))",
  "    if not _typed:",
  "        raise EOFError('no input left')",
  "    line = _typed.pop(0)",
  "    sys.stdout.write(line + '\\n')",
  "    return line",
  "builtins.input = _input",
  ""
].join("\n");

// Run a program in real Python with these typed answers, and give back
// what it printed.
function runInPython(code, answers) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "hub-"));
  const file = path.join(folder, "program.py");
  // __name__ is "__main__" only in the file that Python is asked to run,
  // so the prelude and the program go into one file.
  fs.writeFileSync(file, PRELUDE + code);
  try {
    return execFileSync("python3", [file], { input: answers.join("\n"), encoding: "utf8" });
  } finally {
    fs.rmSync(folder, { recursive: true });
  }
}

// What went wrong, in words, for the message of a failed test.
function explain(result) {
  const lines = [];
  result.tests.forEach(function (one, i) {
    if (one.passed) { return; }
    lines.push("test " + (i + 1) + ": " + (one.error ? String(one.error) : "printed " + JSON.stringify(one.output)));
  });
  for (const message of result.missing) { lines.push("requires: " + message); }
  return lines.join("; ");
}

for (const entry of entries) {
  const task = JSON.parse(fs.readFileSync(path.join(TASKS, entry.file), "utf8"));

  test(entry.id + ": the solution passes", () => {
    assert.ok(task.solution, "the task has no solution yet");
    const result = ConsoleCheck.check(task, task.solution);
    assert.equal(result.passed, true, explain(result));
  });

  test(entry.id + ": the starter code does not pass", () => {
    assert.equal(ConsoleCheck.check(task, task.starterCode).passed, false);
  });

  test(entry.id + ": the solution prints the same in real Python", { skip: hasPython ? false : "python3 is not on this computer" }, () => {
    assert.ok(task.solution, "the task has no solution yet");
    for (const one of task.tests) {
      const answers = one.stdin || [];
      const inMiniPy = ConsoleCheck.run(task.solution, answers).output;
      assert.equal(normalise(runInPython(task.solution, answers)), normalise(inMiniPy), "typing: " + answers.join(", "));
    }
  });
}