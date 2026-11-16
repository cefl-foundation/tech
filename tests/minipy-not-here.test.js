
const test = require("node:test");
const assert = require("node:assert/strict");
const MiniPy = require("../js/python/minipy.js");

// What MiniPy says about a program when it reads it: MiniPy.check() gives
// the error, or null. This helper expects the NotInMiniPy message, with
// these words in it. If something else comes back, the test shows it.
function expectNotHere(code, words) {
  const error = MiniPy.check(code);
  assert.ok(error, "MiniPy found nothing to say about: " + code);
  assert.equal(error.kind, "NotInMiniPy", error.kind + ": " + error.msg);
  assert.ok(error.msg.includes(words), error.msg);
  return error;
}

// ---------- the three in the plan ----------

test("a list gets a message that names lists", () => {
  expectNotHere("marks = [1, 2, 3]", "lists");
});

test("the message says that it is real Python and not a mistake, and gives the line", () => {
  const code = [
    "def main():",
    "    marks = [1, 2, 3]",
    "",
    "main()"
  ].join("\n");
  const error = expectNotHere(code, "lists");
  assert.equal(error.msg, "This site does not use lists. That is real Python, so you have not made a mistake.");
  assert.equal(error.line, 2);
});

test("an f-string gets a message that names f-strings and says what to write", () => {
  const error = expectNotHere('name = "Ada"\nprint(f"Hi {name}")', "f-strings");
  assert.ok(error.msg.endsWith('Join the pieces with + instead: "Total: " + str(total)'), error.msg);
  assert.equal(error.line, 2);
});

test("a method gets a message that names it", () => {
  expectNotHere('name = "Ada"\nprint(name.upper())', ".upper()");
});

test("a command from a module gets the same message", () => {
  const error = expectNotHere("import random\nnumber = random.randint(1, 6)", ".randint()");
  assert.equal(error.line, 2);
});

// ---------- what must stay as it was ----------

test("a real mistake is still an ordinary error", () => {
  assert.equal(MiniPy.check('print("Hi"').kind, "SyntaxError");
  assert.equal(MiniPy.check('print("Hi)').kind, "SyntaxError");
});

test("a full stop at the end of a line is still an ordinary error", () => {
  const error = MiniPy.check("move().");
  assert.equal(error.kind, "SyntaxError");
  assert.equal(error.msg, 'unexpected character "."');
});

test("f is still a name, and .5 is still a number", () => {
  assert.equal(MiniPy.check("f = 3\nprint(f + .5)"), null);
});

// ---------- more signs of the same kind ----------

test("square brackets after a name get a message, with a tip about round brackets", () => {
  const error = expectNotHere('word = "hello"\nfirst = word[0]', "square brackets after a name");
  assert.ok(error.msg.endsWith("To call a function, use round brackets: move()"), error.msg);
});

test("** gets a message that says what to write", () => {
  const error = expectNotHere("print(2 ** 3)", "** for powers");
  assert.ok(error.msg.endsWith("Multiply instead: 2 ** 3 is 2 * 2 * 2"), error.msg);
});

test("a word that the site does not use is named in the message", () => {
  expectNotHere("class Dog:\n    pass", "classes");
  expectNotHere('try:\n    number = int("a")\nexcept ValueError:\n    print("no")', "try and except");
  expectNotHere("def count():\n    global total\n    total = 1", 'the word "global"');
});

test('"is" comes with a tip to use ==', () => {
  const error = expectNotHere("if answer is None:\n    pass", 'the word "is"');
  assert.ok(error.msg.endsWith("Use == to compare two values."), error.msg);
});

test("two comparisons in a row get a message, with a tip to use and", () => {
  const error = expectNotHere("if 0 <= mark <= 100:\n    pass", "two comparisons in a row");
  assert.ok(error.msg.endsWith("Join two comparisons with and: mark >= 0 and mark <= 100"), error.msg);
});

test("one comparison is read as before, and so are two that are joined by and", () => {
  assert.equal(MiniPy.check("if mark >= 0 and mark <= 100:\n    pass"), null);
  // The brackets make one value of the first comparison, so this is one comparison too.
  assert.equal(MiniPy.check("same = (1 < 2) == True"), null);
});