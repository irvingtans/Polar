(function () {
  "use strict";
  const origin = "https://polar-warranty-online.irvingtans.chatgpt.site";
  const core = window.PolarWarranty;
  async function lookup(code, signal) {
    const response = await fetch(`${origin}/api/warranties/${encodeURIComponent(code)}`, {
      cache: "no-store", credentials: "omit", signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(response.status === 429 ? "Terlalu banyak pengecekan. Coba beberapa saat lagi." : "Layanan garansi online belum dapat dihubungi. Coba lagi atau hubungi Polar CS.");
    const data = await response.json();
    const record = core.registryRecords({ version: 1, records: [data.record] })[0];
    if (record.code !== code) throw new Error("Konfirmasi nomor garansi tidak sesuai.");
    const photos = Array.isArray(data.photos) ? data.photos.slice(0, 6).filter(photo => photo && /^[a-f0-9-]{36}$/.test(photo.id)
      && typeof photo.caption === "string" && photo.caption.length <= 120 && !photo.hidden
      && photo.url === `${origin}/api/warranties/${encodeURIComponent(code)}/photos/${photo.id}/image`) : [];
    return { ...record, photos };
  }
  function activationUrl(draft) {
    return `${origin}/activate#${encodeURIComponent(JSON.stringify(core.publicRecord(draft)))}`;
  }
  function photoManagerUrl(code) {
    return core.codePattern.test(code) ? `${origin}/photos?code=${encodeURIComponent(code)}` : "";
  }
  window.PolarWarrantyOnline = { lookup, activationUrl, photoManagerUrl };
})();
