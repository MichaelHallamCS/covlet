// Browser-only helpers: always import dynamically or call from event handlers.
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export async function extractResumeText(file: File): Promise<string> {
  if (file.size > MAX_RESUME_BYTES) throw new Error("That file is larger than 5MB.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type === "text/plain") return (await file.text()).trim();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!value.trim()) throw new Error("We couldn't find any text in that Word file.");
    return value.trim();
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    try {
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        let line = "";
        const lines: string[] = [];
        for (const item of tc.items as Array<{ str?: string; hasEOL?: boolean }>) {
          line += item.str ?? "";
          if (item.hasEOL) {
            lines.push(line);
            line = "";
          }
        }
        if (line) lines.push(line);
        pages.push(lines.join("\n"));
      }
      const text = pages.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
      if (text.length < 30) throw new Error("scanned");
      return text;
    } catch {
      throw new Error(
        "We couldn't read text from that PDF (it may be a scanned image). Try a DOCX, or paste your resume text.",
      );
    }
  }
  throw new Error("Please upload a PDF, DOCX, or TXT file.");
}

export async function compressImage(file: File, maxDim = 1800, quality = 0.85): Promise<string> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error("Please use PNG or JPG images.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("That image is too large (max 15MB).");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Pull name + contact lines from the top of a resume for the letter header. */
export function resumeHeader(resume: string) {
  const lines = resume.split("\n").map((l) => l.trim()).filter(Boolean);
  const name = lines[0] && lines[0].length < 60 ? lines[0] : "";
  const email = resume.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? "";
  const phone = resume.match(/\+?\d[\d\s().-]{7,}\d/)?.[0] ?? "";
  const link = resume.match(/(?:linkedin\.com|github\.com)\/[\w\-/]+/i)?.[0] ?? "";
  return { name, contact: [email, phone, link].filter(Boolean).join("  ·  ") };
}

function today() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function downloadDocx(letter: string, resume: string, filename: string) {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const { name, contact } = resumeHeader(resume);
  const font = "Georgia";
  const children = [
    ...(name ? [new Paragraph({ children: [new TextRun({ text: name, bold: true, size: 32, font })] })] : []),
    ...(contact ? [new Paragraph({ children: [new TextRun({ text: contact, size: 20, font, color: "555555" })] })] : []),
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: today(), size: 22, font })] }),
    new Paragraph({ text: "" }),
    ...letter.split(/\n/).map(
      (l) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: l, size: 22, font })] }),
    ),
  ];
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  save(blob, `${filename}.docx`);
}

export async function downloadPdf(letter: string, resume: string, filename: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const { name, contact } = resumeHeader(resume);
  const margin = 72;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight();
  let y = margin;
  doc.setFont("times", "bold");
  if (name) {
    doc.setFontSize(18);
    doc.text(name, margin, y);
    y += 20;
  }
  doc.setFont("times", "normal");
  if (contact) {
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(contact.replace(/·/g, "|"), margin, y);
    doc.setTextColor(0);
    y += 28;
  }
  doc.setFontSize(11.5);
  doc.text(today(), margin, y);
  y += 30;
  for (const para of letter.split("\n")) {
    const wrapped = doc.splitTextToSize(para || " ", width) as string[];
    for (const l of wrapped) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(l, margin, y);
      y += 16;
    }
  }
  doc.save(`${filename}.pdf`);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
