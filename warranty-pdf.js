(function () {
  "use strict";
  const width = 190;
  const height = 80;
  const pixelsPerMm = 12;
  const ink = "#121518";
  const muted = "#627078";
  const blue = "#0087b6";

  function linesFor(context, text, maxWidth) {
    const lines = [];
    String(text).split("\n").forEach(paragraph => {
      let line = "";
      paragraph.split(/\s+/).filter(Boolean).forEach(word => {
        if (line && context.measureText(`${line} ${word}`).width <= maxWidth) {
          line += ` ${word}`;
          return;
        }
        if (line) lines.push(line);
        line = "";
        Array.from(word).forEach(character => {
          if (line && context.measureText(line + character).width > maxWidth) {
            lines.push(line);
            line = "";
          }
          line += character;
        });
      });
      lines.push(line);
    });
    return lines;
  }

  function textBox(context, text, x, y, maxWidth, options = {}) {
    const { size = 2.7, minSize = size, maxLines = 1, maxHeight = Infinity, bold = false, color = ink, align = "left", ellipsis = false } = options;
    let fontSize = size;
    let lines;
    do {
      context.font = `${bold ? "700" : "400"} ${fontSize}px Arial, sans-serif`;
      lines = linesFor(context, text, maxWidth);
      if ((lines.length <= maxLines && lines.length * fontSize * 1.35 <= maxHeight) || fontSize <= minSize) break;
      fontSize = Math.max(minSize, fontSize - 0.1);
    } while (true);
    if (lines.length > maxLines || lines.length * fontSize * 1.35 > maxHeight) {
      if (!ellipsis) throw new Error("Teks kartu terlalu panjang. Singkatkan nama kendaraan, dealer, atau catatan garansi.");
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last && context.measureText(`${last}...`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last}...`;
    }
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = "top";
    const lineHeight = fontSize * 1.35;
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
    return lines.length * lineHeight;
  }

  function rule(context, y, color = "#dce1df", weight = 0.25) {
    context.strokeStyle = color;
    context.lineWidth = weight;
    context.beginPath();
    context.moveTo(8, y);
    context.lineTo(182, y);
    context.stroke();
  }

  function drawLogo(context, logo, x, y, logoWidth) {
    context.drawImage(logo, x, y, logoWidth, logoWidth * logo.height / logo.width);
  }

  function drawQr(context, url, qrFactory) {
    const qr = qrFactory(0, "M");
    qr.addData(url);
    qr.make();
    const count = qr.getModuleCount();
    const moduleSize = 35 / (count + 8);
    context.fillStyle = "white";
    context.fillRect(145, 24, 35, 35);
    context.fillStyle = "black";
    for (let row = 0; row < count; row++) {
      for (let column = 0; column < count; column++) {
        if (qr.isDark(row, column)) context.fillRect(145 + (column + 4) * moduleSize, 24 + (row + 4) * moduleSize, moduleSize, moduleSize);
      }
    }
  }

  function drawFront(context, record, url, logo, core, qrFactory, sample) {
    textBox(context, sample ? "CONTOH - BUKAN GARANSI AKTIF" : "WARRANTY CARD", 8, 10, 115, { size: 2.2, bold: true });
    drawLogo(context, logo, 153, 6, 29);
    rule(context, 18, blue, 0.45);
    textBox(context, "Selamat!", 8, 22, 122, { size: 7.5, bold: true });
    textBox(context, "Terima kasih telah memilih Polar Profilms untuk kenyamanan, privasi, dan perlindungan kendaraan Anda.", 8, 33, 122, { size: 2.5, maxLines: 2 });
    textBox(context, "Garansi & perawatan", 8, 42, 122, { size: 2.7, bold: true });
    textBox(context, record.notes, 8, 47, 122, { size: 2.4, minSize: 2, maxLines: 6, maxHeight: 17.5 });
    textBox(context, "Polar Customer Service", 8, 66, 122, { size: 2.5, bold: true });
    textBox(context, "+62 817 9377 001", 8, 70, 122, { size: 2.5 });
    drawQr(context, url, qrFactory);
    textBox(context, "Cek garansi Anda", 162.5, 61, 43, { size: 2.4, bold: true, align: "center" });
    textBox(context, record.code, 162.5, 65, 43, { size: 2.2, align: "center" });
    textBox(context, new URL(url).hostname, 162.5, 69, 43, { size: 2, minSize: 1.8, maxLines: 2, align: "center", ellipsis: true });
    rule(context, 75);
    textBox(context, "Designed in Sweden", 8, 76, 120, { size: 1.9, color: muted });
    textBox(context, `${record.years} tahun`, 182, 76, 45, { size: 1.9, color: muted, align: "right" });
  }

  function drawBack(context, record, logo, core, sample) {
    drawLogo(context, logo, 8, 6, 29);
    textBox(context, sample ? "CONTOH - BUKAN GARANSI AKTIF" : "DATA PEMASANGAN", 182, 10, 100, { size: 2.2, color: muted, align: "right" });
    rule(context, 18);
    const values = [
      ["Nomor garansi", record.code], ["Merek / tipe", record.vehicle],
      ["No. rangka", record.vin], ["Tahun / warna", `${record.year} / ${record.color}`],
      ["Dealer", record.dealer], ["Tanggal pasang", core.formatDate(record.installedAt)],
    ];
    let y = 24;
    values.forEach(([label, value]) => {
      textBox(context, label, 8, y, 30, { size: 2.4, color: muted });
      const usedHeight = textBox(context, value, 41, y, 71, { size: 2.6, minSize: 2.2, maxLines: 2, bold: true });
      y += Math.max(5.6, usedHeight + 1);
    });
    context.strokeStyle = "#dce1df";
    context.lineWidth = 0.25;
    context.beginPath();
    context.moveTo(118, 24);
    context.lineTo(118, 65);
    context.stroke();
    textBox(context, "Tipe kaca film", 125, 24, 57, { size: 3.1, bold: true });
    core.positions.forEach((position, index) => {
      const labels = { front: "Kaca depan", side: "Kaca samping", rear: "Kaca belakang" };
      const film = record.films[position];
      textBox(context, labels[position], 125, 33 + index * 10, 57, { size: 2.4, color: muted });
      textBox(context, `Polar ${film.series} / ${film.tint}% Tint`, 125, 37 + index * 10, 57, { size: 2.7, minSize: 2.3, bold: true });
    });
    rule(context, 70, blue, 0.45);
    textBox(context, "Berlaku sampai", 8, 73, 50, { size: 2.6, color: muted });
    textBox(context, core.formatDate(record.expiresAt), 182, 72.5, 100, { size: 4, bold: true, align: "right" });
  }

  function renderCard(record, side, options) {
    const { core, logo, qrFactory, canvasFactory, url, sample } = options;
    const canvas = canvasFactory(width * pixelsPerMm, height * pixelsPerMm);
    canvas.width = width * pixelsPerMm;
    canvas.height = height * pixelsPerMm;
    const context = canvas.getContext("2d");
    context.scale(pixelsPerMm, pixelsPerMm);
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.save();
    context.globalAlpha = side === "front" ? 0.025 : 0.015;
    for (const y of [-5, 28, 61]) for (const x of [-10, 65, 140]) drawLogo(context, logo, x, y, 75);
    context.restore();
    context.strokeStyle = "#d3d9d6";
    context.lineWidth = 0.2;
    context.strokeRect(0.1, 0.1, width - 0.2, height - 0.2);
    if (side === "front") drawFront(context, record, url, logo, core, qrFactory, sample);
    else drawBack(context, record, logo, core, sample);
    return canvas;
  }

  async function create(record, baseUrl, side = "both", options = {}) {
    const core = options.core || window.PolarWarranty;
    const library = options.library || window.PDFLib;
    const qrFactory = options.qrFactory || window.qrcode;
    const url = core.verificationUrl(baseUrl, record.code);
    if (!core.isDraft(record) || !url || !["both", "front", "back"].includes(side)) throw new Error("Data kartu atau alamat website belum valid.");
    if (!library || !qrFactory) throw new Error("Pembuat PDF belum dimuat. Muat ulang halaman dan coba lagi.");
    let logo = options.logo;
    if (!logo) {
      logo = new Image();
      if (!window.PolarWarrantyLogo) throw new Error("Logo kartu belum dimuat. Muat ulang halaman dan coba lagi.");
      logo.src = window.PolarWarrantyLogo;
      await logo.decode();
    }
    const canvasFactory = options.canvasFactory || (() => document.createElement("canvas"));
    const pdf = await library.PDFDocument.create();
    pdf.setTitle(`Kartu Garansi Polar - ${record.code}`);
    pdf.setAuthor("Polar Profilms");
    pdf.setSubject(options.sample ? "Contoh kartu, bukan garansi aktif" : "Kartu garansi pemasangan kaca film");
    const mm = 72 / 25.4;
    for (const selected of side === "both" ? ["front", "back"] : [side]) {
      const canvas = renderCard(record, selected, { core, logo, qrFactory, canvasFactory, url, sample: options.sample });
      const png = await pdf.embedPng(canvas.toDataURL("image/png"));
      const page = pdf.addPage([210 * mm, 297 * mm]);
      page.drawImage(png, { x: 10 * mm, y: (297 - 10 - height) * mm, width: width * mm, height: height * mm });
    }
    return pdf.save();
  }

  window.PolarWarrantyPdf = Object.freeze({ create, renderCard });
})();
