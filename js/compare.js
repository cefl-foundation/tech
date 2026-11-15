
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

  // Only these two names can be seen from outside this file.
  return { compare: compare, normalise: normalise };
})();

// In the browser there is no "module", so this line does nothing.
// In Node it hands Compare to the tests.
if (typeof module !== "undefined") { module.exports = Compare; }