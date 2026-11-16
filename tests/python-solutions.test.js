
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const ConsoleCheck = require("../js/python/console-check.js");
const { normalise } = require("../js/compare.js");
const MiniPy = require("../js/python/minipy.js");
const RobotWorld = require("../js/python/robot-world.js");

const TASKS = path.join(__dirname, "..", "tasks");
const index = JSON.parse(fs.readFileSync(path.join(TASKS, "index.json"), "utf8"));
const entries = index.weeks.flatMap((week) => week.tasks).filter((entry) => entry.type === "console");
const robots = index.weeks.flatMap((week) => week.tasks).filter((entry) => entry.type === "robot");

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

// ---------- the robot tasks ----------

// Run a program in the task's world, as "Run and check" does on the page.
// The answer is null when the program passes. Otherwise it is a sentence
// that says why not, so that a failing test explains itself.
function whyNot(task, code) {
  const world = RobotWorld.make(task.map);
  try {
    const commands = RobotWorld.builtins(world, RobotWorld.WORLDS[task.world]);
    const runner = new MiniPy.Runner(code, { builtins: commands });
    for (const step of runner.run()) { /* run to the end */ }
  } catch (error) {
    return "The program stopped: " + String(error);
  }
  return RobotWorld.checkGoal(world, task) || ConsoleCheck.missing(task, code)[0] || null;
}

// Is this square inside the map? "4,3" and [4, 3] are both accepted.
function inside(map, square) {
  const [x, y] = typeof square === "string" ? square.split(",").map(Number) : square;
  return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x <= map.cols && y >= 1 && y <= map.rows;
}

for (const entry of robots) {
  const task = JSON.parse(fs.readFileSync(path.join(TASKS, entry.file), "utf8"));

  test(entry.id + ": the map and the goal fit the world", () => {
    const map = task.map;
    const goal = task.goal;
    assert.ok(RobotWorld.WORLDS[task.world], "there is no world called " + task.world);
    assert.equal(entry.world, task.world, "index.json and the task file name different worlds");
    assert.ok(inside(map, [map.robot.x, map.robot.y]), "the robot starts outside the map");
    assert.ok(["N", "E", "S", "W", undefined].includes(map.robot.dir), "the robot's dir must be N, E, S or W");
    for (const square of Object.keys(map.items || {}).concat(Object.keys(goal.items))) {
      assert.ok(inside(map, square), "the square " + square + " is outside the map");
    }
    for (const wall of map.walls || []) {
      assert.ok(inside(map, [wall[0], wall[1]]), "the wall " + wall + " is outside the map");
      assert.ok(["N", "E", "S", "W"].includes(wall[2]), "the side of the wall " + wall + " must be N, E, S or W");
    }
    if (goal.robot) {
      assert.ok(inside(map, [goal.robot.x, goal.robot.y]), "the goal puts the robot outside the map");
    }
  });

  test(entry.id + ": the solution passes", () => {
    assert.ok(task.solution, "the task has no solution yet");
    assert.equal(whyNot(task, task.solution), null);
  });

  test(entry.id + ": the starter code does not pass", () => {
    assert.notEqual(whyNot(task, task.starterCode), null);
  });
}