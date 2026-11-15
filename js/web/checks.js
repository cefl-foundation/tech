
const Checks = (function () {
  "use strict";

  const WHITE = [255, 255, 255, 1];

  function title(check, page) {
    return page.title.trim() !== "";
  }

  function count(check, page) {
    const found = page.querySelectorAll(check.selector).length;
    if (check.exact != null && found !== check.exact) { return false; }
    if (check.min != null && found < check.min) { return false; }
    if (check.max != null && found > check.max) { return false; }
    return true;
  }

  // The computed style is the value the browser really uses once every rule
  // has been applied, always written the same way: colours as rgb(), sizes in px.
  function style(check, page, view) {
    const node = page.querySelector(check.selector);
    if (node === null) { return false; }
    const value = view.getComputedStyle(node).getPropertyValue(check.property);
    if (check.notIn && check.notIn.includes(value)) { return false; }
    if (check.equals != null && value !== check.equals) { return false; }
    if (check.min != null) {
      const number = parseFloat(value);
      if (isNaN(number) || number < check.min) { return false; }
    }
    return true;
  }

  function every(check, page) {
    const nodes = Array.from(page.querySelectorAll(check.selector));
    return nodes.length > 0 && nodes.every(function (node) { return node.matches(check.matches); });
  }

  // A control has a label if it sits inside a <label>, or if a <label for="...">
  // with words in it names the control's id.
  function labelled(check, page) {
    const controls = Array.from(page.querySelectorAll(check.selector || "input, select, textarea"));
    const labels = Array.from(page.querySelectorAll("label[for]"));
    return controls.length > 0 && controls.every(function (control) {
      if (control.closest("label") !== null) { return true; }
      return control.id !== "" && labels.some(function (label) {
        return label.htmlFor === control.id && label.textContent.trim() !== "";
      });
    });
  }

  // The first background colour behind an element that is not see-through:
  // its own, or its parent's, and so on up. White if none has one.
  function colourBehind(node, view) {
    for (let n = node; n !== null && n.nodeType === Node.ELEMENT_NODE; n = n.parentNode) {
      const colour = Contrast.parse(view.getComputedStyle(n).backgroundColor);
      if (colour !== null && colour[3] > 0) {
        return colour[3] < 1 ? Contrast.blend(colour, WHITE) : colour;
      }
    }
    return WHITE;
  }

  function contrast(check, page, view) {
    const node = page.querySelector(check.selector);
    if (node === null) { return false; }
    let text = Contrast.parse(view.getComputedStyle(node).color);
    if (text === null) { return false; }
    const behind = colourBehind(node, view);
    if (text[3] < 1) { text = Contrast.blend(text, behind); }
    return Contrast.ratio(text, behind) >= (check.min || 4.5);
  }

  const KINDS = { title: title, count: count, style: style, every: every, labelled: labelled, contrast: contrast };

  function passes(check, page, view) {
    const kind = KINDS[check.kind];
    if (kind === undefined) { return false; }
    try {
      return kind(check, page, view);
    } catch (error) {
      return false;   // for example, a selector the browser cannot read
    }
  }

  // A few words for a count that is on its way, such as "1 of 3 so far".
  function note(check, page) {
    if (check.kind !== "count") { return ""; }
    let found;
    try { found = page.querySelectorAll(check.selector).length; } catch (error) { return ""; }
    if (check.exact === 0) { return found + " still there"; }
    if (found === 0) { return ""; }
    if (check.exact != null) { return found + " found: the page needs exactly " + check.exact; }
    if (check.min != null) { return found + " of " + check.min + " so far"; }
    if (check.max != null) { return found + " found: no more than " + check.max; }
    return "";
  }

  return { passes: passes, note: note };
})();