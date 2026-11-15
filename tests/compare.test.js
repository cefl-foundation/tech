
const test = require("node:test");
const assert = require("node:assert/strict");
const { compare, normalise } = require("../js/compare.js");

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