
(function () {
  "use strict";

  // ---------- which page is this? ----------

  // The file name of the page we are on, such as "practice-web.html".
  function currentPageName() {
    // The not-found page is shown at whatever wrong address was typed, so
    // its address does not say what it is. It says so itself, on <body>.
    const named = document.body.getAttribute("data-page");
    if (named) { return named; }

    const path = window.location.pathname;                    // "/tech/practice-web.html"
    const last = path.substring(path.lastIndexOf("/") + 1);   // "practice-web.html"
    return last === "" ? "index.html" : last;                 // "/tech/" is the home page
  }

  const here = currentPageName();

  // Resources is a part of the home page. On the home page the link to it
  // is only "#resources". On any other page it names the home page first.
  const homePage = here === "index.html" ? "" : "index.html";

  // Swap the placeholder with this name for the HTML that was built for it.
  function inject(name, html) {
    const slot = document.querySelector(`[data-layout="${name}"]`);
    if (slot) { slot.outerHTML = html; }
  }

  // ---------- header ----------

  function buildHeader() {
    // The address of this page with "#main" on the end. A plain "#main"
    // would lead to the home page from the not-found page, because of
    // its <base> element.
    const skip = window.location.pathname + window.location.search + "#main";
    return `
      <a class="skip-link" href="${Dom.esc(skip)}">Skip to the content</a>
      <header class="topbar">
        <div class="wrap">
          <a class="logo" href="index.html">
            <img src="assets/uob-logo.png" alt="University of Bedfordshire">
            <span class="unit">Tech Practice Hub</span>
          </a>
        </div>
      </header>`;
  }

  // The header placeholder is above the <script> tag that loads this file,
  // so the browser has read it already. The same goes for the menu.
  inject("header", buildHeader());

    // ---------- menu ----------

  // The links, in the order they appear.
  const NAV_LINKS = [
    { href: "index.html",            label: "Home" },
    { href: "practice-python.html",  label: "Python practice" },
    { href: "practice-web.html",     label: "Web practice" },
    { href: "practice-ai.html",      label: "AI task" },
    { href: homePage + "#resources", label: "Resources" }
  ];

  // Turn a list of links into <a> tags. The link to the page we are on
  // is marked with aria-current="page".
  function linkTags(links) {
    let html = "";
    for (const link of links) {
      const current = link.href === here ? ' aria-current="page"' : "";
      html += `<a href="${Dom.esc(link.href)}"${current}>${Dom.esc(link.label)}</a> `;
    }
    return html;
  }

  function buildNav() {
    return `
      <nav class="nav" aria-label="Main">
        <div class="wrap">${linkTags(NAV_LINKS)}</div>
      </nav>`;
  }

  inject("nav", buildNav());

  // ---------- footer ----------

  // The three links at the bottom of every page.
  const FOOTER_LINKS = [
    { href: homePage + "#resources", label: "Accessibility" },
    { href: homePage + "#resources", label: "Privacy" },
    { href: homePage + "#resources", label: "Contact" }
  ];

  function buildFooter() {
    return `
      <footer class="footer">
        <div class="wrap">
          <p class="slogan">Learn it in class. <span>Build it here.</span></p>
          <p class="credit">The robot tasks on this site are inspired by Karel the Robot, created by Richard Pattis at Stanford University to teach the first steps of programming.</p>
          <div class="row">
            <p>&copy; Monika Pietruch, 2026<br>University of Bedfordshire - CEFL</p>
            <p>${linkTags(FOOTER_LINKS)}</p>
          </div>
        </div>
      </footer>`;
  }

  // The footer placeholder is below the <script> tag, and the browser has
  // not read that far yet. Wait until it has read the whole page.
  document.addEventListener("DOMContentLoaded", function () {
    inject("footer", buildFooter());
  });

})();