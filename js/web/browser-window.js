
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

    // Two more pictures, for a window with a page in it.
  const LOCK = '<svg viewBox="0 0 12 14"><rect x="1" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/><path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const MENU = '<svg viewBox="0 0 20 20"><circle cx="10" cy="4.5" r="1.6" fill="currentColor"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/><circle cx="10" cy="15.5" r="1.6" fill="currentColor"/></svg>';

  // A whole window with a web page in it, in an <iframe>.
  //   options.url         the address in the bar, such as "thecornercafe.example.com"
  //   options.secure      false shows "Not secure", as Chrome does for a page on your own computer
  //   options.tools       buttons or links for the right-hand end of the bar
  //   options.frameTitle  the name of the iframe, for screen readers
  //   options.untitled    the words on the tab when the page has no <title>
  //   options.className   "sample" or "preview"
  // Gives back the window and its iframe.
  function withPage(options) {
    const tabs = tabStrip("New tab");

    const address = make("div", "browser-address");
    if (options.secure === false) {
      address.appendChild(make("span", "browser-notsecure", "Not secure"));
    } else {
      const lock = decoration(make("span", "browser-lock"));
      lock.innerHTML = LOCK;
      address.appendChild(lock);
    }
    // The name of the site darker than the rest of the address, as in Chrome.
    const parts = /^([^/?#]*)(.*)$/.exec(options.url);
    const url = make("span", "browser-url");
    url.append(make("b", null, parts[1]), parts[2]);
    address.appendChild(url);

    const tools = make("div", "browser-tools");
    for (const tool of options.tools) { tools.appendChild(tool); }
    const menu = decoration(make("span", "browser-menu"));
    menu.innerHTML = MENU;
    tools.append(decoration(make("span", "browser-avatar", "TG")), menu);

    const bar = make("div", "browser-bar");
    bar.append(arrows(), address, tools);

    const frame = make("iframe", "browser-page");
    frame.title = options.frameTitle;
    // Each time a page loads in the frame, the tab shows its <title>, as a real tab does.
    frame.addEventListener("load", function () {
      const title = frame.contentDocument ? frame.contentDocument.title.trim() : "";
      tabs.setTitle(title || options.untitled || "Untitled");
    });

    const win = make("div", "browser " + options.className);
    win.append(tabs.node, bar, frame);
    return { node: win, frame: frame };
  }

  return { tabStrip: tabStrip, arrows: arrows, withPage: withPage };
})();