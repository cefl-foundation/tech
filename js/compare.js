
const Compare = (function () {
  "use strict";

  // The hub's rule. Windows line endings become ordinary ones, and the
  // spaces at the end of each line and the blank lines at the end go.
  function normalise(text) {
    return String(text).replace(/\r/g, "").split("\n")
      .map(function (line) { return line.replace(/\s+$/, ""); })
      .join("\n").replace(/\n+$/, "");
  }

  // true when the output passes, false when it does not.
  function compare(match, expected, actual) {
    const e = String(expected).replace(/\r\n/g, "\n");
    const a = String(actual).replace(/\r\n/g, "\n");
    switch (match) {
      case "exact":    return a === e;
      case "trimmed":  return a.trim() === e.trim();
      case "contains": return a.includes(e);
      case "regex":
        try { return new RegExp(e, "m").test(a); }
        catch (error) { return false; }   // a broken pattern fails; it does not crash the page
      default:         return normalise(a) === normalise(e);
    }
  }

  // The lines of an output under the hub's rule. No output at all is no
  // lines, not one empty line.
  function linesOf(text) {
    const clean = normalise(text);
    return clean === "" ? [] : clean.split("\n");
  }

  // The first difference between the output a test expects and the output
  // a program gave, as a sentence for the student. "" when the hub's rule
  // finds no difference.
  function diffHint(expected, actual) {
    const want = linesOf(expected);
    const got = linesOf(actual);
    const longest = Math.max(want.length, got.length);
    for (let i = 0; i < longest; i++) {
      if (got[i] === want[i]) { continue; }   // the same: look at the next line
      const n = i + 1;                        // people count lines from 1
      if (got[i] === undefined) { return `Line ${n} is missing from your output.`; }
      if (want[i] === undefined) { return `Your program printed an extra line ${n}.`; }
      if (got[i].toLowerCase() === want[i].toLowerCase()) {
        return `Line ${n} differs only in capital letters - Python compares text exactly.`;
      }
      if (got[i].replace(/\s/g, "") === want[i].replace(/\s/g, "")) {
        return `Line ${n} differs only in spaces. Check the spaces inside your strings, and remember that commas in print() add a space.`;
      }
      return `The first difference is on line ${n}. Compare the two versions character by character.`;
    }
    return "";
  }

  // Only these three names can be seen from outside this file.
  return { compare: compare, normalise: normalise, diffHint: diffHint };
})();

// In the browser there is no "module", so this line does nothing.
// In Node it hands Compare to the tests.
if (typeof module !== "undefined") { module.exports = Compare; }