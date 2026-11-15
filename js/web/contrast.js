
const Contrast = (function () {
  "use strict";

  // The browser gives every computed colour as "rgb(200, 16, 46)" or
  // "rgba(0, 0, 0, 0.5)". Turn that into four numbers. Anything else gives null.
  function parse(text) {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/.exec(String(text).trim());
    if (m === null) { return null; }
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  }

  // A see-through colour in front of a solid one looks like one solid colour.
  function blend(colour, behind) {
    const solid = colour[3];
    return [0, 1, 2].map(function (i) {
      return Math.round(colour[i] * solid + behind[i] * (1 - solid));
    }).concat(1);
  }

  // How bright a colour looks to the eye: from 0 (black) to 1 (white).
  // Green counts most and blue least, because our eyes work that way.
  function luminance(colour) {
    const channel = colour.slice(0, 3).map(function (value) {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2];
  }

  // The contrast ratio of two solid colours. Which one is the text does not matter.
  function ratio(first, second) {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  return { parse: parse, blend: blend, luminance: luminance, ratio: ratio };
})();

// In the browser this line does nothing. In Node it hands Contrast to the tests.
if (typeof module !== "undefined") { module.exports = Contrast; }