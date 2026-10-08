(function () {
  "use strict";
  const core = window.PolarWarranty;
  const form = document.querySelector("[data-warranty-check]");
  if (!form || !core) return;
  const input = form.elements.code;
  const message = document.querySelector("[data-warranty-message]");
  const result = document.querySelector("[data-warranty-result]");
  const headings = { active: "Garansi aktif", expired: "Masa garansi berakhir", cancelled: "Garansi dibatalkan" };

  function field(label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    return row;
  }

  function check() {
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
    let response;
    try {
      response = core.lookup(window.PolarWarrantyRegistry, input.value);
    } catch (_) {
      message.textContent = "Daftar garansi belum dapat dimuat. Silakan coba lagi atau hubungi Polar CS.";
      return;
    }
    if (!response.record) {
      message.textContent = "Nomor garansi belum ditemukan dalam daftar Polar. Periksa nomor kartu atau hubungi Polar CS untuk konfirmasi.";
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
      ["Kaca depan", `Polar ${record.films.front.series} / ${record.films.front.tint}% Tint`],
      ["Kaca samping", `Polar ${record.films.side.series} / ${record.films.side.tint}% Tint`],
      ["Kaca belakang", `Polar ${record.films.rear.series} / ${record.films.rear.tint}% Tint`],
    ].forEach(([label, value]) => list.append(field(label, value)));
    result.append(badge, title, number, list);
    result.hidden = false;
    result.focus({ preventScroll: true });
  }

  form.addEventListener("submit", event => { event.preventDefault(); check(); });
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    result.hidden = true;
    message.textContent = "";
  });
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) { input.value = code; check(); }
  window.lucide?.createIcons();
})();
