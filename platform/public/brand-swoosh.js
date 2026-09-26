/*
 * Cleanse.ng brand swoosh: the hand-drawn neon underline from the logo.
 *
 * 1. Logo: added under every .brand-logo wordmark. Draws on page load like a
 *    pen stroke and redraws when the logo is hovered.
 * 2. Headlines: added under any [data-swoosh] word or phrase. Draws when the
 *    phrase scrolls into view and resets once it has fully left the screen.
 *
 * Geometry was traced from the brand artwork (547x160 px), where the
 * wordmark spans x 41-497 (456 px wide) with its baseline at y 96. The
 * swoosh always scales uniformly, so its gesture stays the same at any size.
 */
(function () {
  "use strict";

  var ART = { left: 41, width: 456, baseline: 96 };
  var VIEW = { x: 90, y: 102, w: 352, h: 30 };
  // Top and bottom edges of the drawn stroke, in the same units as VIEW.
  var STROKE_TOP = 105.3, STROKE_BOTTOM = 128.8;
  // Pen path: rises left to right, hairpins back on itself, then trails off
  // to the right along the lower line.
  var PATH =
    "M96,123.5 C140,115 210,108 255,108.5 C267,108.7 277,109.5 278.5,111.5 " +
    "C280,114 263,117.5 258,121.5 C250,125 254,127.8 266,125.2 " +
    "C288,122 318,116.5 360,115.5 C395,114.5 420,119 436,123.5";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var EASE = "cubic-bezier(0.65,0,0.35,1)";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function injectStyles() {
    var s = document.createElement("style");
    s.textContent =
      ".brand-wordmark{position:relative;display:inline-block}" +
      ".brand-swoosh{position:absolute;overflow:visible;pointer-events:none}" +
      ".brand-swoosh path{fill:none;stroke:#7CFC00;stroke-width:6.4;" +
      "stroke-linecap:round;stroke-linejoin:round}" +
      // Logo: keyframe draw on load / hover.
      ".brand-swoosh.is-drawing path{animation:brand-swoosh-draw 1.1s " + EASE + " 0.15s both}" +
      "@keyframes brand-swoosh-draw{0%{stroke-dashoffset:var(--swoosh-len);opacity:0}" +
      "6%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}" +
      // Headlines: hidden until drawn; drawing is a transition on the offset.
      "[data-swoosh]{position:relative;display:inline-block;white-space:nowrap}" +
      ".brand-swoosh--word path{stroke-width:7;stroke-dashoffset:var(--swoosh-len);" +
      "transition:stroke-dashoffset 1.1s " + EASE + "}" +
      ".brand-swoosh--word.is-drawn path{stroke-dashoffset:0;transition-delay:0.2s}" +
      ".brand-swoosh.is-setup path{transition:none}" +
      "@media (prefers-reduced-motion:reduce){.brand-swoosh.is-drawing path{animation:none}" +
      ".brand-swoosh--word path{transition:none}}";
    document.head.appendChild(s);
  }

  function makeSwoosh(extraClass) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "brand-swoosh" + (extraClass ? " " + extraClass : ""));
    svg.setAttribute("viewBox", [VIEW.x, VIEW.y, VIEW.w, VIEW.h].join(" "));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", PATH);
    svg.appendChild(path);
    return svg;
  }

  // Zero-size inline-block sitting on the baseline; its offsetTop is the baseline.
  function addBaselineProbe(host) {
    var probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    host.appendChild(probe);
    return probe;
  }

  function prepare(host, svg) {
    // Transitions stay off while the length is measured and the hidden state
    // is applied; otherwise the first style pass (offset 0, fully drawn)
    // would animate into the hidden state and visibly un-draw on page load.
    svg.classList.add("is-setup");
    host.appendChild(svg);
    var path = svg.querySelector("path");
    var len = Math.ceil(path.getTotalLength()) + 1;
    path.style.strokeDasharray = len;
    svg.style.setProperty("--swoosh-len", len);
    void getComputedStyle(path).strokeDashoffset; // commit the hidden state
    svg.classList.remove("is-setup");
  }

  function place(svg, left, top, scale) {
    svg.style.left = left + "px";
    svg.style.top = top + "px";
    svg.style.width = (VIEW.w * scale) + "px";
    svg.style.height = (VIEW.h * scale) + "px";
  }

  /* ---------- Logo ---------- */

  function fitLogo(wordmark, svg, probe) {
    var scale = wordmark.offsetWidth / ART.width;
    if (!scale) return;
    place(svg, (VIEW.x - ART.left) * scale,
      probe.offsetTop + (VIEW.y - ART.baseline) * scale, scale);
  }

  function drawLogo(svg) {
    if (reduceMotion) return;
    svg.classList.remove("is-drawing");
    void svg.getBoundingClientRect(); // restart the animation
    svg.classList.add("is-drawing");
  }

  function setupLogo(logo) {
    var wordmark = logo.querySelector("span");
    if (!wordmark || wordmark.querySelector(".brand-swoosh")) return;
    wordmark.classList.add("brand-wordmark");
    var probe = addBaselineProbe(wordmark);
    var svg = makeSwoosh();
    prepare(wordmark, svg);
    fitLogo(wordmark, svg, probe);
    if (window.ResizeObserver) {
      new ResizeObserver(function () { fitLogo(wordmark, svg, probe); }).observe(wordmark);
    }
    drawLogo(svg);
    logo.addEventListener("mouseenter", function () { drawLogo(svg); });
  }

  /* ---------- Headline words ---------- */

  // Span the phrase with a little overhang each side, sit the stroke just
  // under the baseline, and pad the phrase so the swoosh never touches the
  // next line of text.
  function fitWord(host, svg, probe) {
    host.style.paddingBottom = "";
    var width = host.offsetWidth;
    if (!width) return;
    var fontSize = parseFloat(getComputedStyle(host).fontSize) || 16;
    var scale = (width * 1.04) / VIEW.w;
    var top = probe.offsetTop + 0.1 * fontSize - (STROKE_TOP - VIEW.y) * scale;
    place(svg, -width * 0.02, top, scale);
    var inkBottom = top + (STROKE_BOTTOM - VIEW.y) * scale;
    var overflow = Math.ceil(inkBottom + 2 - host.offsetHeight);
    if (overflow > 0) host.style.paddingBottom = overflow + "px";
  }

  function setupWords(hosts) {
    if (!hosts.length) return;
    var io = null;
    if (!reduceMotion && "IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var svg = entry.target.querySelector(".brand-swoosh--word");
          if (!svg) return;
          if (entry.intersectionRatio >= 0.9) svg.classList.add("is-drawn");
          else if (!entry.isIntersecting) svg.classList.remove("is-drawn"); // fully gone
        });
      }, { threshold: [0, 0.9] });
    }
    Array.prototype.forEach.call(hosts, function (host) {
      if (host.querySelector(".brand-swoosh")) return;
      var probe = addBaselineProbe(host);
      var svg = makeSwoosh("brand-swoosh--word");
      prepare(host, svg);
      fitWord(host, svg, probe);
      if (window.ResizeObserver) {
        var lastWidth = host.offsetWidth;
        new ResizeObserver(function () {
          // Only refit on width changes; our own padding changes the height.
          if (host.offsetWidth === lastWidth) return;
          lastWidth = host.offsetWidth;
          fitWord(host, svg, probe);
        }).observe(host);
      }
      if (io) io.observe(host);
      else svg.classList.add("is-drawn");
    });
  }

  function init() {
    injectStyles();
    Array.prototype.forEach.call(document.querySelectorAll(".brand-logo"), setupLogo);
    setupWords(document.querySelectorAll("[data-swoosh]"));
  }

  // Wait for the web font so everything is measured at its final width.
  function start() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    else init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
