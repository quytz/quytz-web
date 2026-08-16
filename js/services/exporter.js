/**
 * QuizMaster Web - Exporter Service
 * Exports Quiz Sets to ZIP Bundles (RTF + JSON), DOCX, and JSON files on the client.
 */

class ExporterService {
  sanitizeFilename(name) {
    return (name || "Quiz")
      .replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_")
      .replace(/_+/g, "_");
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async exportQuizToZipBundle(quiz) {
    if (typeof JSZip === "undefined") {
      throw new Error("Thư viện JSZip chưa sẵn sàng.");
    }

    const zip = new JSZip();
    const sanitizedTitle = this.sanitizeFilename(quiz.title);

    // 1. Generate Question File Content (Unicode RTF)
    let qRtf = "{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}\n";
    qRtf += `\\f0\\fs28\\b B\\u192?I THI TR\\u7854?C NGHI\\u7878?M: ${this.escapeRtf(quiz.title)}\\b0\\fs20\\par\n`;
    qRtf += `Th\\u7901?i gian l\\u224?m b\\u224?i: 45 ph\\u250?t | T\\u7895?ng s\\u7889? c\\u226?u: ${quiz.questions.length}\\par\\par\n`;

    quiz.questions.forEach((q, idx) => {
      qRtf += `\\b C\\u226?u ${idx + 1}: ${this.escapeRtf(q.text)}\\b0\\par\n`;
      if (q.options) {
        q.options.forEach(opt => {
          qRtf += `    ${this.escapeRtf(opt.label)}. ${this.escapeRtf(opt.text)}\\par\n`;
        });
      }
      qRtf += "\\par\n";
    });
    qRtf += "}";

    // 2. Generate Answer Key File Content (Unicode RTF)
    let aRtf = "{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Arial;}}\n";
    aRtf += `\\f0\\fs28\\b \\u272?\\u193?P \\u193?N V\\u192? GI\\u7842?I TH\\u205?CH CHI TI\\u7878?T: ${this.escapeRtf(quiz.title)}\\b0\\fs20\\par\n`;
    aRtf += `T\\u7895?ng s\\u7889? c\\u226?u: ${quiz.questions.length}\\par\\par\n`;

    quiz.questions.forEach((q, idx) => {
      const correctOpt = q.options ? (q.options[q.correctAnswerIndex] || q.options[0]) : null;
      const correctLabel = correctOpt ? correctOpt.label : "A";
      const correctText = correctOpt ? correctOpt.text : "";

      aRtf += `\\b C\\u226?u ${idx + 1}: ${this.escapeRtf(q.text)}\\b0\\par\n`;
      aRtf += `-> \\b \\u272?\\u225?p \\u225?n \\u273?\\u250?ng: ${this.escapeRtf(correctLabel)}\\b0  (${this.escapeRtf(correctText)})\\par\n`;
      if (q.explanation && q.explanation.trim()) {
        aRtf += `   \\i Gi\\u7843?i th\\u237?ch: ${this.escapeRtf(q.explanation)}\\i0\\par\n`;
      }
      aRtf += "\\par\n";
    });
    aRtf += "}";

    // 3. Generate JSON Bundle
    const jsonBundle = JSON.stringify(quiz.questions, null, 2);

    zip.file(`${sanitizedTitle}_Questions.rtf`, qRtf);
    zip.file(`${sanitizedTitle}_AnswerKey.rtf`, aRtf);
    zip.file("quiz_bundle.json", jsonBundle);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const fileName = `${sanitizedTitle}_QuizBundle.zip`;
    this.downloadBlob(zipBlob, fileName);
    return fileName;
  }

  async exportQuizToWordDocxZip(quiz) {
    if (typeof JSZip === "undefined") {
      throw new Error("Thư viện JSZip chưa sẵn sàng.");
    }

    const zip = new JSZip();
    const sanitizedTitle = this.sanitizeFilename(quiz.title);

    // Build Word document XML for Questions
    let qBodyXml = `<w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>BÀI THI TRẮC NGHIỆM: ${this.escapeXml(quiz.title)}</w:t></w:r></w:p>`;
    qBodyXml += `<w:p><w:r><w:t>Thời gian làm bài: 45 phút | Tổng số câu: ${quiz.questions.length}</w:t></w:r></w:p><w:p/>`;

    quiz.questions.forEach((q, idx) => {
      qBodyXml += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu ${idx + 1}: ${this.escapeXml(q.text)}</w:t></w:r></w:p>`;
      if (q.options) {
        q.options.forEach(opt => {
          qBodyXml += `<w:p><w:r><w:t>    ${this.escapeXml(opt.label)}. ${this.escapeXml(opt.text)}</w:t></w:r></w:p>`;
        });
      }
      qBodyXml += "<w:p/>";
    });

    // Build Word document XML for Answer Key
    let aBodyXml = `<w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>ĐÁP ÁN VÀ GIẢI THÍCH CHI TIẾT: ${this.escapeXml(quiz.title)}</w:t></w:r></w:p>`;
    aBodyXml += `<w:p><w:r><w:t>Tổng số câu: ${quiz.questions.length}</w:t></w:r></w:p><w:p/>`;

    quiz.questions.forEach((q, idx) => {
      const correctOpt = q.options ? (q.options[q.correctAnswerIndex] || q.options[0]) : null;
      const correctLabel = correctOpt ? correctOpt.label : "A";
      const correctText = correctOpt ? correctOpt.text : "";

      aBodyXml += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu ${idx + 1}: ${this.escapeXml(q.text)}</w:t></w:r></w:p>`;
      aBodyXml += `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>-> Đáp án đúng: ${this.escapeXml(correctLabel)} (${this.escapeXml(correctText)})</w:t></w:r></w:p>`;
      if (q.explanation && q.explanation.trim()) {
        aBodyXml += `<w:p><w:r><w:rPr><w:i/></w:rPr><w:t>   Giải thích: ${this.escapeXml(q.explanation)}</w:t></w:r></w:p>`;
      }
      aBodyXml += "<w:p/>";
    });

    const qDocxBlob = await this.createDocxBlob(qBodyXml);
    const aDocxBlob = await this.createDocxBlob(aBodyXml);

    zip.file(`${sanitizedTitle}_Questions.docx`, qDocxBlob);
    zip.file(`${sanitizedTitle}_AnswerKey.docx`, aDocxBlob);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const fileName = `${sanitizedTitle}_WordDocxBundle.zip`;
    this.downloadBlob(zipBlob, fileName);
    return fileName;
  }

  async createDocxBlob(bodyXml) {
    const zip = new JSZip();

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        ${bodyXml}
    </w:body>
</w:document>`;

    zip.file("[Content_Types].xml", contentTypesXml);
    zip.folder("_rels").file(".rels", relsXml);
    zip.folder("word").file("document.xml", docXml);

    return await zip.generateAsync({ type: "blob" });
  }

  exportQuizJSON(quiz) {
    const jsonStr = JSON.stringify(quiz, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const filename = `${this.sanitizeFilename(quiz.title)}.json`;
    this.downloadBlob(blob, filename);
    return filename;
  }

  escapeXml(unsafe) {
    return (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  escapeRtf(text) {
    let result = "";
    const str = text || "";
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code > 127) {
        result += `\\u${code}?`;
      } else if (str[i] === "\\") {
        result += "\\\\";
      } else if (str[i] === "{") {
        result += "\\{";
      } else if (str[i] === "}") {
        result += "\\}";
      } else if (str[i] === "\n") {
        result += "\\par\n";
      } else {
        result += str[i];
      }
    }
    return result;
  }
}

export const exporter = new ExporterService();
