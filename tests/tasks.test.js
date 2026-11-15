
// Run every test from the repository folder with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The tasks/ folder, found from where this file is, so the tests work
// from any folder.
const TASKS = path.join(__dirname, "..", "tasks");
const index = JSON.parse(fs.readFileSync(path.join(TASKS, "index.json"), "utf8"));
const entries = index.weeks.flatMap((week) => week.tasks);

test("every task id appears only once", () => {
  const ids = entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every task file is listed in the index", () => {
  const listed = entries.map((entry) => entry.file);
  for (const folder of fs.readdirSync(TASKS, { withFileTypes: true })) {
    if (!folder.isDirectory()) { continue; }
    for (const name of fs.readdirSync(path.join(TASKS, folder.name))) {
      if (!name.endsWith(".json")) { continue; }
      const file = folder.name + "/" + name;
      assert.ok(listed.includes(file), file + " is not in index.json");
    }
  }
});

// One test per task, named after it, so a failure says which task.
for (const entry of entries) {
  test(entry.id + " matches its file", () => {
    // Spelling first: the Mac opens "W6-01.json" for "w6-01.json",
    // GitHub does not.
    const names = fs.readdirSync(path.join(TASKS, path.dirname(entry.file)));
    assert.ok(names.includes(path.basename(entry.file)), "tasks/ has no file spelt exactly " + entry.file);

    const task = JSON.parse(fs.readFileSync(path.join(TASKS, entry.file), "utf8"));
    assert.equal(task.id, entry.id);
    assert.equal(task.type, entry.type);
    assert.equal(task.title, entry.title);

    // Two to four hints during the rebuild.
    // Change both numbers to 3 after the task-by-task review.
    const hints = (task.hints || []).length;
    assert.ok(hints >= 2 && hints <= 4, "expected two to four hints, found " + hints);
  });
}