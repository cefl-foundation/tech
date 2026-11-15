
const BrowserWindow = (function () {
  "use strict";

  const make = Dom.make;

  // The back, forward and reload arrows, drawn in SVG.
  const ARROWS =
    '<svg viewBox="0 0 20 20"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '<svg viewBox="0 0 20 20"><path d="m7.5 4.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '<svg viewBox="0 0 20 20"><path d="M15.5 10a5.5 5.5 0 1 1-1.6-3.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15.5 4.5v3.5H12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // A part of the picture that says nothing on its own: screen readers skip it.
  function decoration(node) {
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  // The strip along the top: three window dots, one tab and a "+".
  // Gives back the strip, and a function that changes the words on the tab.
  function tabStrip(title) {
    const strip = make("div", "browser-tabs");
    const dots = decoration(make("span", "browser-dots"));
    dots.append(make("i"), make("i"), make("i"));
    const words = make("span", "browser-tab-title", title);
    const tab = make("div", "browser-tab");
    tab.append(make("span", "browser-favicon"), words);
    strip.append(dots, tab, decoration(make("span", "browser-newtab", "+")));
    return {
      node: strip,
      setTitle: function (text) { Dom.text(words, text); }
    };
  }

  // The back, forward and reload arrows. They are only a picture.
  function arrows() {
    const nav = decoration(make("span", "browser-nav"));
    nav.innerHTML = ARROWS;
    return nav;
  }

  return { tabStrip: tabStrip, arrows: arrows };
})();