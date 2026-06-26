// Self-contained lightbox for the Photos gallery. No dependencies.
(function () {
  var grid = document.getElementById("gallery");
  var box = document.getElementById("lightbox");
  if (!grid || !box) return;

  var items = Array.prototype.slice.call(grid.querySelectorAll(".gallery-item"));
  var sources = items.map(function (b) { return b.getAttribute("data-full"); });
  var img = box.querySelector(".lb-img");
  var current = 0;

  function show(i) {
    current = (i + sources.length) % sources.length;
    img.src = sources[current];
    img.alt = "Photograph " + (current + 1) + " of " + sources.length;
  }
  function open(i) {
    show(i);
    box.hidden = false;
    document.body.style.overflow = "hidden";
    box.focus();
  }
  function close() {
    box.hidden = true;
    img.src = "";
    document.body.style.overflow = "";
  }

  items.forEach(function (b, i) {
    b.addEventListener("click", function () { open(i); });
  });

  box.querySelector(".lb-close").addEventListener("click", close);
  box.querySelector(".lb-prev").addEventListener("click", function (e) {
    e.stopPropagation(); show(current - 1);
  });
  box.querySelector(".lb-next").addEventListener("click", function (e) {
    e.stopPropagation(); show(current + 1);
  });
  box.addEventListener("click", function (e) {
    if (e.target === box) close();
  });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(current - 1);
    else if (e.key === "ArrowRight") show(current + 1);
  });
})();
