(function () {
  const canvas = document.getElementById("c");
  if (!window.THREE || !window.Story || !window.World) {
    const title = document.getElementById("title");
    const p = document.createElement("p");
    p.className = "lede";
    p.textContent = "The game files did not load. Use start.bat so the browser opens http://localhost:8123.";
    title.appendChild(p);
    return;
  }
  Game.init(canvas);
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0);
    last = t;
    Game.update(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
