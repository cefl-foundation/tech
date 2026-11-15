
const test = require("node:test");
const assert = require("node:assert/strict");
const { makeProgress } = require("../js/progress.js");

// A fake localStorage: it keeps text in an ordinary object. It has the
// three methods progress.js uses, and nothing else.
function fakeStorage() {
  const items = {};
  return {
    getItem: (key) => (key in items ? items[key] : null),
    setItem: (key, value) => { items[key] = String(value); },
    removeItem: (key) => { delete items[key]; }
  };
}

const task = { title: "Page structure and headings", week: 6 };

test("a passed task is still passed when the page is opened again", () => {
  const storage = fakeStorage();
  makeProgress(storage).markPassed("web-w6-01", task);
  const reopened = makeProgress(storage);   // a new page, the same browser
  assert.equal(reopened.get("web-w6-01").status, "passed");
});

test("opening a passed task again does not make it started", () => {
  const progress = makeProgress(fakeStorage());
  progress.markPassed("web-w6-01", task);
  progress.markStarted("web-w6-01", task);
  assert.equal(progress.get("web-w6-01").status, "passed");
});

test("each Check adds one attempt", () => {
  const progress = makeProgress(fakeStorage());
  progress.recordAttempt("web-w6-01", task);
  progress.recordAttempt("web-w6-01", task);
  assert.equal(progress.get("web-w6-01").attempts, 2);
});

test("the time of the first pass is kept when the task is passed again", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-20T09:05:00Z") });
  const progress = makeProgress(fakeStorage());
  progress.markPassed("web-w6-01", task);
  t.mock.timers.setTime(new Date("2026-11-20T09:30:00Z").getTime());
  progress.markPassed("web-w6-01", task);
  assert.equal(progress.get("web-w6-01").firstPassedAt, "2026-11-20T09:05:00.000Z");
});

test("code is saved once typing has stopped for 400 ms", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const progress = makeProgress(fakeStorage());
  progress.saveCode("web-w6-01", task, "<h1>My page</h1>");
  t.mock.timers.tick(399);
  assert.equal(progress.get("web-w6-01"), null);
  t.mock.timers.tick(1);
  assert.equal(progress.get("web-w6-01").lastCode, "<h1>My page</h1>");
});

test("each key press starts the 400 ms wait again", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const progress = makeProgress(fakeStorage());
  progress.saveCode("web-w6-01", task, "<h1>My");
  t.mock.timers.tick(300);
  progress.saveCode("web-w6-01", task, "<h1>My page</h1>");
  t.mock.timers.tick(300);
  assert.equal(progress.get("web-w6-01"), null);
  t.mock.timers.tick(100);
  assert.equal(progress.get("web-w6-01").lastCode, "<h1>My page</h1>");
});

test("new answers are added to the answers saved before", () => {
  const progress = makeProgress(fakeStorage());
  progress.saveData("web-w6-04", task, { ticked: ["alt"] });
  progress.flush();
  progress.saveData("web-w6-04", task, { written: "a server" });
  progress.flush();
  assert.deepEqual(progress.getData("web-w6-04"), { ticked: ["alt"], written: "a server" });
});

test("the summary counts passed tasks week by week", () => {
  const index = { weeks: [
    { week: 6, title: "The frontend", tasks: [{ id: "web-w6-01" }, { id: "web-w6-02" }, { id: "web-w6-03" }] },
    { week: 7, title: "The backend", tasks: [{ id: "web-w7-01" }] }
  ] };
  const progress = makeProgress(fakeStorage());
  progress.markPassed("web-w6-01", task);
  progress.markStarted("web-w6-02", task);
  assert.deepEqual(progress.summary(index), [
    { week: 6, title: "The frontend", done: 1, total: 3 },
    { week: 7, title: "The backend", done: 0, total: 1 }
  ]);
});

test("clearAll removes everything, and a change still waiting does not come back", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const progress = makeProgress(fakeStorage());
  progress.markPassed("web-w6-01", task);
  progress.saveCode("web-w6-02", task, "<p>Hi</p>");
  assert.equal(progress.clearAll(), true);
  t.mock.timers.tick(400);
  assert.equal(progress.get("web-w6-01"), null);
  assert.equal(progress.get("web-w6-02"), null);
});

test("without storage nothing is saved and nothing breaks", () => {
  const progress = makeProgress(null);
  assert.equal(progress.available(), false);
  progress.markPassed("web-w6-01", task);
  assert.equal(progress.get("web-w6-01"), null);
  assert.equal(progress.clearAll(), false);
});