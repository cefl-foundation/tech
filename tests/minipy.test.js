
const test = require("node:test");
const assert = require("node:assert/strict");
const MiniPy = require("../js/python/minipy.js");

// Run a program to the end and return everything it printed.
// inputs holds what the user "types": one piece of text for each input().
function run(code, inputs) {
  const runner = new MiniPy.Runner(code, { inputs: inputs || [] });
  for (const step of runner.run()) { /* nothing to draw in a test */ }
  return runner.out;
}

test("a one-line program prints its line", () => {
  assert.equal(run('print("hello, world!")'), "hello, world!\n");
});

test("a program in the shape of the site's tasks runs main() once", () => {
  const code = [
    "from rover.marsrover import *",
    "",
    "# File: hello.py",
    "# --------------",
    "# Says hello.",
    "",
    "def main():",
    '    print("Hello")',
    "",
    "",
    "if __name__ == '__main__':",
    "    main()",
    ""
  ].join("\n");
  assert.equal(run(code), "Hello\n");
});

test("a loop repeats its block", () => {
  const code = [
    "for i in range(1, 4):",
    '    print(str(i) + " x 5 = " + str(i * 5))'
  ].join("\n");
  assert.equal(run(code), "1 x 5 = 5\n2 x 5 = 10\n3 x 5 = 15\n");
});

test("a mistake stops the program with a kind, a line number and a message", () => {
  assert.throws(() => run('print("Hi")\nprint(10 / 0)'), (error) => {
    assert.equal(error.kind, "ZeroDivisionError");
    assert.equal(error.line, 2);
    assert.equal(error.msg, "division by zero");
    return true;
  });
});