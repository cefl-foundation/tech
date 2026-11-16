
const Dom = (function () {
  "use strict";

// Make a new element.
// make("p", "intro", "Hello") gives <p class="intro">Hello</p>.
// The content goes in as plain text, so < and > in it are shown as
// they are and never read as HTML.
  function make(tag, className, content) {
    const node = document.createElement(tag);
    if (className) { node.className = className; }
    if (content != null) { node.textContent = content; }
    return node;
  }

    // Empty an element: take out everything that is inside it.
  function clear(node) {
    while (node && node.firstChild) { node.removeChild(node.firstChild); }
  }

  // Change the text of an element. A missing element is left alone.
  function text(node, value) {
    if (node) { node.textContent = value; }
  }

    // Make text safe to put into a string of HTML.
  // esc("<b>") gives "&lt;b&gt;", which the browser shows as <b>.
  function esc(value) {
    const swaps = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return swaps[character];
    });
  }

  // Make text safe, as esc() does, and show the text between two ` marks
  // as code: code("Use `print()` here") gives "Use <code>print()</code> here".
  // `between` can be left out. If it is given, it is a function, and the
  // safe text outside the code goes through it on the way: the task page
  // uses it to put the words of the word bank in bold.
  function code(value, between) {
    const parts = String(value == null ? "" : value).split("`");
    let html = "";
    parts.forEach(function (part, i) {
      if (i % 2 === 1) {
        html += "<code>" + esc(part) + "</code>";   // every second part was between two ` marks
      } else {
        html += between ? between(esc(part)) : esc(part);
      }
    });
    return html;
  }

  // Only these five names can be seen from outside this file.
  return { make: make, clear: clear, text: text, esc: esc, code: code };
})();