
const test = require("node:test");
const assert = require("node:assert/strict");
const { run, hasMain, missing, check } = require("../js/python/console-check.js");

// A small task: ask for two numbers and print their total.
const task = {
  tests: [
    { stdin: ["9", "17"], expectedStdout: "Enter first number: 9\nEnter second number: 17\nThe total is 26.\n" },
    { stdin: ["100", "-1"], expectedStdout: "Enter first number: 100\nEnter second number: -1\nThe total is 99.\n" }
  ],
  requires: [{ pattern: "\\bint\\s*\\(", message: "Convert the text with `int()`." }]
};

// Wrap the lines of main() in a whole program.
function program(lines) {
  return "def main():\n" + lines.map((line) => "    " + line + "\n").join("") + "\n\nif __name__ == '__main__':\n    main()\n";
}

const RIGHT = program([
  'num1 = int(input("Enter first number: "))',
  'num2 = int(input("Enter second number: "))',
  'print("The total is " + str(num1 + num2) + ".")'
]);

test("run() gives back what the program printed, typed answers included", () => {
  const result = run(RIGHT, ["9", "17"]);
  assert.equal(result.error, null);
  assert.equal(result.output, "Enter first number: 9\nEnter second number: 17\nThe total is 26.\n");
});

test("run() marks the pieces of the output that were typed", () => {
  const typed = run(RIGHT, ["9", "17"]).pieces.filter((piece) => piece.typed).map((piece) => piece.text);
  assert.deepEqual(typed, ["9\n", "17\n"]);
});

test("run() hands back the error that stopped a program, and what was printed before it", () => {
  const result = run(program(['print("one")', "prnt(2)"]), []);
  assert.equal(result.output, "one\n");
  assert.equal(result.error.kind, "NameError");
  assert.equal(result.error.line, 3);
});

test("a program that cannot be read at all gives an error and no output", () => {
  const result = run("def main(:\n    pass\n", []);
  assert.equal(result.output, "");
  assert.equal(result.error.kind, "SyntaxError");
});

test("hasMain() looks for a function called main", () => {
  assert.equal(hasMain(RIGHT), true);
  assert.equal(hasMain('print("hello")\n'), false);
});

test("a right program passes every test", () => {
  const result = check(task, RIGHT);
  assert.equal(result.passed, true);
  assert.deepEqual(result.tests.map((t) => t.passed), [true, true]);
});

test("each test runs the whole program again with its own answers", () => {
  const result = check(task, RIGHT);
  assert.equal(result.tests[1].output, task.tests[1].expectedStdout);
  assert.deepEqual(task.tests[0].stdin, ["9", "17"], "the task's own list of answers is not used up");
});

test("a wrong output fails its test and gets a sentence about the first difference", () => {
  const wrong = RIGHT.replace("The total is", "the total is");
  const result = check(task, wrong);
  assert.equal(result.passed, false);
  assert.equal(result.tests[0].passed, false);
  assert.equal(result.tests[0].hint, "Line 3 differs only in capital letters - Python compares text exactly.");
});

test("a program that stops with an error fails its test and gets no sentence", () => {
  const result = check(task, RIGHT.replace("int(input(\"Enter first number: \"))", "input(\"Enter first number: \")"));
  assert.equal(result.tests[0].passed, false);
  assert.equal(result.tests[0].error.kind, "TypeError");
  assert.equal(result.tests[0].hint, "");
});

test("the right output is not enough when the code misses what the task requires", () => {
  // Adds the two answers of the first test by hand: right output for test 1 only.
  const cheat = program(['input("Enter first number: ")', 'input("Enter second number: ")', 'print("The total is 26.")']);
  assert.deepEqual(missing(task, cheat), ["Convert the text with `int()`."]);
  assert.deepEqual(missing(task, RIGHT), []);
  assert.equal(check(task, cheat).passed, false);
});

test("a broken pattern in a task file counts as not met, and nothing crashes", () => {
  const broken = { tests: task.tests, requires: [{ pattern: "(", message: "The pattern is broken." }] };
  assert.deepEqual(missing(broken, RIGHT), ["The pattern is broken."]);
});

test("a task with no tests is never passed", () => {
  assert.equal(check({ tests: [] }, RIGHT).passed, false);
});