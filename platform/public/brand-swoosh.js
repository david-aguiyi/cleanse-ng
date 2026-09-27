/*
 * Cleanse.ng brand swoosh: the hand-drawn neon underline from the logo.
 *
 * - Logos: added under every .brand-logo wordmark. Each draws once, the
 *   first time it is fully in view, and redraws when hovered.
 * - Headlines: added under any [data-swoosh] word or phrase. It draws once
 *   the reader has scrolled to it (fully below the sticky nav and out of
 *   the bottom quarter of the screen) and resets after it has left the
 *   screen, so it draws again on the way back.
 * - Staggered reveals: the items of a [data-reveal] block (the hero area
 *   list) fade up one by one when the block is fully in view, and fade out
 *   in reverse when it leaves.
 * - Only one animation plays at a time: each waits in a shared queue until
 *   the previous one has finished, so animations never compete.
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
  var REVEAL_STEP_MS = 70, REVEAL_ITEM_MS = 600;
  // Headlines draw once fully below the sticky nav AND up out of the bottom
  // quarter of the screen, i.e. once the reader has actually scrolled to them.
  var HEADLINE_ZONE = "-80px 0px -25% 0px";
  // Staggered reveals only need to be fully below the sticky nav.
  var REVEAL_ZONE = "-80px 0px 0px 0px";

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

  /* ---------- One-at-a-time animation queue ---------- */

  var queueFreeAt = 0;

  // Run `play` on `el` when the queue is free, reserving `ms` for it.
  function enqueue(el, ms, play) {
    if (el._pending) return;
    var now = performance.now();
    var start = Math.max(now, queueFreeAt);
    el._slot = { start: start, end: start + ms + GAP_MS };
    queueFreeAt = el._slot.end;
    el._pending = setTimeout(function () {
      el._pending = null;
      play();
    }, start - now);
  }

  function dequeue(el) {
    if (!el._pending) return;
    clearTimeout(el._pending);
    el._pending = null;
    // Give the slot back if nothing was queued after it.
    if (el._slot && el._slot.end === queueFreeAt) queueFreeAt = el._slot.start;
  }

  function requestDraw(svg) {
    if (svg.classList.contains("is-drawn")) return;
    enqueue(svg, DRAW_MS, function () { svg.classList.add("is-drawn"); });
  }

  function cancelDraw(svg) { dequeue(svg); }

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
    var wordIO = observer(HEADLINE_ZONE, function (entry) {
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

    // Staggered reveals: items fade up one by one (queued), and fade out in
    // reverse when the block leaves. .reveal-ready is in the markup, so the
    // hidden state is there from first paint.
    Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]"), function (block) {
      var items = function () {
        return Array.prototype.filter.call(block.querySelectorAll("[data-reveal-item]"),
          function (el) { return getComputedStyle(el).display !== "none"; });
      };
      var show = function (on) {
        var els = items();
        els.forEach(function (el, i) {
          el.style.transitionDelay = (on ? i * REVEAL_STEP_MS : (els.length - 1 - i) * 40) + "ms";
        });
        block.classList.toggle("is-revealed", on);
      };
      var revealIO = observer(REVEAL_ZONE, function (entry) {
        if (fullyVisible(entry)) {
          if (!block.classList.contains("is-revealed")) {
            enqueue(block, items().length * REVEAL_STEP_MS + REVEAL_ITEM_MS, function () { show(true); });
          }
        } else if (!entry.isIntersecting) {
          dequeue(block);
          if (block.classList.contains("is-revealed")) show(false);
        } else dequeue(block);
      });
      if (revealIO) revealIO.observe(block);
      else block.classList.add("is-revealed");
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
