
const EditorLock = (function () {
  "use strict";

  // Work out the locked top and bottom of a starter program:
  //   head        the text above the first "def", or "" if nothing is locked there
  //   tail        the text from the "if __name__" line to the end, or ""
  //   headLines   how many lines the head has
  //   tailLines   how many lines the tail has
  // The head ends with a line break. The tail begins with one: the line
  // break that ends the last line a student may change.
  function lockRegions(starter) {
    const lines = starter.split("\n");
    let head = "";
    let tail = "";

    // The head stops where the first function starts. Comments straight
    // above that "def" belong to the function, so they stay free.
    const firstDef = lines.findIndex((line) => /^def\s/.test(line));
    let headEnd = firstDef;
    while (headEnd > 0 && /^\s*#/.test(lines[headEnd - 1])) { headEnd--; }
    if (headEnd > 0) {
      head = lines.slice(0, headEnd).join("\n") + "\n";
    }

    // The tail starts at the last "if __name__" line. Comments straight
    // above it explain it, so they are locked with it.
    let footer = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^if\s+__name__\s*==/.test(lines[i])) { footer = i; break; }
    }
    let tailStart = footer;
    while (tailStart > 0 && /^\s*#/.test(lines[tailStart - 1])) { tailStart--; }
    if (tailStart > 0) {
      tail = "\n" + lines.slice(tailStart).join("\n");
    }

    // An empty last item means the starter ends with a line break: it is
    // not a line of its own.
    const lastIsEmpty = lines[lines.length - 1] === "";
    return {
      head: head,
      tail: tail,
      headLines: head ? headEnd : 0,
      tailLines: tail ? lines.length - tailStart - (lastIsEmpty ? 1 : 0) : 0
    };
  }

  // true when the code still begins with the head and ends with the tail.
  function isWhole(lock, code) {
    return code.length >= lock.head.length + lock.tail.length &&
      code.startsWith(lock.head) && code.endsWith(lock.tail);
  }

  // Give code that has lost its head or its tail both of them back, and
  // keep what the student wrote in between.
  function repair(lock, code) {
    if (isWhole(lock, code)) { return code; }
    let middle = code;

    // Take the top off: the head if it is still there, and if not,
    // everything above the first "def".
    if (lock.head && middle.startsWith(lock.head)) {
      middle = middle.slice(lock.head.length);
    } else {
      const lines = middle.split("\n");
      const firstDef = lines.findIndex((line) => /^def\s/.test(line));
      if (firstDef > 0) { middle = lines.slice(firstDef).join("\n"); }
    }

    // Take the bottom off: the tail if it is still there, and if not,
    // everything from "if __name__" to the end.
    if (lock.tail && middle.endsWith(lock.tail)) {
      middle = middle.slice(0, middle.length - lock.tail.length);
    } else {
      const footer = middle.search(/\n*if\s+__name__\s*==[\s\S]*$/);
      if (footer >= 0) { middle = middle.slice(0, footer); }
    }

    // Two empty lines before the tail, as in the starters.
    middle = middle.replace(/\s+$/, "") + (lock.tail ? "\n\n" : "\n");
    return lock.head + middle + lock.tail;
  }

  // Would a change at this place in the code touch a locked line?
  //   start, end   where the selection begins and ends, counted in
  //                characters (the same number twice when nothing is selected)
  //   kind         "insert" for typing and pasting, "back" for Backspace,
  //                "forward" for Delete
  function isLocked(lock, code, start, end, kind) {
    const firstFree = lock.head.length;                // the first place a student may type
    const lastFree = code.length - lock.tail.length;   // the last place
    if (start < firstFree || end > lastFree) { return true; }

    // With nothing selected, Backspace removes the character before the
    // cursor and Delete the one after it. At the two edges of the free
    // part, that character is a locked line break.
    const nothingSelected = start === end;
    if (nothingSelected && kind === "back" && lock.head && start === firstFree) { return true; }
    if (nothingSelected && kind === "forward" && lock.tail && start === lastFree) { return true; }
    return false;
  }

  // Only these four names can be seen from outside this file.
  return { lockRegions: lockRegions, isWhole: isWhole, repair: repair, isLocked: isLocked };
})();

// In the browser there is no "module", so this line does nothing.
// In Node it hands EditorLock to the tests.
if (typeof module !== "undefined") { module.exports = EditorLock; }