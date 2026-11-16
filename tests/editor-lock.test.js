
const test = require("node:test");
const assert = require("node:assert/strict");
const { lockRegions, isWhole, repair, isLocked } = require("../js/python/editor-lock.js");

// The starter of a console task: a docstring, main(), and the lines that call it.
const CONSOLE = [
  '"""',                                                         // line 1
  "File: helloworld.py",
  '"""',
  "",
  "",                                                            // line 5
  "def main():",                                                 // line 6: the first free line
  "    pass",
  "",
  "",                                                            // line 9: the last free line
  "# This provided line is required at the end of a Python",    // line 10
  "# file to call the main() function.",
  "if __name__ == '__main__':",
  "    main()",                                                  // line 13
  ""
].join("\n");

// The starter of a robot task: an import line, a helper with a comment
// above it, main(), and the lines that call it.
const ROBOT = [
  "from rover.marsrover import *",
  "",
  "",
  "# Turn right by turning left three times.",
  "def turn_right():",
  "    pass",
  "",
  "",
  "def main():",
  "    pass",
  "",
  "",
  "if __name__ == '__main__':",
  "    main()",
  ""
].join("\n");

test("the head is everything above the first def", () => {
  const lock = lockRegions(CONSOLE);
  assert.equal(lock.head, '"""\nFile: helloworld.py\n"""\n\n\n');
  assert.equal(lock.headLines, 5);
});

test("the tail is the if __name__ lines, with the comments above them", () => {
  const lock = lockRegions(CONSOLE);
  assert.equal(lock.tail, "\n# This provided line is required at the end of a Python\n# file to call the main() function.\nif __name__ == '__main__':\n    main()\n");
  assert.equal(lock.tailLines, 4);
});

test("an import line is locked, but a comment straight above a def is not", () => {
  const lock = lockRegions(ROBOT);
  assert.equal(lock.head, "from rover.marsrover import *\n\n\n");
  assert.equal(lock.headLines, 3);
  assert.equal(lock.tail, "\nif __name__ == '__main__':\n    main()\n");
  assert.equal(lock.tailLines, 2);
});

test("a starter with no def and no if __name__ line has nothing locked", () => {
  const lock = lockRegions("# Write your code below this line\n\n");
  assert.deepEqual(lock, { head: "", tail: "", headLines: 0, tailLines: 0 });
});

test("a starter that begins with the comment above its first def has no head", () => {
  const lock = lockRegions("# Say hello.\ndef main():\n    pass\n\n\nif __name__ == '__main__':\n    main()\n");
  assert.equal(lock.head, "");
  assert.equal(lock.tailLines, 2);
});

test("the starter itself is whole", () => {
  assert.equal(isWhole(lockRegions(CONSOLE), CONSOLE), true);
});

test("code without its last line is not whole", () => {
  const broken = CONSOLE.replace("    main()\n", "");
  assert.equal(isWhole(lockRegions(CONSOLE), broken), false);
});

test("repair gives code that lost its last two lines the whole tail back", () => {
  const lock = lockRegions(CONSOLE);
  const broken = CONSOLE.replace("    pass", '    print("hi")').replace("if __name__ == '__main__':\n    main()\n", "");
  const mended = repair(lock, broken);
  assert.equal(isWhole(lock, mended), true);
  assert.ok(mended.includes('    print("hi")'), "the student's own line is kept");
  assert.equal(mended.split("if __name__").length, 2, "the tail is there once");
});

test("repair gives code that lost its top the head back", () => {
  const lock = lockRegions(CONSOLE);
  const broken = CONSOLE.replace('"""\nFile: helloworld.py\n"""\n\n\n', "");
  assert.equal(repair(lock, broken), CONSOLE);
});

test("repair leaves whole code exactly as it is", () => {
  const lock = lockRegions(CONSOLE);
  const code = CONSOLE.replace("    pass", '    print("hello, world!")');
  assert.equal(repair(lock, code), code);
});

test("typing inside main() is allowed", () => {
  const lock = lockRegions(CONSOLE);
  const at = CONSOLE.indexOf("pass");
  assert.equal(isLocked(lock, CONSOLE, at, at + 4, "insert"), false);
});

test("typing in the docstring or in the last line is refused", () => {
  const lock = lockRegions(CONSOLE);
  const inDocstring = CONSOLE.indexOf("File:");
  const inLastLine = CONSOLE.indexOf("    main()") + 4;
  assert.equal(isLocked(lock, CONSOLE, inDocstring, inDocstring, "insert"), true);
  assert.equal(isLocked(lock, CONSOLE, inLastLine, inLastLine, "insert"), true);
});

test("Backspace at the start of the first free line is refused, typing there is not", () => {
  const lock = lockRegions(CONSOLE);
  const at = CONSOLE.indexOf("def main");
  assert.equal(isLocked(lock, CONSOLE, at, at, "back"), true);
  assert.equal(isLocked(lock, CONSOLE, at, at, "insert"), false);
});

test("Delete at the end of the last free line is refused, typing there is not", () => {
  const lock = lockRegions(CONSOLE);
  const at = CONSOLE.length - lock.tail.length;
  assert.equal(isLocked(lock, CONSOLE, at, at, "forward"), true);
  assert.equal(isLocked(lock, CONSOLE, at, at, "insert"), false);
});

test("deleting a selection that holds the whole program is refused", () => {
  const lock = lockRegions(CONSOLE);
  assert.equal(isLocked(lock, CONSOLE, 0, CONSOLE.length, "back"), true);
});

test("with nothing locked, every change is allowed", () => {
  const code = "print(1)\n";
  const lock = lockRegions(code);
  assert.equal(isLocked(lock, code, 0, 0, "back"), false);
  assert.equal(isLocked(lock, code, 0, code.length, "insert"), false);
});