
const test = require("node:test");
const assert = require("node:assert/strict");
const { compare, normalise, diffHint } = require("../js/compare.js");

test("the default rule ignores spaces at the end of a line and blank lines at the end", () => {
  assert.equal(compare(undefined, "hello, world!\n", "hello, world!   \n\n"), true);
});

test("the default rule keeps spaces inside a line", () => {
  assert.equal(compare(undefined, "hello, world!", "hello,  world!"), false);
});

test("Windows line endings count as ordinary ones", () => {
  assert.equal(normalise("a\r\nb\r\n"), "a\nb");
});

test("exact still compares the final newline", () => {
  assert.equal(compare("exact", "Hello\n", "Hello"), false);
});

test("contains finds the text anywhere in the output", () => {
  assert.equal(compare("contains", "total is 26", "The total is 26.\n"), true);
});

test("a broken pattern fails instead of crashing", () => {
  assert.equal(compare("regex", "(", "anything"), false);
});

test("trimmed ignores spaces and blank lines at both ends", () => {
  assert.equal(compare("trimmed", "Pass", "\n  Pass  \n\n"), true);
});

test("regex: with the m flag, ^ and $ work on every line", () => {
  assert.equal(compare("regex", "^The total is \\d+\\.$", "The total is 26.\nBye\n"), true);
});

// ---------- diffHint(expected, actual) ----------

test("diffHint: only capital letters differ", () => {
  assert.equal(diffHint("hello, world!\n", "Hello, world!\n"),
    "Line 1 differs only in capital letters - Python compares text exactly.");
});

test("diffHint: only spaces differ", () => {
  assert.equal(diffHint("The total is 26.\n", "The total is  26 .\n"),
    "Line 1 differs only in spaces. Check the spaces inside your strings, and remember that commas in print() add a space.");
});

test("diffHint: a line is missing", () => {
  assert.equal(diffHint("150 students are absent.\n147 students are absent.\n", "150 students are absent.\n"),
    "Line 2 is missing from your output.");
});

test("diffHint: there is an extra line", () => {
  assert.equal(diffHint("Pass\n", "Pass\nFail\n"), "Your program printed an extra line 2.");
});

test("diffHint: any other difference names the first line that differs", () => {
  assert.equal(diffHint("1 x 5 = 5\n2 x 5 = 10\n", "1 x 5 = 5\n2 x 5 = 12\n"),
    "The first difference is on line 2. Compare the two versions character by character.");
});

test("diffHint: a program that printed nothing is missing line 1", () => {
  assert.equal(diffHint("hello, world!\n", ""), "Line 1 is missing from your output.");
});

test("diffHint: outputs that pass the hub's rule get no sentence", () => {
  assert.equal(diffHint("hello, world!\n", "hello, world!   \n\n"), "");
});