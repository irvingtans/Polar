(function () {
  "use strict";
  const form = document.querySelector("[data-admin-login]");
  const pin = form.elements.pin;
  const message = document.querySelector("[data-admin-message]");
  const toggle = document.querySelector("[data-pin-toggle]");
  const reasons = {
    required: "Masukkan PIN untuk membuka area Admin.",
    expired: "Sesi berakhir. Masukkan PIN kembali.",
    logout: "Anda sudah keluar dari area Admin.",
  };
  const reason = new URL(window.location.href).searchParams.get("reason");
  message.textContent = reasons[reason] || "";

  toggle.addEventListener("click", () => {
    const visible = pin.type === "password";
    pin.type = visible ? "text" : "password";
    const label = visible ? "Sembunyikan PIN" : "Tampilkan PIN";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    toggle.setAttribute("aria-pressed", String(visible));
    toggle.replaceChildren();
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", visible ? "eye-off" : "eye");
    icon.setAttribute("aria-hidden", "true");
    toggle.append(icon);
    window.lucide?.createIcons();
    pin.focus();
  });
  pin.addEventListener("input", () => {
    pin.removeAttribute("aria-invalid");
    message.textContent = "";
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    try {
      if (!window.PolarAdmin?.login(pin.value)) {
        pin.value = "";
        pin.setAttribute("aria-invalid", "true");
        message.textContent = "PIN salah. Silakan coba lagi.";
        pin.focus();
        return;
      }
      pin.value = "";
      window.location.replace(new URL("warranty-card.html", window.location.href).href);
    } catch (error) {
      message.textContent = error.message;
    }
  });
  window.lucide?.createIcons();
})();
