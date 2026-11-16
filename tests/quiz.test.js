
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pick, isRight, groupOf } = require("../js/python/quick-practice.js");

const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "tasks", "quiz.json"), "utf8"));

// One test per group, named after it, so a failure says which group.
for (const group of Object.keys(quiz)) {
  test("every question in the " + group + " group is complete", () => {
    assert.ok(quiz[group].length >= 2, "a task shows two questions, so a group needs at least two");
    quiz[group].forEach(function (question, i) {
      const where = group + " question " + (i + 1);
      assert.ok(question.q && question.why, where + " needs a q and a why");
      if (question.type === "mc") {
        assert.ok(question.options.length >= 2, where + " needs at least two options");
        assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length,
          where + ": answer must be the number of one of its options");
      } else {
        assert.equal(question.type, "gap", where + ' must be "mc" or "gap"');
        assert.ok(question.accept.length >= 1, where + " needs at least one accepted answer");
        for (const word of question.accept) {
          assert.equal(word, word.trim().toLowerCase(), where + ': "' + word + '" must be in small letters, with no spaces at its ends');
        }
      }
    });
  });
}

test("a console task uses the console group, a robot task the group of its world", () => {
  assert.equal(groupOf({ type: "console" }), "console");
  assert.equal(groupOf({ type: "robot", world: "mars" }), "mars");
});

test("task 1 gets questions 1 and 2, and task 2 gets questions 3 and 4", () => {
  const six = ["q1", "q2", "q3", "q4", "q5", "q6"];
  assert.deepEqual(pick(six, "console-w3-01"), ["q1", "q2"]);
  assert.deepEqual(pick(six, "console-w3-02"), ["q3", "q4"]);
});

test("after the last question the count starts at the top again", () => {
  const six = ["q1", "q2", "q3", "q4", "q5", "q6"];
  assert.deepEqual(pick(six, "console-w3-04"), ["q1", "q2"]);
  assert.deepEqual(pick(six, "console-w3-08"), ["q3", "q4"]);
});

test("a group with no questions gives no questions", () => {
  assert.deepEqual(pick(undefined, "console-w3-01"), []);
});

test("a typed answer is right whatever its capitals and its punctuation", () => {
  const question = { type: "gap", accept: ["range"] };
  assert.equal(isRight(question, "  Range. "), true);
  assert.equal(isRight(question, "ranges"), false);
});

test("a chosen option is right when its number is the answer", () => {
  const question = { type: "mc", options: ["an int", "a float", "a string"], answer: 2 };
  assert.equal(isRight(question, "2"), true);   // a form hands the number over as text
  assert.equal(isRight(question, "0"), false);
});