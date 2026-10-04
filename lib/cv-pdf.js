const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const LABELS = {
  en: {
    summary: "Professional summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
    trainings: "Training",
    projects: "Projects",
    languages: "Languages",
    references: "Referees",
    present: "Present",
  },
  sw: {
    summary: "Muhtasari wa kitaaluma",
    experience: "Uzoefu",
    education: "Elimu",
    skills: "Ujuzi",
    certifications: "Vyeti vya kitaaluma",
    trainings: "Mafunzo",
    projects: "Miradi",
    languages: "Lugha",
    references: "Waamuzi",
    present: "Sasa",
  },
};

const SECTION_ORDER = [
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "trainings",
  "projects",
  "languages",
  "references",
];

function asciiText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201c\u201d\u2033]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7e]/g, "?");
}

function pdfEscape(value) {
  return asciiText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function safeFilename(value) {
  const cleaned = asciiText(value)
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "Daraja-CV";
}

function rgb(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return [0.106, 0.165, 0.247];
  const value = match[1];
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function readableAccent(hex) {
  const [r, g, b] = rgb(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.72 ? rgb("#1b2a3f") : [r, g, b];
}

function number(value) {
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function colorCommand(color, stroke = false) {
  return `${color.map(number).join(" ")} ${stroke ? "RG" : "rg"}`;
}

function estimatedWidth(text, size, family = "sans") {
  const factor = family === "serif" ? 0.48 : 0.51;
  return [...asciiText(text)].reduce((sum, char) => {
    if (char === " ") return sum + size * 0.28;
    if (/[ilI1.,'|]/.test(char)) return sum + size * 0.25;
    if (/[MW@%]/.test(char)) return sum + size * 0.82;
    if (/[A-Z]/.test(char)) return sum + size * 0.61;
    return sum + size * factor;
  }, 0);
}

function wrapText(text, maxWidth, size, family) {
  const paragraphs = String(text || "").replace(/\r/g, "").split(/\n+/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = asciiText(paragraph).trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || estimatedWidth(candidate, size, family) <= maxWidth) {
        line = candidate;
        continue;
      }
      lines.push(line);
      line = word;
      while (estimatedWidth(line, size, family) > maxWidth && line.length > 1) {
        let cut = Math.max(1, Math.floor(line.length * (maxWidth / estimatedWidth(line, size, family))));
        while (cut > 1 && estimatedWidth(line.slice(0, cut), size, family) > maxWidth) cut -= 1;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function fontConfig(theme = {}) {
  const serif = ["Georgia", "Times New Roman"].includes(theme.fontFamily);
  return {
    family: serif ? "serif" : "sans",
    regular: serif ? "Times-Roman" : "Helvetica",
    bold: serif ? "Times-Bold" : "Helvetica-Bold",
  };
}

class CvPdfRenderer {
  constructor(cv) {
    this.cv = cv;
    this.content = cv.content || {};
    this.theme = cv.theme || {};
    this.labels = LABELS[cv.language] || LABELS.en;
    this.font = fontConfig(this.theme);
    this.accent = rgb(this.theme.accent || "#1b2a3f");
    this.accentText = readableAccent(this.theme.accent || "#1b2a3f");
    this.margin = this.theme.pageMargin === "narrow" ? 42 : this.theme.pageMargin === "wide" ? 64 : 52;
    this.width = PAGE_WIDTH - this.margin * 2;
    this.bodySize = this.theme.density === "compact" ? 9.2 : this.theme.density === "spacious" ? 10.8 : 10;
    this.lineHeight = this.bodySize * (this.theme.density === "compact" ? 1.26 : this.theme.density === "spacious" ? 1.48 : 1.36);
    this.pages = [];
    this.page = null;
    this.newPage();
  }

  newPage() {
    this.page = { commands: [], y: PAGE_HEIGHT - this.margin };
    this.pages.push(this.page);
  }

  ensure(height) {
    if (this.page.y - height < this.margin) this.newPage();
  }

  line(x1, y1, x2, y2, color = this.accent, width = 0.7) {
    this.page.commands.push(
      `q ${colorCommand(color, true)} ${number(width)} w ${number(x1)} ${number(y1)} m ${number(x2)} ${number(y2)} l S Q`
    );
  }

  rect(x, y, w, h, color = this.accent) {
    this.page.commands.push(
      `q ${colorCommand(color)} ${number(x)} ${number(y)} ${number(w)} ${number(h)} re f Q`
    );
  }

  text(value, {
    x = this.margin,
    y = this.page.y,
    size = this.bodySize,
    bold = false,
    color = [0.12, 0.15, 0.18],
    align = "left",
    maxWidth = this.width,
  } = {}) {
    const clean = asciiText(value);
    let drawX = x;
    if (align === "center") {
      drawX = x + Math.max(0, (maxWidth - estimatedWidth(clean, size, this.font.family)) / 2);
    } else if (align === "right") {
      drawX = x + Math.max(0, maxWidth - estimatedWidth(clean, size, this.font.family));
    }
    const font = bold ? "F2" : "F1";
    this.page.commands.push(
      `BT /${font} ${number(size)} Tf ${colorCommand(color)} 1 0 0 1 ${number(drawX)} ${number(y)} Tm (${pdfEscape(clean)}) Tj ET`
    );
  }

  wrapped(value, {
    x = this.margin,
    size = this.bodySize,
    bold = false,
    color = [0.12, 0.15, 0.18],
    maxWidth = this.width,
    indent = 0,
    bullet = null,
    gapAfter = 3,
  } = {}) {
    const bulletWidth = bullet ? 12 : 0;
    const lines = wrapText(value, maxWidth - indent - bulletWidth, size, this.font.family);
    const height = Math.max(1, lines.length) * this.lineHeight + gapAfter;
    this.ensure(height);
    lines.forEach((line, index) => {
      if (index === 0 && bullet) {
        this.text(bullet, { x: x + indent, y: this.page.y, size, bold, color, maxWidth: bulletWidth });
      }
      this.text(line, {
        x: x + indent + bulletWidth,
        y: this.page.y,
        size,
        bold,
        color,
        maxWidth: maxWidth - indent - bulletWidth,
      });
      this.page.y -= this.lineHeight;
    });
    this.page.y -= gapAfter;
  }

  sectionHeading(label) {
    this.ensure(28);
    this.page.y -= 8;
    const heading = this.theme.headingStyle === "caps" ? asciiText(label).toUpperCase() : label;
    if (this.theme.headingStyle === "accent") {
      this.rect(this.margin, this.page.y - 2, 3, 13, this.accent);
      this.text(heading, { x: this.margin + 9, y: this.page.y, size: 11.2, bold: true, color: this.accentText, maxWidth: this.width - 9 });
    } else {
      this.text(heading, { y: this.page.y, size: 11.2, bold: true, color: this.accentText });
      if (this.theme.headingStyle === "line") {
        this.line(this.margin, this.page.y - 5, PAGE_WIDTH - this.margin, this.page.y - 5, this.accent, 0.55);
      }
    }
    this.page.y -= 18;
  }

  header() {
    const personal = this.content.personal || {};
    const nameSize = this.theme.nameScale === "compact" ? 20 : this.theme.nameScale === "prominent" ? 28 : 24;
    const align = this.theme.headerAlign === "center" ? "center" : "left";
    const headerStart = this.page.y;
    this.text(personal.fullName || "Your name", {
      y: this.page.y,
      size: nameSize,
      bold: true,
      color: this.accentText,
      align,
    });
    this.page.y -= nameSize + 3;

    if (personal.headline) {
      this.text(personal.headline, {
        y: this.page.y,
        size: 11.5,
        bold: true,
        color: [0.25, 0.29, 0.33],
        align,
      });
      this.page.y -= 17;
    }

    const contacts = [
      personal.phone,
      personal.email,
      personal.location,
      this.cv.mode === "PUBLIC_SERVICE" ? personal.postalAddress : null,
      personal.linkedIn,
      personal.portfolio,
    ].filter(Boolean);

    if (contacts.length) {
      if (this.theme.contactStyle === "lines") {
        contacts.forEach((part) => {
          this.wrapped(part, { size: 8.8, color: [0.3, 0.34, 0.38], gapAfter: 0 });
        });
      } else {
        const separator = this.theme.contactStyle === "pipes" ? " | " : " - ";
        const lines = wrapText(contacts.join(separator), this.width, 8.8, this.font.family);
        lines.forEach((line) => {
          this.text(line, { y: this.page.y, size: 8.8, color: [0.3, 0.34, 0.38], align });
          this.page.y -= 11;
        });
      }
    }

    this.page.y -= 7;
    if (this.theme.headerStyle === "rule") {
      this.line(this.margin, this.page.y, PAGE_WIDTH - this.margin, this.page.y, this.accent, 1.2);
      this.page.y -= 8;
    } else if (this.theme.headerStyle === "accent") {
      this.rect(this.margin - 10, this.page.y, 4, headerStart - this.page.y + 6, this.accent);
      this.page.y -= 5;
    }
  }

  dateRange(item) {
    const start = item.startDate || item.startYear || "";
    const end = item.current ? this.labels.present : item.endDate || item.endYear || "";
    return [start, end].filter(Boolean).join(" - ");
  }

  experience() {
    const items = this.content.experience || [];
    if (!items.length) return;
    this.sectionHeading(this.labels.experience);
    for (const item of items) {
      this.ensure(42);
      this.wrapped(item.role || "Role", { size: 10.4, bold: true, color: [0.1, 0.13, 0.16], gapAfter: 1 });
      const detail = [item.employer, item.location].filter(Boolean).join(" - ");
      const range = this.dateRange(item);
      if (detail) this.wrapped(detail, { size: 9.4, bold: true, color: [0.28, 0.31, 0.35], gapAfter: 0 });
      if (range) this.wrapped(range, { size: 8.8, color: [0.36, 0.39, 0.42], gapAfter: 2 });
      for (const bullet of item.bullets || []) {
        const marker = this.theme.bulletStyle === "square" ? "*" : "-";
        this.wrapped(bullet, { size: this.bodySize, bullet: marker, indent: 3, gapAfter: 1 });
      }
      this.page.y -= 4;
    }
  }

  education() {
    const items = this.content.education || [];
    if (!items.length) return;
    this.sectionHeading(this.labels.education);
    for (const item of items) {
      this.ensure(38);
      this.wrapped(item.qualification || "Qualification", { size: 10.4, bold: true, gapAfter: 1 });
      const detail = [item.institution, item.location].filter(Boolean).join(" - ");
      if (detail) this.wrapped(detail, { size: 9.4, bold: true, color: [0.28, 0.31, 0.35], gapAfter: 0 });
      const range = this.dateRange(item);
      if (range) this.wrapped(range, { size: 8.8, color: [0.36, 0.39, 0.42], gapAfter: 2 });
      if (item.details) this.wrapped(item.details, { gapAfter: 3 });
      this.page.y -= 3;
    }
  }

  simpleList(key, label, formatter) {
    const items = this.content[key] || [];
    if (!items.length) return;
    this.sectionHeading(label);
    for (const item of items) {
      const text = formatter(item);
      if (text) this.wrapped(text, { bullet: "-", indent: 3, gapAfter: 1 });
    }
  }

  projects() {
    const items = this.content.projects || [];
    if (!items.length) return;
    this.sectionHeading(this.labels.projects);
    for (const item of items) {
      if (item.name) this.wrapped(item.name, { size: 10.2, bold: true, gapAfter: 1 });
      if (item.description) this.wrapped(item.description, { gapAfter: 1 });
      if (item.link) this.wrapped(item.link, { size: 8.8, color: [0.25, 0.32, 0.42], gapAfter: 3 });
      this.page.y -= 2;
    }
  }

  references() {
    const items = this.content.references || [];
    if (!items.length) return;
    this.sectionHeading(this.labels.references);
    for (const item of items) {
      const title = item.name || "";
      if (title) this.wrapped(title, { size: 10.1, bold: true, gapAfter: 1 });
      const role = [item.title, item.organisation].filter(Boolean).join(", ");
      if (role) this.wrapped(role, { size: 9.3, gapAfter: 0 });
      const contacts = [item.phone, item.email].filter(Boolean).join(" | ");
      if (contacts) this.wrapped(contacts, { size: 8.8, color: [0.32, 0.35, 0.38], gapAfter: 4 });
    }
  }

  renderSection(key) {
    if (key === "summary" && this.content.summary) {
      this.sectionHeading(this.labels.summary);
      this.wrapped(this.content.summary, { gapAfter: 2 });
    } else if (key === "experience") {
      this.experience();
    } else if (key === "education") {
      this.education();
    } else if (key === "skills" && this.content.skills?.length) {
      this.sectionHeading(this.labels.skills);
      this.wrapped(this.content.skills.join(" | "), { gapAfter: 2 });
    } else if (key === "certifications") {
      this.simpleList("certifications", this.labels.certifications, (item) =>
        [item.name, item.issuer, item.year].filter(Boolean).join(" - ")
      );
    } else if (key === "trainings") {
      this.simpleList("trainings", this.labels.trainings, (item) =>
        [item.name, item.provider, item.year].filter(Boolean).join(" - ")
      );
    } else if (key === "projects") {
      this.projects();
    } else if (key === "languages" && this.content.languages?.length) {
      this.sectionHeading(this.labels.languages);
      this.wrapped(
        this.content.languages
          .map((item) => [item.name, item.level].filter(Boolean).join(" - "))
          .filter(Boolean)
          .join(" | "),
        { gapAfter: 2 }
      );
    } else if (key === "references") {
      this.references();
    }
  }

  render() {
    this.header();
    const requested = Array.isArray(this.theme.sectionOrder) ? this.theme.sectionOrder : [];
    const order = [...new Set([...requested, ...SECTION_ORDER])].filter((key) => SECTION_ORDER.includes(key));
    order.forEach((key) => this.renderSection(key));
    return this.pages;
  }
}

function buildPdfObjects(cv, pages) {
  const font = fontConfig(cv.theme || {});
  const infoId = 5;
  const firstPageId = 6;
  const objects = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const kids = pages.map((_, index) => `${firstPageId + index * 2} 0 R`).join(" ");
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /${font.regular} /Encoding /WinAnsiEncoding >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /${font.bold} /Encoding /WinAnsiEncoding >>`;

  const personal = cv.content?.personal || {};
  objects[infoId] = `<< /Title (${pdfEscape(cv.name || "Daraja CV")}) /Author (${pdfEscape(personal.fullName || "")}) /Creator (Daraja Smart CV Builder) /Producer (Daraja) >>`;

  pages.forEach((page, index) => {
    const pageId = firstPageId + index * 2;
    const streamId = pageId + 1;
    const stream = page.commands.join("\n");
    const streamLength = Buffer.byteLength(stream, "latin1");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`;
    objects[streamId] = `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`;
  });

  return { objects, infoId };
}

function serializePdf(objects, infoId) {
  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let offset = chunks[0].length;

  for (let id = 1; id < objects.length; id += 1) {
    const body = Buffer.from(`${id} 0 obj\n${objects[id]}\nendobj\n`, "latin1");
    offsets[id] = offset;
    chunks.push(body);
    offset += body.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(chunks);
}

export function buildCandidateCvPdf(cv) {
  const renderer = new CvPdfRenderer(cv);
  const pages = renderer.render();
  const { objects, infoId } = buildPdfObjects(cv, pages);
  return serializePdf(objects, infoId);
}

export function candidateCvPdfFilename(cv) {
  const name = cv.content?.personal?.fullName || cv.name || "Daraja CV";
  return `${safeFilename(name)}-CV.pdf`;
}
