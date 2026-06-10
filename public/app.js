// Browse-page filter state + install-command copy. No framework, no build step.

(function () {
  // ---------- install command copy ----------
  document.querySelectorAll("[data-install-command]").forEach((el) => {
    const cmd = el.getAttribute("data-install-command");
    const btn = el.querySelector("[data-install-copy]");
    const icon = btn?.querySelector("[data-install-icon]");
    async function copy() {
      try {
        await navigator.clipboard.writeText(cmd);
        if (icon) {
          const orig = icon.innerHTML;
          icon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
          btn?.classList.add("text-green-400");
          setTimeout(() => {
            icon.innerHTML = orig;
            btn?.classList.remove("text-green-400");
          }, 2000);
        }
      } catch {}
    }
    el.addEventListener("click", copy);
    btn?.addEventListener("click", (e) => { e.stopPropagation(); copy(); });
  });

  // ---------- author-link clicks (works everywhere) ----------
  // Clicking an author name on a theme card either filters the browse grid
  // (when we're already on /themes/) or navigates to /themes/?author=<name>.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-author-link]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const author = el.getAttribute("data-author-link");
    const onBrowse = document.querySelector("[data-theme-grid]");
    if (onBrowse) {
      const input = document.querySelector('[name="author"]');
      if (input) {
        input.value = author;
        document.dispatchEvent(new CustomEvent("author-filter", { detail: author }));
      }
    } else {
      window.location.href = `/themes/?author=${encodeURIComponent(author)}`;
    }
  });

  // ---------- browse-page filter (only runs on /themes/) ----------
  const grid = document.querySelector("[data-theme-grid]");
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll("[data-theme-card]"));
  const countEl = document.querySelector("[data-theme-count]");
  const inputs = {
    q: document.querySelector('[name="q"]'),
    sort: document.querySelectorAll('[name="sort"]'),
    source: document.querySelectorAll('[name="source"]'),
    brightness: document.querySelectorAll('[name="brightness"]'),
    color: document.querySelectorAll('[name="color"]'),
    author: document.querySelector('[name="author"]'),
    view: document.querySelectorAll('[name="view"]'),
  };

  const state = {
    q: "",
    sort: "stars",
    source: "community",
    brightness: "",
    color: [],
    author: "",
    view: "",
  };

  function readURL() {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") ?? "";
    state.sort = p.get("sort") ?? "stars";
    state.source = p.get("source") ?? "community";
    state.brightness = p.get("brightness") ?? "";
    state.color = p.getAll("color");
    state.author = p.get("author") ?? "";
    state.view = p.get("view") ?? "";
  }

  function writeURL() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.sort !== "stars") p.set("sort", state.sort);
    if (state.source !== "community") p.set("source", state.source);
    if (state.brightness) p.set("brightness", state.brightness);
    state.color.forEach((c) => p.append("color", c));
    if (state.author) p.set("author", state.author);
    if (state.view) p.set("view", state.view);
    const qs = p.toString();
    const url = qs ? `${location.pathname}?${qs}` : location.pathname;
    return url;
  }

  // Clicks are navigation-like: they push a history entry so Back unwinds
  // the filter change. Typing replaces in place (no entry per keystroke).
  function update(push = false) {
    const url = writeURL();
    if (url !== location.pathname + location.search) {
      history[push ? "pushState" : "replaceState"](null, "", url);
    }
    syncInputs(); applyFilters();
  }

  function syncInputs() {
    if (inputs.q) inputs.q.value = state.q;
    if (inputs.author) inputs.author.value = state.author;
    document.querySelectorAll("[data-clear]").forEach((btn) => {
      const target = btn.getAttribute("data-clear");
      const input = document.querySelector(`[name="${target}"]`);
      btn.hidden = !input || !input.value;
    });
    inputs.sort.forEach((b) => b.classList.toggle("is-active", b.value === state.sort));
    inputs.source.forEach((b) => b.classList.toggle("is-active", b.value === state.source));
    inputs.brightness.forEach((b) => b.classList.toggle("is-active", b.value === state.brightness));
    inputs.view.forEach((b) => b.classList.toggle("is-active", b.value === state.view));
    inputs.color.forEach((b) => b.classList.toggle("is-active", state.color.includes(b.value)));
    const allColors = document.querySelector("[data-color-all]");
    if (allColors) allColors.classList.toggle("is-active", state.color.length === 0);
  }

  function applyFilters() {
    let visible = 0;
    const lower = state.q.toLowerCase();
    const passing = cards.filter((card) => {
      const isBuiltin = card.dataset.builtin === "1";
      if (state.source === "community" && isBuiltin) return false;
      if (state.source === "builtin" && !isBuiltin) return false;
      if (state.color.length > 0) {
        const hue = card.dataset.hue;
        if (!hue || !state.color.includes(hue)) return false;
      }
      if (state.brightness && card.dataset.brightness !== state.brightness) return false;
      if (state.author && !card.dataset.author.toLowerCase().includes(state.author.toLowerCase())) return false;
      if (state.q && !card.dataset.name.toLowerCase().includes(lower)) return false;
      return true;
    });

    const order = state.sort;
    passing.sort((a, b) => {
      if (order === "name") return a.dataset.name.localeCompare(b.dataset.name);
      if (order === "newest") return (+b.dataset.pushed || 0) - (+a.dataset.pushed || 0);
      return (+b.dataset.stars || 0) - (+a.dataset.stars || 0);
    });

    const passSet = new Set(passing);
    cards.forEach((card) => {
      const show = passSet.has(card);
      card.hidden = !show;
      if (show) visible++;
    });
    passing.forEach((card, i) => { card.style.order = i; });

    grid.classList.toggle("view-terminal", state.view === "terminal");
    if (countEl) countEl.textContent = `${visible} theme${visible !== 1 ? "s" : ""} available`;

    const empty = document.querySelector("[data-theme-empty]");
    if (empty) empty.hidden = visible !== 0;
  }

  inputs.q?.addEventListener("input", () => { state.q = inputs.q.value; update(); });
  inputs.author?.addEventListener("input", () => { state.author = inputs.author.value; update(); });
  document.addEventListener("author-filter", (e) => { state.author = e.detail; update(true); });

  inputs.sort.forEach((b) => b.addEventListener("click", () => { state.sort = b.value; update(true); }));
  inputs.source.forEach((b) => b.addEventListener("click", () => { state.source = b.value; update(true); }));
  inputs.brightness.forEach((b) => b.addEventListener("click", () => { state.brightness = b.value; update(true); }));
  inputs.view.forEach((b) => b.addEventListener("click", () => { state.view = b.value; update(true); }));
  inputs.color.forEach((b) => b.addEventListener("click", () => {
    const idx = state.color.indexOf(b.value);
    if (idx === -1) state.color.push(b.value); else state.color.splice(idx, 1);
    update(true);
  }));
  document.querySelector("[data-color-all]")?.addEventListener("click", () => { state.color = []; update(true); });

  document.querySelectorAll("[data-clear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-clear");
      if (target === "q") { state.q = ""; }
      if (target === "author") { state.author = ""; }
      update(true);
    });
  });

  window.addEventListener("popstate", () => { readURL(); syncInputs(); applyFilters(); });

  readURL();
  syncInputs();
  applyFilters();
})();
