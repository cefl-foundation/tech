
const test = require("node:test");
const assert = require("node:assert/strict");
const MiniPy = require("../js/python/minipy.js");

// Run a program to the end and return everything it printed.
// options is what a page hands to the Runner: inputs, builtins, maxSteps, onPrint.
function run(code, options) {
  const runner = new MiniPy.Runner(code, options || {});
  for (const step of runner.run()) { /* nothing to draw in a test */ }
  return runner.out;
}

// The error a program stops with.
function errorOf(code, options) {
  try { run(code, options); } catch (error) { return error; }
  assert.fail("the program ran to the end without an error");
}

// ---------- numbers and text ----------

test("/ gives a decimal number and // gives a whole number", () => {
  assert.equal(run("print(7 / 2)\nprint(8 / 2)\nprint(7 // 2)"), "3.5\n4.0\n3\n");
});

test("// and % round down for a negative number, as Python does", () => {
  assert.equal(run("print(-7 // 2)\nprint(-7 % 3)"), "-4\n2\n");
});

test("text plus a number is a TypeError that says what to do", () => {
  const error = errorOf('print("Total: " + 5)');
  assert.equal(error.kind, "TypeError");
  assert.ok(error.msg.includes("wrap the number in str( )"), error.msg);
});

// ---------- variables ----------

test("a variable keeps its value until the program changes it", () => {
  const code = [
    "total = 5",
    "total = total + 2",
    "total += 3",
    "print(total)"
  ].join("\n");
  assert.equal(run(code), "10\n");
});

test("changing a variable that has no value yet is a NameError", () => {
  const error = errorOf("count += 1");
  assert.equal(error.kind, "NameError");
  assert.equal(error.line, 1);
});

// ---------- functions ----------

test("a function hands its value back to the line that called it", () => {
  const code = [
    "def double(n):",
    "    return n * 2",
    "",
    "print(double(21))"
  ].join("\n");
  assert.equal(run(code), "42\n");
});

test("a function with no return hands back None", () => {
  const code = [
    "def greet():",
    '    print("hi")',
    "",
    "answer = greet()",
    "print(answer)"
  ].join("\n");
  assert.equal(run(code), "hi\nNone\n");
});

test("a function has its own variables: another function cannot see them", () => {
  const code = [
    "def main():",
    "    x = 5",
    "    show()",
    "",
    "def show():",
    "    print(x)",
    "",
    "main()"
  ].join("\n");
  const error = errorOf(code);
  assert.equal(error.kind, "NameError");
  assert.equal(error.line, 6);
});

test("a function can read a variable of the top level", () => {
  const code = [
    "def helper():",
    "    return bonus + 42",
    "",
    "bonus = 1",
    "print(helper())"
  ].join("\n");
  assert.equal(run(code), "43\n");
});

test("a function's name without brackets is explained", () => {
  const error = errorOf("def main():\n    pass\n\nmain");
  assert.equal(error.kind, "SyntaxError");
  assert.equal(error.msg, "'main' is a function. To call it you need brackets: main()");
});

// ---------- input() ----------

test("input() takes its answers from the list, in order, and shows them", () => {
  const code = [
    "def main():",
    '    a = int(input("Enter first number: "))',
    '    b = int(input("Enter second number: "))',
    '    print("The total is " + str(a + b) + ".")',
    "",
    "main()"
  ].join("\n");
  assert.equal(run(code, { inputs: ["9", "17"] }),
    "Enter first number: 9\nEnter second number: 17\nThe total is 26.\n");
});

test("input() with nothing left to type is an EOFError", () => {
  const code = [
    'name = input("Name: ")',
    'age = input("Age: ")'
  ].join("\n");
  const error = errorOf(code, { inputs: ["Ada"] });
  assert.equal(error.kind, "EOFError");
  assert.equal(error.line, 2);
});

// ---------- mistakes ----------

test("a misspelt name is a NameError that suggests the right name", () => {
  const error = errorOf('pritn("Hi")');
  assert.equal(error.kind, "NameError");
  assert.equal(error.msg, "name 'pritn' is not defined. Did you mean \"print\"? Check the spelling.");
});

test("capital letters matter in a name", () => {
  const error = errorOf('Print("Hi")');
  assert.equal(error.kind, "NameError");
  assert.ok(error.msg.includes("Names are case sensitive."), error.msg);
});

test('int("abc") is a ValueError', () => {
  const error = errorOf('number = int("abc")');
  assert.equal(error.kind, "ValueError");
  assert.equal(error.line, 1);
});

// ---------- the step limit ----------

test("a loop that never ends is stopped after 20,000 steps", () => {
  const error = errorOf("while True:\n    pass");
  assert.equal(error.kind, "RuntimeError");
  assert.ok(error.msg.includes("more than 20000 steps"), error.msg);
});

test("a loop of 9,000 turns is allowed to finish", () => {
  // Each turn costs two steps: one for the loop and one for the line inside it.
  const code = [
    "n = 0",
    "while n < 9000:",
    "    n += 1",
    "print(n)"
  ].join("\n");
  assert.equal(run(code), "9000\n");
});

test("maxSteps changes the limit", () => {
  const error = errorOf("while True:\n    pass", { maxSteps: 50 });
  assert.ok(error.msg.includes("more than 50 steps"), error.msg);
});

// ---------- what the page gets ----------

test("a command marked step pauses the program after each call", () => {
  let moves = 0;
  const commands = { move: { fn: () => { moves += 1; return null; }, step: true, arity: 0 } };
  const code = [
    "def main():",
    "    move()",
    "    move()",
    "",
    "main()"
  ].join("\n");
  const program = new MiniPy.Runner(code, { builtins: commands }).run();

  assert.equal(moves, 0);                 // run() on its own has not started the program

  const first = program.next();           // run as far as the first pause
  assert.equal(moves, 1);
  assert.deepEqual(first.value, { line: 2, name: "move" });

  const second = program.next();          // carry on as far as the second pause
  assert.equal(moves, 2);
  assert.deepEqual(second.value, { line: 3, name: "move" });

  const last = program.next();            // carry on to the end
  assert.equal(last.done, true);
});

test("a command without step gives its answer and does not pause", () => {
  const commands = { front_is_clear: { fn: () => false, arity: 0 } };
  const program = new MiniPy.Runner("print(front_is_clear())", { builtins: commands }).run();
  const only = program.next();
  assert.equal(only.done, true);
  assert.equal(only.value, "False\n");    // at the end run() hands back the whole output
});

test("a command is refused when it gets the wrong number of values", () => {
  const commands = { move: { fn: () => null, step: true, arity: 0 } };
  const error = errorOf("move(3)", { builtins: commands });
  assert.equal(error.kind, "TypeError");
  assert.ok(error.msg.includes("move() takes 0 arguments but 1 were given"), error.msg);
});

test("onPrint is told about each piece of output, and which piece was typed", () => {
  const seen = [];
  run('name = input("Name: ")\nprint("Hi " + name)', {
    inputs: ["Ada"],
    onPrint: (text, isInput) => { seen.push([text, isInput]); }
  });
  assert.deepEqual(seen, [["Name: ", false], ["Ada\n", true], ["Hi Ada\n", false]]);
});