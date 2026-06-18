const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const headerActions = document.querySelector(".header-actions");
const tabs = document.querySelectorAll("[data-panel]");
const panels = document.querySelectorAll(".film-panel");
const shadeRange = document.querySelector("[data-shade-range]");
const shadeOutput = document.querySelector("[data-shade-output]");
const shadeWindow = document.querySelector("[data-shade-window]");
const shadeViewButtons = document.querySelectorAll("[data-shade-view]");
const quoteForm = document.querySelector("[data-quote-form]");
const formStatus = document.querySelector("[data-form-status]");
const vltValues = [70, 50, 30, 15, 10];
const tintLabelsByVlt = {
  70: "10% Tint",
  50: "20% Tint",
  30: "40% Tint",
  15: "70% Tint",
  10: "80% Tint",
};
const glassOpacityByVlt = {
  70: 0.08,
  50: 0.34,
  30: 0.66,
  15: 0.76,
  10: 0.86,
};
const insideGlassOpacityByVlt = {
  70: 0.06,
  50: 0.16,
  30: 0.34,
  15: 0.44,
  10: 0.52,
};
const glassTintByVlt = {
  70: { strong: "24, 146, 196", soft: "80, 186, 220" },
  50: { strong: "0, 39, 78", soft: "0, 78, 130" },
  30: { strong: "0, 0, 0", soft: "1, 2, 3" },
  15: { strong: "0, 0, 0", soft: "0, 0, 1" },
  10: { strong: "0, 0, 0", soft: "0, 0, 0" },
};
let velarViewer = null;

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  header.classList.remove("is-open");
  nav.classList.remove("is-open");
  headerActions.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

function setPanel(id) {
  tabs.forEach((tab) => {
    const active = tab.dataset.panel === id;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  panels.forEach((panel) => {
    const active = panel.id === id;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

function updateShade() {
  const index = Math.max(0, Math.min(vltValues.length - 1, Number(shadeRange.value)));
  const vlt = vltValues[index];
  const glassOpacity = glassOpacityByVlt[vlt] ?? 0.4;
  const insideGlassOpacity = insideGlassOpacityByVlt[vlt] ?? 0.34;
  const glassTint = glassTintByVlt[vlt] ?? glassTintByVlt[30];
  shadeWindow.style.setProperty("--glass-opacity", glassOpacity);
  shadeWindow.style.setProperty("--inside-glass-opacity", insideGlassOpacity);
  shadeWindow.style.setProperty("--glass-tint-strong", glassTint.strong);
  shadeWindow.style.setProperty("--glass-tint-soft", glassTint.soft);
  shadeWindow.style.setProperty("--inside-glass-tint-strong", glassTint.strong);
  shadeWindow.style.setProperty("--inside-glass-tint-soft", glassTint.soft);
  shadeOutput.value = tintLabelsByVlt[vlt] ?? `${vlt}% VLT`;
  velarViewer?.setVlt(vlt);
}

function setShadeView(view) {
  if (!shadeWindow) return;
  shadeWindow.dataset.view = view;
  shadeWindow.classList.toggle("is-inside", view === "inside");
  if (view === "inside") shadeWindow.classList.remove("is-dragging");

  shadeViewButtons.forEach((button) => {
    const active = button.dataset.shadeView === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

menuToggle.addEventListener("click", () => {
  const opening = menuToggle.getAttribute("aria-expanded") !== "true";
  document.body.classList.toggle("menu-open", opening);
  header.classList.toggle("is-open", opening);
  nav.classList.toggle("is-open", opening);
  headerActions.classList.toggle("is-open", opening);
  menuToggle.setAttribute("aria-expanded", String(opening));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    closeMenu();
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setPanel(tab.dataset.panel));
});

shadeViewButtons.forEach((button) => {
  button.addEventListener("click", () => setShadeView(button.dataset.shadeView));
});

shadeRange.addEventListener("input", updateShade);
setShadeView("outside");
updateShade();

if (shadeWindow && window.PolarGlbViewer) {
  velarViewer = new window.PolarGlbViewer(shadeWindow, { src: "assets/velar.glb" });
  velarViewer.load().then(updateShade).catch(() => {
    velarViewer = null;
  });
}

quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(quoteForm).get("name") || "there";
  formStatus.textContent = `Thanks, ${name}. Polar will prepare a fitment recommendation.`;
  quoteForm.reset();
  updateShade();
});
