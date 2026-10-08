(function () {
  "use strict";
  const core = window.PolarWarranty;
  const form = document.querySelector("[data-card-form]");
  if (!form || !core) return;
  const message = document.querySelector("[data-editor-message]");
  const printButton = document.querySelector("[data-print-card]");
  const pdfButton = document.querySelector("[data-download-pdf]");
  let pdfBusy = false;
  const savedSelect = document.querySelector("[data-saved-drafts]");
  const exportButton = document.querySelector("[data-export-registry]");
  const backupButton = document.querySelector("[data-export-drafts]");
  const badge = document.querySelector("[data-draft-state]");
  const previewStatus = document.querySelector("[data-preview-status]");
  const qrContainer = document.querySelector("[data-card-qr]");
  const storageKey = "polar-warranty-drafts-v1";
  let drafts = [];
  let qrUrl = "";
  let qrReady = false;
  let registryAvailable = true;
  let publishedRecords = [];
  let storageAvailable = true;

  try { publishedRecords = core.registryRecords(window.PolarWarrantyRegistry); }
  catch (_) { registryAvailable = false; message.textContent = "Daftar garansi belum dimuat. Ekspor daftar belum tersedia."; }

  const filmFields = document.querySelector("[data-film-fields]");
  const positionLabels = { front: "Kaca depan", side: "Kaca samping", rear: "Kaca belakang" };
  core.positions.forEach(position => {
    const row = document.createElement("div");
    row.className = "form-columns";
    const seriesGroup = document.createElement("div");
    const seriesLabel = document.createElement("label");
    seriesLabel.htmlFor = `film-${position}-series`;
    seriesLabel.textContent = positionLabels[position];
    const seriesSelect = document.createElement("select");
    seriesSelect.name = `${position}Series`;
    seriesSelect.id = seriesLabel.htmlFor;
    core.series.forEach(series => seriesSelect.add(new Option(`Polar ${series}`, series)));
    seriesGroup.append(seriesLabel, seriesSelect);
    const tintGroup = document.createElement("div");
    const tintLabel = document.createElement("label");
    tintLabel.htmlFor = `film-${position}-tint`;
    tintLabel.textContent = "Tint";
    const tintSelect = document.createElement("select");
    tintSelect.name = `${position}Tint`;
    tintSelect.id = tintLabel.htmlFor;
    tintSelect.setAttribute("aria-label", `Tint ${positionLabels[position].toLowerCase()}`);
    core.shades.forEach(tint => tintSelect.add(new Option(`${tint}%`, String(tint))));
    tintGroup.append(tintLabel, tintSelect);
    row.append(seriesGroup, tintGroup);
    filmFields.append(row);
  });

  form.elements.code.value = uniqueCode();
  form.elements.installedAt.value = core.today();
  form.elements.installedAt.max = core.today();
  form.elements.year.value = core.today().slice(0, 4);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.drafts) || !parsed.drafts.every(core.isDraft)) throw new Error("Draf tidak valid");
      drafts = parsed.drafts;
      form.elements.baseUrl.value = core.cleanBaseUrl(parsed.baseUrl);
    }
  } catch (_) {
    storageAvailable = false;
    message.textContent = "Penyimpanan draf tidak tersedia. Cetak kartu dan backup tetap bisa digunakan pada sesi ini.";
  }
  if (!form.elements.baseUrl.value && window.location.protocol === "https:") {
    form.elements.baseUrl.value = core.cleanBaseUrl(new URL("./", window.location.href).href);
  }

  function uniqueCode() {
    let code;
    do { code = core.createCode(); }
    while (drafts.some(draft => draft.code === code) || publishedRecords.some(record => record.code === code));
    return code;
  }

  function readForm() {
    const value = name => form.elements[name].value.trim();
    const record = {
      code: core.normalizeCode(value("code")), dealer: value("dealer"),
      vehicle: value("vehicle"), vin: value("vin").toUpperCase(),
      year: Number(value("year")), color: value("color"), installedAt: value("installedAt"),
      years: Number(value("years")), notes: value("notes"), films: {},
    };
    record.expiresAt = core.expiryDate(record.installedAt, record.years);
    core.positions.forEach(position => {
      record.films[position] = { series: value(`${position}Series`), tint: Number(value(`${position}Tint`)) };
    });
    return record;
  }

  function fillForm(record) {
    ["code", "dealer", "vehicle", "vin", "year", "color", "installedAt", "years", "notes"].forEach(key => {
      form.elements[key].value = record[key];
    });
    core.positions.forEach(position => {
      form.elements[`${position}Series`].value = record.films[position].series;
      form.elements[`${position}Tint`].value = String(record.films[position].tint);
    });
    render();
  }

  function renderQr(url) {
    if (url === qrUrl) return;
    qrUrl = url;
    qrReady = false;
    qrContainer.replaceChildren();
    if (!url) {
      const text = document.createElement("span");
      text.textContent = "Alamat website belum diisi";
      qrContainer.append(text);
      return;
    }
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(url);
      qr.make();
      const svg = new DOMParser().parseFromString(qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true }), "image/svg+xml").documentElement;
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "QR untuk cek garansi Polar");
      qrContainer.append(document.importNode(svg, true));
      qrReady = true;
    } catch (_) {
      qrContainer.textContent = "QR belum dapat dibuat";
    }
  }

  function render() {
    const record = readForm();
    const url = core.verificationUrl(form.elements.baseUrl.value, record.code);
    renderQr(url);
    const text = {
      ...record, yearColor: `${record.year || "-"} / ${record.color || "-"}`,
      installedLabel: core.formatDate(record.installedAt), expiryLabel: core.formatDate(record.expiresAt),
      yearsLabel: `${record.years} tahun`,
    };
    core.positions.forEach(position => { text[`${position}Label`] = `Polar ${record.films[position].series} / ${record.films[position].tint}% Tint`; });
    document.querySelectorAll("[data-card-text]").forEach(element => { element.textContent = text[element.dataset.cardText] || "-"; });
    document.querySelector("[data-expiry-label]").textContent = text.expiryLabel;
    const cardLink = document.querySelector("[data-card-url]");
    cardLink.textContent = url ? new URL(url).hostname : "Alamat website belum diisi";
    if (url) cardLink.href = url;
    else cardLink.removeAttribute("href");
    const published = publishedRecords.find(item => item.code === record.code);
    const validDraft = core.isDraft(record);
    const conflict = Boolean(published && (!validDraft || !core.sameRecord(published, core.publicRecord(record))));
    const cancelled = published?.state === "cancelled";
    const complete = validDraft && qrReady && !conflict && !cancelled;
    printButton.disabled = !complete;
    pdfButton.disabled = !complete || pdfBusy;
    previewStatus.textContent = conflict ? "Data berbeda dari daftar terbitan" : cancelled ? "Garansi dibatalkan" : complete ? "Siap dicetak" : "Data kartu belum lengkap";
    badge.textContent = conflict ? "Data perlu dikonfirmasi" : cancelled ? "Nomor dibatalkan" : published ? "Nomor sudah diterbitkan" : "Draf belum diterbitkan";
    badge.classList.toggle("is-published", Boolean(published && !conflict && !cancelled));
  }

  function updateDraftList(selectedCode = "") {
    savedSelect.replaceChildren(new Option(drafts.length ? "Pilih draf tersimpan" : "Belum ada draf", ""));
    drafts.slice().reverse().forEach(record => savedSelect.add(new Option(`${record.vehicle} / ${record.code}`, record.code)));
    savedSelect.value = selectedCode;
    backupButton.disabled = drafts.length === 0;
    exportButton.disabled = drafts.length === 0 || !registryAvailable;
  }

  function persist() {
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, baseUrl: core.cleanBaseUrl(form.elements.baseUrl.value), drafts }));
      return true;
    } catch (_) {
      storageAvailable = false;
      return false;
    }
  }

  function validate() {
    form.elements.code.value = core.normalizeCode(form.elements.code.value);
    form.elements.vin.value = form.elements.vin.value.trim().toUpperCase();
    const baseUrl = core.cleanBaseUrl(form.elements.baseUrl.value);
    form.elements.baseUrl.setCustomValidity(baseUrl ? "" : "Masukkan alamat HTTPS website Polar yang sudah online.");
    if (!form.reportValidity()) return null;
    const record = readForm();
    if (!core.isDraft(record)) { message.textContent = "Periksa kembali data kendaraan dan tanggal pemasangan."; return null; }
    const published = publishedRecords.find(item => item.code === record.code);
    if (published && !core.sameRecord(published, core.publicRecord(record))) { message.textContent = "Data berbeda dari nomor yang sudah diterbitkan. Gunakan nomor baru atau hubungi Polar CS."; return null; }
    if (published?.state === "cancelled") { message.textContent = "Nomor ini sudah dibatalkan. Hubungi Polar CS."; return null; }
    render();
    if (!qrReady) { message.textContent = "QR belum tersedia. Periksa alamat website sebelum mencetak."; return null; }
    return record;
  }

  function save(record) {
    const index = drafts.findIndex(item => item.code === record.code);
    if (index === -1) drafts.push(record);
    else drafts[index] = record;
    const persisted = persist();
    updateDraftList(record.code);
    message.textContent = persisted ? "Draf tersimpan di perangkat ini. Belum diterbitkan ke daftar garansi online." : "Draf tersimpan sementara. Unduh Backup Draf sebelum menutup halaman.";
  }

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  form.addEventListener("input", () => {
    form.elements.baseUrl.setCustomValidity("");
    render();
  });
  form.addEventListener("change", render);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const record = validate();
    if (record) save(record);
  });
  document.querySelector("[data-new-code]").addEventListener("click", () => {
    form.elements.code.value = uniqueCode();
    savedSelect.value = "";
    render();
    message.textContent = "Nomor garansi baru dibuat.";
  });
  savedSelect.addEventListener("change", () => {
    const record = drafts.find(item => item.code === savedSelect.value);
    if (record) { fillForm(record); message.textContent = "Draf dimuat."; }
  });
  document.querySelector("[data-print-select]").addEventListener("change", event => {
    document.body.dataset.printSide = event.target.value;
  });
  printButton.addEventListener("click", async () => {
    if (!validate()) return;
    await document.fonts.ready;
    await Promise.all(Array.from(document.querySelectorAll(".warranty-card img"), img => img.decode().catch(() => {})));
    window.print();
  });
  pdfButton.addEventListener("click", async () => {
    const record = validate();
    if (!record || pdfBusy) return;
    pdfBusy = true;
    pdfButton.disabled = true;
    pdfButton.setAttribute("aria-busy", "true");
    message.textContent = "Menyiapkan PDF kartu garansi...";
    try {
      if (!window.PolarWarrantyPdf) throw new Error("Pembuat PDF belum dimuat. Muat ulang halaman dan coba lagi.");
      const bytes = await window.PolarWarrantyPdf.create(record, form.elements.baseUrl.value, document.body.dataset.printSide);
      download(`Polar-Warranty-${record.code}.pdf`, bytes, "application/pdf");
      message.textContent = "Unduhan PDF dimulai. Penerbitan garansi online tetap melalui daftar resmi Polar.";
    } catch (error) {
      message.textContent = error.message || "PDF belum dapat dibuat. Coba lagi atau gunakan tombol Cetak.";
    } finally {
      pdfBusy = false;
      pdfButton.removeAttribute("aria-busy");
      render();
    }
  });
  backupButton.addEventListener("click", () => {
    download(`polar-warranty-drafts-${core.today()}.json`, JSON.stringify({ version: 1, baseUrl: core.cleanBaseUrl(form.elements.baseUrl.value), drafts }, null, 2), "application/json");
    message.textContent = "Backup draf diunduh. File ini memuat nomor rangka lengkap; simpan untuk arsip internal.";
  });
  document.querySelector("[data-import-drafts]").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw new Error("File draf terlalu besar.");
      const data = JSON.parse(await file.text());
      if (!data || data.version !== 1 || !Array.isArray(data.drafts) || data.drafts.length > 1000 || !data.drafts.every(core.isDraft)) throw new Error("Format backup draf tidak sesuai.");
      if (new Set(data.drafts.map(item => item.code)).size !== data.drafts.length) throw new Error("Nomor garansi duplikat di backup.");
      const existingCodes = new Set(drafts.map(item => item.code));
      const incoming = data.drafts.filter(item => !existingCodes.has(item.code));
      drafts.push(...incoming);
      if (!form.elements.baseUrl.value) form.elements.baseUrl.value = core.cleanBaseUrl(data.baseUrl);
      const persisted = persist();
      updateDraftList();
      render();
      message.textContent = `${incoming.length} draf ditambahkan. ${persisted ? "Draf tersimpan di perangkat ini." : "Unduh backup sebelum menutup halaman."}`;
    } catch (error) { message.textContent = error.message || "Backup belum dapat dibaca."; }
    event.target.value = "";
  });
  exportButton.addEventListener("click", () => {
    try {
      const current = readForm();
      const saved = drafts.find(item => item.code === current.code);
      if (saved && JSON.stringify(saved) !== JSON.stringify(current)) throw new Error("Simpan perubahan draf sebelum mengekspor daftar garansi.");
      const content = core.exportRegistry(window.PolarWarrantyRegistry, drafts);
      download("warranty-registry.js", content, "text/javascript");
      message.textContent = "Daftar diunduh. Terbitkan file ini ke website Polar untuk mengaktifkan pengecekan online.";
    } catch (error) { message.textContent = error.message; }
  });
  updateDraftList();
  render();
  window.lucide?.createIcons();
})();
