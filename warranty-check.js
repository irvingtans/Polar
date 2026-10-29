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
  let photoDialog;

  function iconButton(icon, label) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "w-photo-icon";
    element.setAttribute("aria-label", label);
    element.title = label;
    const symbol = document.createElement("i");
    symbol.dataset.lucide = icon;
    symbol.setAttribute("aria-hidden", "true");
    element.append(symbol);
    return element;
  }

  function showPhoto(photos, index, vehicle, opener) {
    photoDialog?.close();
    const dialog = document.createElement("dialog");
    photoDialog = dialog;
    dialog.className = "w-photo-dialog";
    dialog.setAttribute("aria-label", `Foto ${vehicle}`);
    const close = iconButton("x", "Tutup foto");
    const previous = iconButton("chevron-left", "Foto sebelumnya");
    const next = iconButton("chevron-right", "Foto berikutnya");
    const image = document.createElement("img");
    image.referrerPolicy = "no-referrer";
    const caption = document.createElement("p");
    caption.className = "w-photo-caption";
    caption.setAttribute("aria-live", "polite");
    const toolbar = document.createElement("div");
    toolbar.className = "w-photo-toolbar";
    toolbar.append(previous, caption, next, close);
    dialog.append(image, toolbar);
    function renderPhoto() {
      const photo = photos[index];
      image.src = photo.url;
      image.alt = photo.caption || `Foto ${vehicle} ${index + 1}`;
      caption.textContent = `${index + 1} / ${photos.length}${photo.caption ? ` - ${photo.caption}` : ""}`;
      previous.disabled = index === 0;
      next.disabled = index === photos.length - 1;
    }
    previous.addEventListener("click", () => { if (index > 0) { index--; renderPhoto(); } });
    next.addEventListener("click", () => { if (index < photos.length - 1) { index++; renderPhoto(); } });
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); index--; renderPhoto(); }
      if (event.key === "ArrowRight" && index < photos.length - 1) { event.preventDefault(); index++; renderPhoto(); }
    });
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { dialog.remove(); if (photoDialog === dialog) photoDialog = null; opener.focus(); });
    document.body.append(dialog);
    renderPhoto();
    window.lucide?.createIcons();
    dialog.showModal();
  }

  function photoGallery(record) {
    const photos = record.photos || [];
    if (!photos.length) return null;
    const section = document.createElement("section");
    section.className = "w-photo-gallery";
    section.setAttribute("aria-label", "Foto kendaraan");
    const heading = document.createElement("h4");
    heading.textContent = "Foto Kendaraan";
    const grid = document.createElement("div");
    grid.className = "w-photo-grid";
    photos.forEach((photo, index) => {
      const item = document.createElement("figure");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "w-photo-thumb";
      button.setAttribute("aria-label", `Lihat foto ${index + 1}${photo.caption ? `: ${photo.caption}` : ""}`);
      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = photo.caption || `Foto ${record.vehicle} ${index + 1}`;
      image.width = 400; image.height = 300;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        image.hidden = true;
        const error = document.createElement("span");
        error.textContent = "Foto belum tersedia";
        button.append(error); button.disabled = true;
      }, { once: true });
      button.append(image);
      button.addEventListener("click", () => showPhoto(photos, index, record.vehicle, button));
      item.append(button);
      if (photo.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = photo.caption;
        item.append(caption);
      }
      grid.append(item);
    });
    section.append(heading, grid);
    return section;
  }

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
    photoDialog?.close();
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
    const gallery = photoGallery(record);
    if (gallery) result.append(gallery);
    result.hidden = false;
    result.focus({ preventScroll: true });
  }

  form.addEventListener("submit", event => { event.preventDefault(); check(); });
  input.addEventListener("input", () => {
    photoDialog?.close();
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
