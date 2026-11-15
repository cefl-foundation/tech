
const test = require("node:test");
const assert = require("node:assert/strict");
const MiniPy = require("../js/python/minipy.js");

// The tokens of a program in a short form that is easy to read:
// "NAME move" for a token that has a text, "NEWLINE" for one that has none.
function tokens(code) {
  return MiniPy.tokenize(code).map((token) => (token.v === undefined ? token.t : token.t + " " + token.v));
}

// The error the tokenizer stops with.
function errorOf(code) {
  try { MiniPy.tokenize(code); } catch (error) { return error; }
  assert.fail("the tokenizer found no mistake");
}

// ---------- indentation ----------

test("an indented line: INDENT first, DEDENT when the block ends", () => {
  assert.deepEqual(tokens("    move()"),
    ["INDENT", "NAME move", "OP (", "OP )", "NEWLINE", "DEDENT", "EOF"]);
});

test("a deeper line opens a block and a shallower line closes it", () => {
  const code = [
    "def main():",
    "    move()",
    "main()"
  ].join("\n");
  assert.deepEqual(tokens(code), [
    "KW def", "NAME main", "OP (", "OP )", "OP :", "NEWLINE",
    "INDENT", "NAME move", "OP (", "OP )", "NEWLINE",
    "DEDENT", "NAME main", "OP (", "OP )", "NEWLINE",
    "EOF"
  ]);
});

test("two blocks can end on the same line", () => {
  const code = [
    "def main():",
    "    if front_is_clear():",
    "        move()",
    "main()"
  ].join("\n");
  const found = tokens(code);
  assert.equal(found.filter((token) => token === "INDENT").length, 2);
  // Both DEDENT tokens come straight before the last line's first token.
  const at = found.lastIndexOf("NAME main");
  assert.deepEqual(found.slice(at - 2, at), ["DEDENT", "DEDENT"]);
});

test("a line that sits between two levels is an IndentationError", () => {
  const code = [
    "if front_is_clear():",
    "        move()",
    "    move()"
  ].join("\n");
  const error = errorOf(code);
  assert.equal(error.kind, "IndentationError");
  assert.equal(error.line, 3);
});

// ---------- lines that give no tokens ----------

test("a comment, an empty line and an import line give no tokens", () => {
  const code = [
    "from rover.marsrover import *",
    "",
    "# Drive to the rock.",
    "move()  # one square"
  ].join("\n");
  assert.deepEqual(tokens(code), ["NAME move", "OP (", "OP )", "NEWLINE", "EOF"]);
});

test("every token knows the line it came from", () => {
  const code = [
    "# a comment on line 1",
    "",
    "move()"
  ].join("\n");
  const lines = MiniPy.tokenize(code).map((token) => token.line);
  assert.deepEqual(lines, [3, 3, 3, 3, 3]);   // NAME ( ) NEWLINE EOF
});

// ---------- strings ----------

test("a string keeps its text, without the quotes", () => {
  assert.deepEqual(tokens('print("hello, world!")'),
    ["NAME print", "OP (", "STRING hello, world!", "OP )", "NEWLINE", "EOF"]);
});

test("either kind of quote works, and the other kind can sit inside", () => {
  const found = MiniPy.tokenize("a = \"it's\"\nb = 'say \"hi\"'");
  const strings = found.filter((token) => token.t === "STRING").map((token) => token.v);
  assert.deepEqual(strings, ["it's", 'say "hi"']);
});

test("a backslash and n inside a string becomes a new line", () => {
  // In this JavaScript string, \\n is the two characters \ and n,
  // which is what a student types in Python.
  const found = MiniPy.tokenize('print("one\\ntwo")');
  assert.equal(found[2].v, "one\ntwo");
});

test("a string with no closing quote is a SyntaxError on its line", () => {
  const error = errorOf('move()\nprint("Hi)');
  assert.equal(error.kind, "SyntaxError");
  assert.equal(error.line, 2);
  assert.equal(error.msg, 'this string is missing its closing quote "');
});

// ---------- numbers, words and symbols ----------

test("a number stays as text, with or without a decimal point", () => {
  assert.deepEqual(tokens("x = 3 + 2.5 + .5"),
    ["NAME x", "OP =", "NUMBER 3", "OP +", "NUMBER 2.5", "OP +", "NUMBER .5", "NEWLINE", "EOF"]);
});

test("Python's own words are KW and every other word is NAME", () => {
  // True is Python's word. true is not: capital letters matter.
  assert.deepEqual(tokens("while True or true:"),
    ["KW while", "KW True", "KW or", "NAME true", "OP :", "NEWLINE", "EOF"]);
});

test("the longest symbol wins: == is one token, not two", () => {
  assert.deepEqual(tokens("a == b"), ["NAME a", "OP ==", "NAME b", "NEWLINE", "EOF"]);
  assert.deepEqual(tokens("a //= 2"), ["NAME a", "OP //=", "NUMBER 2", "NEWLINE", "EOF"]);
});

test("a character that Python does not use is a SyntaxError", () => {
  const error = errorOf("price = 5 ? 2");
  assert.equal(error.kind, "SyntaxError");
  assert.equal(error.msg, 'unexpected character "?"');
});

// ---------- brackets ----------

test("inside brackets a statement can run over two lines", () => {
  const code = [
    'print("a",',
    '      "b")'
  ].join("\n");
  // One NEWLINE, after the closing bracket. No INDENT for the second line.
  assert.deepEqual(tokens(code),
    ["NAME print", "OP (", "STRING a", "OP ,", "STRING b", "OP )", "NEWLINE", "EOF"]);
});

test("a bracket that is never closed is a SyntaxError", () => {
  const error = errorOf('print("Hi"');
  assert.equal(error.kind, "SyntaxError");
  assert.equal(error.msg, 'a bracket "(" was opened but never closed');
});