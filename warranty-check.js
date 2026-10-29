(function () {
  "use strict";
  const core = window.PolarWarranty;
  const form = document.querySelector("[data-warranty-check]");
  if (!form || !core) return;
  const input = form.elements.code;
  const message = document.querySelector("[data-warranty-message]");
  const result = document.querySelector("[data-warranty-result]");
  const headings = { active: "Garansi aktif", expired: "Masa garansi berakhir", cancelled: "Garansi dibatalkan" };
  const button = form.querySelector('button[type="submit"]');
  let requestId = 0;
  let controller;

  function field(label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    return row;
  }

  async function check() {
    controller?.abort();
    const id = ++requestId;
    result.hidden = true;
    result.replaceChildren();
    input.value = core.normalizeCode(input.value);
    if (!core.codePattern.test(input.value)) {
      message.textContent = "Masukkan nomor garansi dengan format PLR-2026-XXXXXXXX.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    const code = input.value;
    const currentController = new AbortController();
    controller = currentController;
    const timeout = window.setTimeout(() => currentController.abort(), 12000);
    message.textContent = "Mengecek garansi online...";
    if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
    let response;
    try {
      if (!window.PolarWarrantyOnline) throw new Error("Layanan garansi belum dimuat. Muat ulang halaman.");
      const online = await window.PolarWarrantyOnline.lookup(code, currentController.signal);
      if (id !== requestId) return;
      response = core.lookup(online ? { version: 1, records: [online] } : window.PolarWarrantyRegistry, code);
    } catch (error) {
      if (id === requestId) message.textContent = error.name === "AbortError" ? "Koneksi terlalu lama. Coba cek kembali atau hubungi Polar CS." : error.message || "Layanan garansi belum tersedia. Coba lagi.";
      return;
    } finally {
      window.clearTimeout(timeout);
      if (id === requestId && button) { button.disabled = false; button.removeAttribute("aria-busy"); }
    }
    if (!response.record) {
      message.textContent = "Nomor garansi belum diaktifkan atau belum terdaftar. Periksa nomor kartu atau hubungi Polar CS untuk aktivasi.";
      return;
    }
    message.textContent = "";
    const record = response.record;
    const badge = document.createElement("p");
    badge.className = `warranty-status status-${response.status}`;
    badge.textContent = headings[response.status];
    const title = document.createElement("h3");
    title.textContent = record.vehicle;
    const number = document.createElement("p");
    number.className = "warranty-number";
    number.textContent = record.code;
    const list = document.createElement("dl");
    list.className = "warranty-details";
    [
      ["Nomor rangka", `***********${record.vinSuffix}`],
      ["Tahun / warna", `${record.year} / ${record.color}`],
      ["Dealer", record.dealer],
      ["Tanggal pemasangan", core.formatDate(record.installedAt)],
      ["Berlaku sampai", core.formatDate(record.expiresAt)],
      ["Masa garansi", `${record.years} tahun`],
      ["Jenis produk", core.productType(record) === "ppf" ? "Paint Protection Film" : "Kaca film"],
      ...core.productDetails(record),
    ].forEach(([label, value]) => list.append(field(label, value)));
    result.append(badge, title, number, list);
    result.hidden = false;
    result.focus({ preventScroll: true });
  }

  form.addEventListener("submit", event => { event.preventDefault(); check(); });
  input.addEventListener("input", () => {
    requestId++;
    controller?.abort();
    if (button) { button.disabled = false; button.removeAttribute("aria-busy"); }
    input.removeAttribute("aria-invalid");
    result.hidden = true;
    message.textContent = "";
  });
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) { input.value = code; check(); }
  window.lucide?.createIcons();
})();
