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
    return record;
  }
  function activationUrl(draft) {
    return `${origin}/activate#${encodeURIComponent(JSON.stringify(core.publicRecord(draft)))}`;
  }
  window.PolarWarrantyOnline = { lookup, activationUrl };
})();
