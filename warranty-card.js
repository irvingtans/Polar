(function () {
  "use strict";
  if (!window.PolarAdmin?.allowed()) return;
  const core = window.PolarWarranty;
  const form = document.querySelector("[data-card-form]");
  if (!form || !core) return;
  const message = document.querySelector("[data-editor-message]");
  const printButton = document.querySelector("[data-print-card]");
  const pdfButton = document.querySelector("[data-download-pdf]");
  const activateButton = document.querySelector("[data-activate-online]");
  const photosButton = document.querySelector("[data-manage-photos]");
  const onlineRecords = new Map();
  let onlineRequest = 0;
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
  let windowFilmYears = "5";

  function publishedRecord(code) {
    return onlineRecords.get(code) || publishedRecords.find(item => item.code === code);
  }

  async function refreshOnlineStatus() {
    const code = core.normalizeCode(form.elements.code.value);
    if (!core.codePattern.test(code) || !window.PolarWarrantyOnline) return;
    const id = ++onlineRequest;
    try {
      const record = await window.PolarWarrantyOnline.lookup(code, AbortSignal.timeout(12000));
      if (id !== onlineRequest) return;
      if (record) onlineRecords.set(code, record);
      else onlineRecords.delete(code);
      if (core.normalizeCode(form.elements.code.value) === code) render();
    } catch (_) {
      if (id === onlineRequest) badge.textContent = "Status online belum dapat diperiksa";
    }
  }

  try { publishedRecords = core.registryRecords(window.PolarWarrantyRegistry); }
  catch (_) { registryAvailable = false; message.textContent = "Daftar garansi belum dimuat. Ekspor daftar belum tersedia."; }

  const filmFields = document.querySelector("[data-film-fields]");
  let filmPositions = core.positions;
  function buildFilmFields(positions = core.positions) {
    filmPositions = positions;
    filmFields.replaceChildren();
    positions.forEach(position => {
      const row = document.createElement("div");
      row.className = "form-columns";
      const seriesGroup = document.createElement("div");
      const seriesLabel = document.createElement("label");
      seriesLabel.htmlFor = `film-${position}-series`;
      seriesLabel.textContent = core.positionLabels[position];
      const seriesSelect = document.createElement("select");
      seriesSelect.name = `${position}Series`;
      seriesSelect.id = seriesLabel.htmlFor;
      seriesSelect.add(new Option("None", ""));
      core.series.forEach(series => seriesSelect.add(new Option(`Polar ${series}`, series)));
      seriesGroup.append(seriesLabel, seriesSelect);
      const tintGroup = document.createElement("div");
      const tintLabel = document.createElement("label");
      tintLabel.htmlFor = `film-${position}-tint`;
      tintLabel.textContent = "Tint";
      const tintSelect = document.createElement("select");
      tintSelect.name = `${position}Tint`;
      tintSelect.id = tintLabel.htmlFor;
      tintSelect.setAttribute("aria-label", `Tint ${core.positionLabels[position]}`);
      const noTint = new Option("None", "");
      noTint.disabled = true;
      tintSelect.add(noTint);
      core.shades.forEach(tint => tintSelect.add(new Option(`${tint}%`, String(tint))));
      tintGroup.append(tintLabel, tintSelect);
      row.append(seriesGroup, tintGroup);
      filmFields.append(row);
    });
  }
  buildFilmFields();
  core.ppfSeries.forEach(series => form.elements.ppfSeries.add(new Option(`PPF POLAR ${series}`, series)));

  function syncProductFields() {
    const ppf = form.elements.productType.value === "ppf";
    const ppfFields = document.querySelector("[data-ppf-fields]");
    const windowFields = document.querySelector("[data-window-film-fields]");
    ppfFields.hidden = !ppf;
    ppfFields.disabled = !ppf;
    windowFields.hidden = ppf;
    windowFields.disabled = ppf;
    form.elements.years.disabled = ppf;
    if (ppf) form.elements.years.value = "5";
    filmPositions.forEach(position => {
      const tint = form.elements[`${position}Tint`];
      const none = form.elements[`${position}Series`].value === "";
      tint.disabled = ppf || none;
      if (none) tint.value = "";
      else if (!tint.value) tint.value = String(core.shades[0]);
    });
  }

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
      years: Number(value("years")), notes: value("notes"), productType: value("productType"),
    };
    record.expiresAt = core.expiryDate(record.installedAt, record.years);
    if (record.productType === "ppf") record.ppf = { series: value("ppfSeries"), coverage: value("ppfCoverage") };
    else {
      record.films = {};
      filmPositions.forEach(position => {
        const series = value(`${position}Series`);
        record.films[position] = series ? { series, tint: Number(value(`${position}Tint`)) } : null;
      });
    }
    return record;
  }

  function fillForm(record) {
    form.elements.productType.value = core.productType(record);
    ["code", "dealer", "vehicle", "vin", "year", "color", "installedAt", "years", "notes"].forEach(key => {
      form.elements[key].value = record[key];
    });
    if (core.productType(record) === "ppf") {
      form.elements.ppfSeries.value = record.ppf.series;
      form.elements.ppfCoverage.value = record.ppf.coverage;
    } else {
      windowFilmYears = String(record.years);
      const positions = core.positionsForFilms(record.films);
      if (positions.join() !== filmPositions.join()) buildFilmFields(positions);
      positions.forEach(position => {
        const film = record.films[position];
        form.elements[`${position}Series`].value = film?.series || "";
        form.elements[`${position}Tint`].value = film ? String(film.tint) : "";
      });
    }
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
    syncProductFields();
    const record = readForm();
    const url = core.verificationUrl(form.elements.baseUrl.value, record.code);
    renderQr(url);
    const text = {
      ...record, yearColor: `${record.year || "-"} / ${record.color || "-"}`,
      installedLabel: core.formatDate(record.installedAt), expiryLabel: core.formatDate(record.expiresAt),
      yearsLabel: `${record.years} tahun`,
      cardLabel: record.productType === "ppf" ? "PPF WARRANTY CARD" : "WARRANTY CARD",
      welcome: record.productType === "ppf" ? "Terima kasih telah memilih Polar Profilms untuk perlindungan kendaraan Anda." : "Terima kasih telah memilih Polar Profilms untuk kenyamanan, privasi, dan perlindungan kendaraan Anda.",
    };
    document.querySelector("[data-product-heading]").textContent = record.productType === "ppf" ? "Paint Protection Film" : "Tipe kaca film";
    const details = document.querySelector("[data-product-details]");
    details.replaceChildren();
    core.productDetails(record).forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      details.append(row);
    });
    document.querySelectorAll("[data-card-text]").forEach(element => { element.textContent = text[element.dataset.cardText] || "-"; });
    document.querySelector("[data-expiry-label]").textContent = text.expiryLabel;
    const cardLink = document.querySelector("[data-card-url]");
    cardLink.textContent = url ? new URL(url).hostname : "Alamat website belum diisi";
    if (url) cardLink.href = url;
    else cardLink.removeAttribute("href");
    const published = publishedRecord(record.code);
    const validDraft = core.isDraft(record);
    const conflict = Boolean(published && (!validDraft || !core.sameRecord(published, core.publicRecord(record))));
    const cancelled = published?.state === "cancelled";
    const complete = validDraft && qrReady && !conflict && !cancelled;
    const noFilms = record.productType === "window-film" && filmPositions.every(position => record.films[position] === null);
    printButton.disabled = !complete;
    pdfButton.disabled = !complete || pdfBusy;
    if (activateButton) activateButton.disabled = !complete || Boolean(published);
    if (photosButton) photosButton.disabled = !complete || !published;
    previewStatus.textContent = conflict ? "Data berbeda dari daftar terbitan" : cancelled ? "Garansi dibatalkan" : noFilms ? "Pilih minimal satu area pemasangan" : complete ? "Siap dicetak" : "Data kartu belum lengkap";
    badge.textContent = conflict ? "Data perlu dikonfirmasi" : cancelled ? "Nomor dibatalkan" : published ? "Terdaftar online" : "Belum diaktifkan online";
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
    if (!window.PolarAdmin.requireAccess("expired")) return null;
    form.elements.code.value = core.normalizeCode(form.elements.code.value);
    form.elements.vin.value = form.elements.vin.value.trim().toUpperCase();
    const baseUrl = core.cleanBaseUrl(form.elements.baseUrl.value);
    form.elements.baseUrl.setCustomValidity(baseUrl ? "" : "Masukkan alamat HTTPS website Polar yang sudah online.");
    if (!form.reportValidity()) return null;
    const record = readForm();
    if (record.productType === "window-film" && filmPositions.every(position => record.films[position] === null)) {
      message.textContent = "Pilih seri kaca film untuk minimal satu area pemasangan. Area lainnya dapat dipilih None.";
      return null;
    }
    if (!core.isDraft(record)) { message.textContent = "Periksa kembali data kendaraan dan tanggal pemasangan."; return null; }
    const published = publishedRecord(record.code);
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
    message.textContent = persisted ? "Draf tersimpan di perangkat ini. Tekan Aktifkan Online agar nomor kartu dapat dicek pelanggan." : "Draf tersimpan sementara. Unduh Backup Draf sebelum menutup halaman.";
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

  form.addEventListener("input", event => {
    if (event.target.name === "productType") return;
    form.elements.baseUrl.setCustomValidity("");
    render();
  });
  form.addEventListener("change", event => {
    if (event.target.name === "productType") {
      if (event.target.value === "ppf") {
        windowFilmYears = form.elements.years.value;
        form.elements.years.value = "5";
      } else form.elements.years.value = windowFilmYears;
      savedSelect.value = "";
    }
    render();
    if (event.target.name === "code") refreshOnlineStatus();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const record = validate();
    if (record) save(record);
  });
  document.querySelector("[data-new-code]").addEventListener("click", () => {
    form.elements.code.value = uniqueCode();
    if (filmPositions.join() !== core.positions.join()) buildFilmFields();
    savedSelect.value = "";
    render();
    message.textContent = "Nomor garansi baru dibuat.";
    refreshOnlineStatus();
  });
  savedSelect.addEventListener("change", () => {
    const record = drafts.find(item => item.code === savedSelect.value);
    if (record) { fillForm(record); message.textContent = "Draf dimuat."; refreshOnlineStatus(); }
  });
  activateButton?.addEventListener("click", () => {
    const record = validate();
    if (!record || !window.PolarWarrantyOnline) return;
    save(record);
    const url = window.PolarWarrantyOnline.activationUrl(record);
    window.open(url, "_blank", "noopener,noreferrer");
    message.textContent = "Konfirmasi aktivasi di tab yang terbuka menggunakan akun pemilik Polar. Kartu belum aktif sebelum konfirmasi berhasil.";
  });
  window.addEventListener("focus", refreshOnlineStatus);
  photosButton?.addEventListener("click", () => {
    const record = validate();
    if (!record || !publishedRecord(record.code) || !window.PolarWarrantyOnline) return;
    window.open(window.PolarWarrantyOnline.photoManagerUrl(record.code), "_blank", "noopener,noreferrer");
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
      message.textContent = "Unduhan PDF dimulai. Pastikan kartu sudah diaktifkan melalui tombol Aktifkan Online.";
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
  refreshOnlineStatus();
  window.lucide?.createIcons();
})();
