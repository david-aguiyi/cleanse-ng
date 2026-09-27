/*
 * Cleanse.ng brand swoosh: the hand-drawn neon underline from the logo.
 *
 * - Logos: added under every .brand-logo wordmark. Each draws once, the
 *   first time it is fully in view, and redraws when hovered.
 * - Headlines: added under any [data-swoosh] word or phrase. It draws once
 *   the phrase is fully in view (below the sticky nav) and resets after it
 *   has left the screen, so it draws again on the way back.
 * - Only one swoosh draws at a time: a new draw waits in a queue until the
 *   previous one has finished, so animations never compete.
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
  var DRAW_MS = 1100, GAP_MS = 150;
  var NAV_CLEARANCE = "-80px 0px 0px 0px"; // headlines must be fully below the sticky nav

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function injectStyles() {
    var s = document.createElement("style");
    s.textContent =
      ".brand-wordmark{position:relative;display:inline-block}" +
      "[data-swoosh]{position:relative;display:inline-block;white-space:nowrap}" +
      ".brand-swoosh{position:absolute;overflow:visible;pointer-events:none}" +
      // Hidden until drawn; drawing is a transition on the dash offset.
      ".brand-swoosh path{fill:none;stroke:#7CFC00;stroke-width:6.4;" +
      "stroke-linecap:round;stroke-linejoin:round;stroke-dashoffset:var(--swoosh-len);" +
      "transition:stroke-dashoffset " + DRAW_MS + "ms cubic-bezier(0.65,0,0.35,1)}" +
      ".brand-swoosh--word path{stroke-width:7}" +
      ".brand-swoosh.is-drawn path{stroke-dashoffset:0}" +
      ".brand-swoosh.no-anim path{transition:none}" +
      "@media (prefers-reduced-motion:reduce){.brand-swoosh path{stroke-dashoffset:0;transition:none}}";
    document.head.appendChild(s);
  }

  /* ---------- One-at-a-time draw queue ---------- */

  var queueFreeAt = 0;

  function requestDraw(svg) {
    if (svg._pending || svg.classList.contains("is-drawn")) return;
    var now = performance.now();
    var start = Math.max(now, queueFreeAt);
    svg._slot = { start: start, end: start + DRAW_MS + GAP_MS };
    queueFreeAt = svg._slot.end;
    svg._pending = setTimeout(function () {
      svg._pending = null;
      svg.classList.add("is-drawn");
    }, start - now);
  }

  function cancelDraw(svg) {
    if (!svg._pending) return;
    clearTimeout(svg._pending);
    svg._pending = null;
    // Give the slot back if nothing was queued after it.
    if (svg._slot && svg._slot.end === queueFreeAt) queueFreeAt = svg._slot.start;
  }

  // Back to hidden instantly (no reverse animation).
  function resetDraw(svg) {
    cancelDraw(svg);
    svg.classList.add("no-anim");
    svg.classList.remove("is-drawn");
    void getComputedStyle(svg.querySelector("path")).strokeDashoffset;
    svg.classList.remove("no-anim");
  }

  /* ---------- Building and placing ---------- */

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
    svg.classList.add("no-anim");
    host.appendChild(svg);
    var path = svg.querySelector("path");
    var len = Math.ceil(path.getTotalLength()) + 1;
    path.style.strokeDasharray = len;
    svg.style.setProperty("--swoosh-len", len);
    void getComputedStyle(path).strokeDashoffset; // commit the hidden state
    svg.classList.remove("no-anim");
  }

  function place(svg, left, top, scale) {
    svg.style.left = left + "px";
    svg.style.top = top + "px";
    svg.style.width = (VIEW.w * scale) + "px";
    svg.style.height = (VIEW.h * scale) + "px";
  }

  function fitLogo(wordmark, svg, probe) {
    var scale = wordmark.offsetWidth / ART.width;
    if (!scale) return;
    place(svg, (VIEW.x - ART.left) * scale,
      probe.offsetTop + (VIEW.y - ART.baseline) * scale, scale);
  }

  // Span the phrase with a little overhang each side, sit the stroke just
  // under the baseline, and pad the phrase if the swoosh would otherwise
  // touch the next line (index.css reserves this space up front).
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

  function watchWidth(el, refit) {
    if (!window.ResizeObserver) return;
    var lastWidth = el.offsetWidth;
    new ResizeObserver(function () {
      // Only refit on width changes; word padding changes the height.
      if (el.offsetWidth === lastWidth) return;
      lastWidth = el.offsetWidth;
      refit();
    }).observe(el);
  }

  /* ---------- Setup ---------- */

  function observer(rootMargin, onEntry) {
    if (reduceMotion || !("IntersectionObserver" in window)) return null;
    return new IntersectionObserver(function (entries) {
      entries.forEach(onEntry);
    }, { threshold: [0, 1], rootMargin: rootMargin });
  }

  function fullyVisible(entry) { return entry.intersectionRatio >= 0.99; }

  function init() {
    injectStyles();

    // Logos: draw once when fully in view; hover redraws right away.
    var logoIO = observer("0px", function (entry) {
      var svg = entry.target._swoosh;
      if (fullyVisible(entry)) requestDraw(svg);
      else if (!entry.isIntersecting) cancelDraw(svg);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".brand-logo"), function (logo) {
      var wordmark = logo.querySelector("span");
      if (!wordmark || wordmark.querySelector(".brand-swoosh")) return;
      wordmark.classList.add("brand-wordmark");
      var probe = addBaselineProbe(wordmark);
      var svg = makeSwoosh();
      prepare(wordmark, svg);
      fitLogo(wordmark, svg, probe);
      watchWidth(wordmark, function () { fitLogo(wordmark, svg, probe); });
      wordmark._swoosh = svg;
      if (logoIO) logoIO.observe(wordmark);
      else svg.classList.add("is-drawn");
      logo.addEventListener("mouseenter", function () {
        if (reduceMotion) return;
        resetDraw(svg);
        svg.classList.add("is-drawn");
      });
    });

    // Headlines: draw when fully in view below the nav; reset once gone.
    var wordIO = observer(NAV_CLEARANCE, function (entry) {
      var svg = entry.target._swoosh;
      if (fullyVisible(entry)) requestDraw(svg);
      else if (!entry.isIntersecting) resetDraw(svg);
      else cancelDraw(svg); // partly visible: not yet
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-swoosh]"), function (host) {
      if (host.querySelector(".brand-swoosh")) return;
      var probe = addBaselineProbe(host);
      var svg = makeSwoosh("brand-swoosh--word");
      prepare(host, svg);
      fitWord(host, svg, probe);
      watchWidth(host, function () { fitWord(host, svg, probe); });
      host._swoosh = svg;
      if (wordIO) wordIO.observe(host);
      else svg.classList.add("is-drawn");
    });
  }

  // Wait for the web font so everything is measured at its final width.
  function start() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    else init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
