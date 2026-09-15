import { fieldsFromDataset, filterAndSort } from "../lib/search.js";

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

const grid = document.querySelector("[data-theme-grid]");
if (!grid) {
  // install-copy + author links still run above
} else {
  const cardEls = Array.from(grid.querySelectorAll("[data-theme-card]"));
  const cards = cardEls.map((el) => ({
    el,
    name: el.dataset.name,
    isBuiltin: el.dataset.builtin === "1",
    hue: el.dataset.hue,
    brightness: el.dataset.brightness,
    author: el.dataset.author,
    stars: +el.dataset.stars,
    pushed: +el.dataset.pushed,
    fields: fieldsFromDataset(el.dataset),
  }));

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
    sort: "newest",
    source: "all",
    brightness: "",
    color: [],
    author: "",
    view: "",
  };

  function readURL() {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") ?? "";
    state.sort = p.get("sort") ?? "newest";
    state.source = p.get("source") ?? "all";
    state.brightness = p.get("brightness") ?? "";
    state.color = p.getAll("color");
    state.author = p.get("author") ?? "";
    state.view = p.get("view") ?? "";
  }

  function writeURL() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.sort !== "newest") p.set("sort", state.sort);
    if (state.source !== "all") p.set("source", state.source);
    if (state.brightness) p.set("brightness", state.brightness);
    state.color.forEach((c) => p.append("color", c));
    if (state.author) p.set("author", state.author);
    if (state.view) p.set("view", state.view);
    const qs = p.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  }

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
    const { passing, named } = filterAndSort(cards, state);
    const passSet = new Set(passing);
    let visible = 0;
    cards.forEach((card) => {
      const show = passSet.has(card);
      card.el.hidden = !show;
      if (show) visible++;
    });
    passing.forEach((card, i) => { card.el.style.order = i; });

    const divider = grid.querySelector("[data-search-divider]");
    if (divider) {
      divider.hidden = !(named.size > 0 && named.size < passing.length);
      divider.style.order = named.size;
    }

    grid.classList.toggle("view-terminal", state.view === "terminal");
    if (countEl) countEl.textContent = `${visible} theme${visible !== 1 ? "s" : ""} available`;

    const empty = document.querySelector("[data-theme-empty]");
    if (empty) empty.hidden = visible !== 0;
    const req = document.querySelector("[data-request-link]");
    if (req && visible === 0) {
      const u = new URL(req.href);
      if (state.q) u.searchParams.set("title", state.q); else u.searchParams.delete("title");
      req.href = u.toString();
    }
  }

  inputs.q?.addEventListener("input", () => { state.q = inputs.q.value; update(); });
  inputs.author?.addEventListener("input", () => { state.author = inputs.author.value; update(); });
  document.addEventListener("author-filter", (e) => {
    state.author = e.detail;
    state.source = "all";
    update(true);
  });

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
}
