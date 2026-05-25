/* site.js — nav toggle + copy-to-clipboard buttons */
(function () {
  "use strict";
  // mobile nav
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector("nav.links");
  if (toggle && links) {
    toggle.addEventListener("click", function () { links.classList.toggle("open"); });
  }
  // copy buttons
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sel = btn.getAttribute("data-target");
      var el = sel ? document.querySelector(sel) : btn.parentElement.querySelector("pre");
      if (!el) return;
      var text = el.innerText.replace(/ /g, " ");
      navigator.clipboard.writeText(text).then(function () {
        var old = btn.textContent; btn.textContent = "copied ✓";
        setTimeout(function () { btn.textContent = old; }, 1400);
      });
    });
  });
})();
