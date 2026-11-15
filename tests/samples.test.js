
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const index = JSON.parse(fs.readFileSync(path.join(ROOT, "tasks", "index.json"), "utf8"));
const entries = index.weeks.flatMap((week) => week.tasks).filter((entry) => entry.type === "inspect");
const reveal = fs.readFileSync(path.join(ROOT, "samples", "reveal.js"), "utf8");

for (const entry of entries) {
  const task = JSON.parse(fs.readFileSync(path.join(ROOT, "tasks", entry.file), "utf8"));
  const real = task.problems.filter((problem) => !problem.decoy);

  test(entry.id + ": its sample website exists", () => {
    assert.ok(fs.existsSync(path.join(ROOT, task.sample)), task.sample + " is missing");
  });

  test(entry.id + ": the website marks the real problems, and only those", () => {
    const page = fs.readFileSync(path.join(ROOT, task.sample), "utf8");
    for (const problem of real) {
      assert.ok(page.includes(`data-flaw="${problem.id}"`), `${task.sample} does not mark "${problem.id}"`);
      assert.match(reveal, new RegExp(`\\b${problem.id}:`), `samples/reveal.js has no label for "${problem.id}"`);
    }
    const marks = page.match(/data-flaw="/g) || [];
    assert.equal(marks.length, real.length, `${task.sample} marks ${marks.length} problems; the task lists ${real.length}`);
  });
}