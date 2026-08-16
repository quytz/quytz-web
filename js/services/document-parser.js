/**
 * QuizMaster Web - Client-Side Document Processor
 * Parses PDF, DOCX, TXT, and ZIP Bundles 100% in the browser.
 */
import { createQuiz, createQuestion, createQuestionOption } from "../models/types.js";

class DocumentParserService {
  async extractTextFromFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "txt" || ext === "md" || ext === "csv" || ext === "rtf") {
      return await file.text();
    }

    if (ext === "json") {
      return await file.text();
    }

    if (ext === "docx") {
      return await this.extractTextFromDocx(file);
    }

    if (ext === "pdf") {
      return await this.extractTextFromPDF(file);
    }

    if (ext === "zip") {
      return await this.extractTextFromZip(file);
    }

    // Default fallback
    return await file.text();
  }

  async extractQuizFromFile(file) {
    const title = file.name.replace(/\.[^/.]+$/, "");
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "zip") {
      const questions = await this.extractQuizFromZip(file);
      if (questions && questions.length > 0) {
        return createQuiz({
          title,
          questions,
          isPreMade: true
        });
      }
    } else if (ext === "json") {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return createQuiz({
          title,
          questions: parsed,
          isPreMade: true
        });
      } else if (parsed && parsed.questions) {
        return createQuiz({
          ...parsed,
          title: parsed.title || title
        });
      }
    }

    throw new Error("Không thể đọc bộ đề thi từ tệp này. Vui lòng chọn tệp Zip Bundle (.zip) hoặc JSON được xuất từ QuizMaster.");
  }

  async extractTextFromDocx(file) {
    if (typeof JSZip === "undefined") {
      throw new Error("Thư viện JSZip chưa sẵn sàng để giải nén tệp .docx.");
    }

    const zip = new JSZip();
    const arrayBuffer = await file.arrayBuffer();
    const loadedZip = await zip.loadAsync(arrayBuffer);
    const documentXmlFile = loadedZip.file("word/document.xml");

    if (!documentXmlFile) {
      throw new Error("Tệp .docx không hợp lệ (thiếu word/document.xml).");
    }

    const xmlText = await documentXmlFile.async("string");
    return this.parseDocxXmlText(xmlText);
  }

  parseDocxXmlText(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    
    // Find all paragraph elements
    const paragraphs = xmlDoc.getElementsByTagName("w:p");
    const resultLines = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      let lineText = "";
      
      // Look for text nodes and tabs
      const childNodes = p.getElementsByTagName("*");
      for (let j = 0; j < childNodes.length; j++) {
        const node = childNodes[j];
        if (node.nodeName === "w:t") {
          lineText += node.textContent || "";
        } else if (node.nodeName === "w:tab") {
          lineText += "    ";
        } else if (node.nodeName === "w:br" || node.nodeName === "w:cr") {
          lineText += "\n";
        }
      }
      
      if (lineText.trim().length > 0) {
        resultLines.push(lineText);
      }
    }

    return resultLines.join("\n");
  }

  async extractTextFromPDF(file) {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("Thư viện PDF.js chưa sẵn sàng để đọc tệp PDF.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText.trim();
  }

  async extractQuizFromZip(file) {
    if (typeof JSZip === "undefined") {
      throw new Error("Thư viện JSZip chưa sẵn sàng.");
    }

    const zip = new JSZip();
    const arrayBuffer = await file.arrayBuffer();
    const loadedZip = await zip.loadAsync(arrayBuffer);
    
    // Check quiz_bundle.json
    const jsonFile = loadedZip.file("quiz_bundle.json");
    if (jsonFile) {
      const jsonStr = await jsonFile.async("string");
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  async extractTextFromZip(file) {
    const questions = await this.extractQuizFromZip(file);
    if (questions) {
      return JSON.stringify(questions, null, 2);
    }
    return "";
  }
}

export const documentParser = new DocumentParserService();
