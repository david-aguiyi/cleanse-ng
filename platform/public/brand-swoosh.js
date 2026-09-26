/*
 * Cleanse.ng brand swoosh: the hand-drawn neon underline under "cleanse".
 * Adds it to every .brand-logo wordmark, draws it on page load like a pen
 * stroke, and redraws it when the logo is hovered.
 *
 * Geometry was traced from the brand artwork (547x160 px), where the
 * wordmark spans x 41-497 (456 px wide) with its baseline at y 96. The
 * swoosh is scaled from those numbers, so it sits in the same place
 * relative to our wordmark at any font size.
 */
(function () {
  "use strict";

  var ART = { left: 41, width: 456, baseline: 96 };
  var VIEW = { x: 90, y: 102, w: 352, h: 30 };
  // Pen path: rises left to right under "cleanse", hairpins back on itself
  // before ".ng", then trails off to the right along the lower line.
  var PATH =
    "M96,123.5 C140,115 210,108 255,108.5 C267,108.7 277,109.5 278.5,111.5 " +
    "C280,114 263,117.5 258,121.5 C250,125 254,127.8 266,125.2 " +
    "C288,122 318,116.5 360,115.5 C395,114.5 420,119 436,123.5";
  var SVG_NS = "http://www.w3.org/2000/svg";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function injectStyles() {
    var s = document.createElement("style");
    s.textContent =
      ".brand-wordmark{position:relative;display:inline-block}" +
      ".brand-swoosh{position:absolute;overflow:visible;pointer-events:none}" +
      ".brand-swoosh path{fill:none;stroke:#7CFC00;stroke-width:6.4;" +
      "stroke-linecap:round;stroke-linejoin:round}" +
      ".brand-swoosh.is-drawing path{animation:brand-swoosh-draw 1.1s " +
      "cubic-bezier(0.65,0,0.35,1) 0.15s both}" +
      "@keyframes brand-swoosh-draw{0%{stroke-dashoffset:var(--swoosh-len);opacity:0}" +
      "6%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}" +
      "@media (prefers-reduced-motion:reduce){.brand-swoosh.is-drawing path{animation:none}}";
    document.head.appendChild(s);
  }

  function makeSwoosh() {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "brand-swoosh");
    svg.setAttribute("viewBox", [VIEW.x, VIEW.y, VIEW.w, VIEW.h].join(" "));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", PATH);
    svg.appendChild(path);
    return svg;
  }

  // Size and place the swoosh from the wordmark's rendered width and baseline.
  function fit(wordmark, svg, probe) {
    var scale = wordmark.offsetWidth / ART.width;
    if (!scale) return;
    var baseline = probe.offsetTop;
    svg.style.left = ((VIEW.x - ART.left) * scale) + "px";
    svg.style.top = (baseline + (VIEW.y - ART.baseline) * scale) + "px";
    svg.style.width = (VIEW.w * scale) + "px";
    svg.style.height = (VIEW.h * scale) + "px";
  }

  function draw(svg) {
    if (reduceMotion) return;
    svg.classList.remove("is-drawing");
    void svg.getBoundingClientRect(); // restart the animation
    svg.classList.add("is-drawing");
  }

  function setup(logo) {
    var wordmark = logo.querySelector("span");
    if (!wordmark || wordmark.querySelector(".brand-swoosh")) return;
    wordmark.classList.add("brand-wordmark");

    // Zero-size inline-block sitting on the baseline; its offsetTop is the baseline.
    var probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    wordmark.appendChild(probe);

    var svg = makeSwoosh();
    wordmark.appendChild(svg);
    var path = svg.querySelector("path");
    var len = Math.ceil(path.getTotalLength()) + 1;
    path.style.strokeDasharray = len;
    svg.style.setProperty("--swoosh-len", len);

    fit(wordmark, svg, probe);
    if (window.ResizeObserver) {
      new ResizeObserver(function () { fit(wordmark, svg, probe); }).observe(wordmark);
    }
    draw(svg);
    logo.addEventListener("mouseenter", function () { draw(svg); });
  }

  function init() {
    injectStyles();
    Array.prototype.forEach.call(document.querySelectorAll(".brand-logo"), setup);
  }

  // Wait for the web font so the wordmark is measured at its final width.
  function start() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    else init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
