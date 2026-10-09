(function (root) {
  "use strict";

  const series = ["Signature", "Drive", "Clear IR"];
  const ppfSeries = ["GLOSS\u00c9", "BLANC"];
  const shades = [10, 20, 40, 70, 80];
  const positions = ["front", "side", "rear"];
  const codePattern = /^PLR-\d{4}-[A-Z0-9]{8}$/;

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function dateValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  }

  function today() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  }

  function expiryDate(installedAt, years) {
    const date = dateValue(installedAt);
    if (!date || !Number.isInteger(years) || years < 5 || years > 10) return "";
    const month = date.getUTCMonth();
    date.setUTCFullYear(date.getUTCFullYear() + years);
    if (date.getUTCMonth() !== month) date.setUTCDate(0);
    return date.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    const date = dateValue(value);
    return date ? new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }).format(date) : "-";
  }

  function createCode() {
    const bytes = new Uint8Array(4);
    root.crypto.getRandomValues(bytes);
    const token = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `PLR-${today().slice(0, 4)}-${token}`;
  }

  function cleanBaseUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return "";
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || !url.hostname.includes(".")) return "";
      if (/\.html?$/i.test(url.pathname)) url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1);
      if (!url.pathname.endsWith("/")) url.pathname += "/";
      return url.href.length <= 240 ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function verificationUrl(baseUrl, code) {
    const base = cleanBaseUrl(baseUrl);
    if (!base || !codePattern.test(code)) return "";
    const url = new URL("warranty.html", base);
    url.searchParams.set("code", code);
    return url.href;
  }

  function validText(value, length = 80) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= length;
  }

  function validFilms(films) {
    return films && positions.every(position => {
      const film = films[position];
      return film && series.includes(film.series) && shades.includes(film.tint);
    });
  }

  function productType(record) {
    return record.productType === undefined ? "window-film" : record.productType;
  }

  function validProduct(record) {
    const type = productType(record);
    if (type === "window-film") return validFilms(record.films);
    return type === "ppf" && record.years === 5 && record.ppf &&
      ppfSeries.includes(record.ppf.series) && validText(record.ppf.coverage);
  }

  function productDetails(record) {
    if (productType(record) === "ppf") return [
      ["Seri PPF", `PPF POLAR ${record.ppf?.series || "-"}`],
      ["Area pemasangan", record.ppf?.coverage || "-"],
    ];
    const labels = { front: "Kaca depan", side: "Kaca samping", rear: "Kaca belakang" };
    return positions.map(position => [labels[position], `Polar ${record.films[position].series} / ${record.films[position].tint}% Tint`]);
  }

  function isPublicRecord(record) {
    return Boolean(record && codePattern.test(record.code) && validText(record.vehicle)
      && /^[A-HJ-NPR-Z0-9]{6}$/.test(record.vinSuffix || "")
      && Number.isInteger(record.year) && record.year >= 1950 && record.year <= 2100
      && validText(record.color, 30) && validText(record.dealer)
      && dateValue(record.installedAt) && record.installedAt <= today()
      && record.expiresAt === expiryDate(record.installedAt, record.years)
      && ["registered", "cancelled"].includes(record.state) && validProduct(record));
  }

  function isDraft(record) {
    return Boolean(record && /^[A-HJ-NPR-Z0-9]{17}$/.test(record.vin || "")
      && typeof record.notes === "string" && record.notes.length <= 450
      && isPublicRecord({ ...record, vinSuffix: record.vin.slice(-6), state: "registered" }));
  }

  function publicRecord(draft) {
    if (!isDraft(draft)) throw new Error("Data kartu belum lengkap.");
    return {
      code: draft.code, vehicle: draft.vehicle, vinSuffix: draft.vin.slice(-6),
      year: draft.year, color: draft.color, dealer: draft.dealer,
      installedAt: draft.installedAt, expiresAt: draft.expiresAt, years: draft.years,
      productType: productType(draft),
      ...(productType(draft) === "ppf" ? { ppf: { series: draft.ppf.series, coverage: draft.ppf.coverage } } : { films: draft.films }),
      state: "registered",
    };
  }

  function registryRecords(registry) {
    if (!registry || registry.version !== 1 || !Array.isArray(registry.records)) throw new Error("Daftar garansi belum tersedia.");
    if (!registry.records.every(isPublicRecord)) throw new Error("Daftar garansi perlu diperiksa oleh Polar CS.");
    if (new Set(registry.records.map(record => record.code)).size !== registry.records.length) throw new Error("Nomor garansi duplikat.");
    return registry.records;
  }

  function lookup(registry, code) {
    const record = registryRecords(registry).find(item => item.code === normalizeCode(code));
    if (!record) return { status: "not-found", record: null };
    const status = record.state === "cancelled" ? "cancelled" : record.expiresAt < today() ? "expired" : "active";
    return { status, record };
  }

  function sameRecord(previous, record) {
    if (productType(previous) !== productType(record) ||
        !["vehicle", "vinSuffix", "year", "color", "dealer", "installedAt", "expiresAt", "years"].every(key => previous[key] === record[key])) return false;
    if (productType(record) === "ppf") return previous.ppf.series === record.ppf.series && previous.ppf.coverage === record.ppf.coverage;
    return positions.every(position => previous.films[position].series === record.films[position].series && previous.films[position].tint === record.films[position].tint);
  }

  function exportRegistry(registry, drafts) {
    const records = registryRecords(registry).slice();
    drafts.forEach(draft => {
      const record = publicRecord(draft);
      const previous = records.find(item => item.code === record.code);
      if (previous) {
        if (!sameRecord(previous, record)) throw new Error(`Nomor ${record.code} sudah terdaftar dengan data berbeda. Hubungi Polar CS.`);
      } else records.push(record);
    });
    return `window.PolarWarrantyRegistry = ${JSON.stringify({ version: 1, records }, null, 2)};\n`;
  }

  root.PolarWarranty = { series, ppfSeries, shades, positions, productType, productDetails, codePattern, normalizeCode, today, expiryDate, formatDate, createCode, cleanBaseUrl, verificationUrl, isDraft, publicRecord, sameRecord, registryRecords, lookup, exportRegistry };
})(typeof window !== "undefined" ? window : globalThis);
