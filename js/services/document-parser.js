/**
 * QuizMaster Web - Client-Side Document Processor
 * Parses PDF, DOCX, TXT, and ZIP Bundles 100% in the browser.
 */
import { createQuiz, createQuestion, createQuestionOption } from "../models/types.js";

class DocumentParserService {
  constructor() {
    this.currentExtractedImages = {};
  }

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

    // 1. Extract Image and OLE Relationships from word/_rels/document.xml.rels
    this.currentExtractedImages = {};
    const imageMap = {};
    const oleMap = {};
    let imgCounter = 0;
    const relsFile = loadedZip.file("word/_rels/document.xml.rels");
    
    if (relsFile) {
      try {
        const relsXml = await relsFile.async("string");
        const parser = new DOMParser();
        const relsDoc = parser.parseFromString(relsXml, "application/xml");
        const relNodes = relsDoc.getElementsByTagName("Relationship");

        for (let i = 0; i < relNodes.length; i++) {
          const rId = relNodes[i].getAttribute("Id");
          const target = relNodes[i].getAttribute("Target");
          const type = relNodes[i].getAttribute("Type") || "";

          if (!rId || !target) continue;

          let mediaPath = target;
          if (!mediaPath.startsWith("word/")) {
            mediaPath = "word/" + mediaPath.replace(/^\//, "");
          }

          // A. MathType OLE Equation Objects (.bin)
          if (target.includes("oleObject") || target.endsWith(".bin") || type.includes("oleObject")) {
            const oleFile = loadedZip.file(mediaPath);
            if (oleFile) {
              try {
                const oleBytes = await oleFile.async("uint8array");
                const eqStream = this.extractOleNativeStream(oleBytes);
                if (eqStream) {
                  const mtefBytes = eqStream.subarray(28);
                  const latex = this.parseMTEFToLatex(mtefBytes);
                  if (latex && latex.trim()) {
                    oleMap[rId] = latex.trim();
                  }
                }
              } catch (oleErr) {
                console.warn("Failed to parse OLE MathType object:", rId, oleErr);
              }
            }
          }
          // B. Real Image Files (PNG, JPG, JPEG, GIF, WEBP, BMP, SVG)
          // Exclude EMF/WMF/DML — browsers cannot render Windows Metafiles
          else if (
            target.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/i) ||
            (type.includes("/image") && !target.match(/\.(emf|wmf|dml)$/i))
          ) {
            const imgFile = loadedZip.file(mediaPath);
            if (imgFile) {
              const base64 = await imgFile.async("base64");
              const ext = mediaPath.split(".").pop().toLowerCase();
              let mime = "image/jpeg";
              if (ext === "png") mime = "image/png";
              else if (ext === "gif") mime = "image/gif";
              else if (ext === "webp") mime = "image/webp";
              else if (ext === "svg") mime = "image/svg+xml";
              const dataUri = `data:${mime};base64,${base64}`;
              imgCounter++;
              const token = `[IMG_${imgCounter}]`;
              imageMap[rId] = token;
              this.currentExtractedImages[token] = dataUri;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to parse DOCX relationships:", err);
      }
    }

    const xmlText = await documentXmlFile.async("string");
    let parsedText = this.parseDocxXmlText(xmlText, imageMap, oleMap);
    parsedText = await this.applyDocxCrops(parsedText);
    return parsedText;
  }

  async applyDocxCrops(text) {
    const cropRegex = /\[IMG_(\d+)\]_CROP_(\d+)_(\d+)_(\d+)_(\d+)/g;
    let match;
    const promises = [];
    const replacements = [];

    while ((match = cropRegex.exec(text)) !== null) {
      const fullToken = match[0];
      const baseToken = `[IMG_${match[1]}]`;
      const l = parseInt(match[2], 10) / 100000;
      const t = parseInt(match[3], 10) / 100000;
      const r = parseInt(match[4], 10) / 100000;
      const b = parseInt(match[5], 10) / 100000;

      const base64 = this.currentExtractedImages[baseToken];
      if (base64) {
        promises.push(new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            const cropX = img.width * l;
            const cropY = img.height * t;
            const cropW = img.width * (1 - l - r);
            const cropH = img.height * (1 - t - b);
            
            if (cropW <= 0 || cropH <= 0) {
              resolve({ token: fullToken, replacement: baseToken });
              return;
            }

            canvas.width = cropW;
            canvas.height = cropH;
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            
            // Overwrite the original image with the cropped version
            this.currentExtractedImages[baseToken] = canvas.toDataURL("image/jpeg", 0.9);
            resolve({ token: fullToken, replacement: baseToken });
          };
          img.onerror = () => resolve({ token: fullToken, replacement: baseToken });
          img.src = base64;
        }));
      } else {
        replacements.push({ token: fullToken, replacement: baseToken });
      }
    }

    const results = await Promise.all(promises);
    results.forEach(r => replacements.push(r));

    let finalText = text;
    finalText = finalText.replace(/\[IMG_(\d+)\]_VMLCROP/g, "[IMG_$1]");
    
    for (const r of replacements) {
      finalText = finalText.split(r.token).join(r.replacement);
    }
    
    return finalText;
  }

  getLocalName(node) {
    if (!node) return "";
    return (node.localName || node.nodeName || node.tagName || "").replace(/^.*:/, "").toLowerCase();
  }

  parseDocxXmlText(xmlString, imageMap = {}, oleMap = {}) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    const bodyNodes = this.findMatchingNodes(xmlDoc, ["body", "w:body"]);
    const body = bodyNodes[0] || xmlDoc.documentElement;
    
    if (!body) return "";

    const lines = [];
    const children = body.childNodes;

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const tag = this.getLocalName(node);

      if (tag === "p") {
        const pText = this.parseDocxParagraph(node, imageMap, oleMap);
        if (pText.trim().length > 0) {
          lines.push(pText);
        }
      } else if (tag === "tbl") {
        const tableText = this.parseDocxTable(node, imageMap, oleMap);
        if (tableText.trim().length > 0) {
          lines.push("\n" + tableText + "\n");
        }
      }
    }

    return lines.join("\n\n");
  }

  parseDocxParagraph(pNode, imageMap = {}, oleMap = {}) {
    let result = "";
    const children = pNode.childNodes;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tag = this.getLocalName(child);

      if (tag === "r") {
        result += this.parseDocxRun(child, imageMap, oleMap);
      } else if (tag === "omath" || tag === "omathpara") {
        const latex = this.ommlToLatex(child).trim();
        if (latex) {
          result += ` $${latex}$ `;
        }
      } else if (tag === "object") {
        const oleLatex = this.extractLatexFromObjectNode(child, oleMap);
        if (oleLatex) {
          result += ` $${oleLatex}$ `;
        }
      } else if (tag === "drawing" || tag === "pict") {
        const imgMarkdown = this.extractImageMarkdownFromDrawing(child, imageMap);
        if (imgMarkdown) {
          result += `\n\n${imgMarkdown}\n\n`;
        }
      } else if (tag === "tab") {
        result += "    ";
      } else if (tag === "br" || tag === "cr") {
        result += "\n";
      }
    }

    return result.replace(/\s+/g, ' ').trim();
  }

  parseDocxRun(rNode, imageMap = {}, oleMap = {}) {
    let text = "";

    // 1. Check w:object inside run
    const objects = this.findMatchingNodes(rNode, ["object", "w:object"]);
    for (let i = 0; i < objects.length; i++) {
      const oleLatex = this.extractLatexFromObjectNode(objects[i], oleMap);
      if (oleLatex) text += ` $${oleLatex}$ `;
      else text += ` [MATH] `;
    }

    // 2. Check OLEObject directly in run (skip if w:object was handled above — OLEObject is nested inside w:object)
    let oleObjects = [];
    if (objects.length === 0) {
      oleObjects = this.findMatchingNodes(rNode, ["OLEObject", "o:OLEObject"]);
      for (let i = 0; i < oleObjects.length; i++) {
        const rId = this.getNodeAttribute(oleObjects[i], "id") || this.getNodeAttribute(oleObjects[i], "rid");
        if (rId) {
          if (oleMap[rId]) text += ` $${oleMap[rId]}$ `;
          else text += ` [MATH] `;
        }
      }
    }
    
    // 3. Check text nodes
    const tNodes = this.findMatchingNodes(rNode, ["t", "w:t"]);
    for (let i = 0; i < tNodes.length; i++) {
      text += tNodes[i].textContent || "";
    }

    // 4. Check drawings inside run (only if not an OLE equation object)
    if (objects.length === 0 && oleObjects.length === 0) {
      const drawings = this.findMatchingNodes(rNode, ["drawing", "w:drawing"]);
      for (let i = 0; i < drawings.length; i++) {
        const img = this.extractImageMarkdownFromDrawing(drawings[i], imageMap);
        if (img) text += `\n\n${img}\n\n`;
      }

      const picts = this.findMatchingNodes(rNode, ["pict", "w:pict"]);
      for (let i = 0; i < picts.length; i++) {
        const img = this.extractImageMarkdownFromDrawing(picts[i], imageMap);
        if (img) text += `\n\n${img}\n\n`;
      }
    }

    if (!text) return "";

    // 5. Check vertical alignment (superscript / subscript for physics & chemistry)
    const vertAligns = this.findMatchingNodes(rNode, ["vertAlign", "w:vertAlign"]);
    if (vertAligns.length > 0) {
      const val = this.getNodeAttribute(vertAligns[0], "val");
      if (val === "superscript") {
        return `^{${text}}`;
      } else if (val === "subscript") {
        return `_{${text}}`;
      }
    }

    return text;
  }

  getNodeAttribute(node, attrName) {
    if (!node) return null;
    if (typeof node.getAttribute === "function") {
      const val = node.getAttribute(attrName);
      if (val) return val;
      const valCol = node.getAttribute(`r:${attrName}`) || node.getAttribute(`a:${attrName}`) || node.getAttribute(`v:${attrName}`) || node.getAttribute(`o:${attrName}`);
      if (valCol) return valCol;
    }
    if (node.attributes) {
      for (let i = 0; i < node.attributes.length; i++) {
        const a = node.attributes[i];
        if (a.name === attrName || a.localName === attrName || a.name.endsWith(`:${attrName}`)) {
          return a.value;
        }
      }
    }
    return null;
  }

  findMatchingNodes(rootNode, tagNames = []) {
    const results = [];
    if (!rootNode) return results;

    const lowerTags = tagNames.map(t => t.toLowerCase().replace(/^.*:/, ""));

    const walk = (node) => {
      if (!node) return;
      const name = (node.localName || node.nodeName || node.tagName || "").replace(/^.*:/, "").toLowerCase();
      if (lowerTags.includes(name)) {
        if (!results.includes(node)) results.push(node);
      }
      const children = node.childNodes;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          walk(children[i]);
        }
      }
    };

    walk(rootNode);
    return results;
  }

  extractLatexFromObjectNode(objectNode, oleMap = {}) {
    const oleNodes = this.findMatchingNodes(objectNode, ["OLEObject", "o:OLEObject"]);
    for (const ole of oleNodes) {
      const rId = this.getNodeAttribute(ole, "id") || this.getNodeAttribute(ole, "rid");
      if (rId && oleMap[rId]) {
        return oleMap[rId];
      }
    }
    return "";
  }

  extractImageMarkdownFromDrawing(drawingNode, imageMap = {}) {
    const blips = this.findMatchingNodes(drawingNode, ["blip", "a:blip"]);
    for (const blip of blips) {
      const rId = this.getNodeAttribute(blip, "embed") || this.getNodeAttribute(blip, "link") || this.getNodeAttribute(blip, "id");
      if (rId && imageMap[rId]) {
        const token = imageMap[rId];
        const srcRects = this.findMatchingNodes(drawingNode, ["srcRect", "a:srcRect"]);
        if (srcRects.length > 0) {
          const l = parseInt(this.getNodeAttribute(srcRects[0], "l") || "0", 10);
          const t = parseInt(this.getNodeAttribute(srcRects[0], "t") || "0", 10);
          const r = parseInt(this.getNodeAttribute(srcRects[0], "r") || "0", 10);
          const b = parseInt(this.getNodeAttribute(srcRects[0], "b") || "0", 10);
          if (l || t || r || b) {
            return `${token}_CROP_${l}_${t}_${r}_${b}`;
          }
        }
        return token;
      }
    }

    const imgDatas = this.findMatchingNodes(drawingNode, ["imagedata", "v:imagedata"]);
    for (const img of imgDatas) {
      const rId = this.getNodeAttribute(img, "id") || this.getNodeAttribute(img, "href") || this.getNodeAttribute(img, "relid");
      if (rId && imageMap[rId]) {
        // v:imagedata uses cropleft, croptop, cropright, cropbottom (in points or percentages)
        const cropleft = this.getNodeAttribute(img, "cropleft");
        const croptop = this.getNodeAttribute(img, "croptop");
        const cropright = this.getNodeAttribute(img, "cropright");
        const cropbottom = this.getNodeAttribute(img, "cropbottom");
        if (cropleft || croptop || cropright || cropbottom) {
          // Simplification for VML crops: just pass raw string and we handle it later if possible
          return `${imageMap[rId]}_VMLCROP`; 
        }
        return imageMap[rId];
      }
    }

    return "";
  }

  parseDocxTable(tblNode, imageMap = {}, oleMap = {}) {
    const rows = this.findMatchingNodes(tblNode, ["tr", "w:tr"]);
    if (rows.length === 0) return "";

    const tableMatrix = [];

    for (let r = 0; r < rows.length; r++) {
      const cells = this.findMatchingNodes(rows[r], ["tc", "w:tc"]);
      const rowCells = [];

      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c];
        const paragraphs = this.findMatchingNodes(cell, ["p", "w:p"]);
        const cellTextParts = [];

        for (let p = 0; p < paragraphs.length; p++) {
          const pt = this.parseDocxParagraph(paragraphs[p], imageMap, oleMap);
          if (pt.trim()) cellTextParts.push(pt.trim());
        }

        rowCells.push(cellTextParts.join(" ").replace(/\|/g, "\\|"));
      }

      if (rowCells.length > 0) {
        tableMatrix.push(rowCells);
      }
    }

    if (tableMatrix.length === 0) return "";

    // Normalize column counts
    const maxCols = Math.max(...tableMatrix.map(r => r.length));
    const normalized = tableMatrix.map(r => {
      while (r.length < maxCols) r.push("");
      return r;
    });

    const header = normalized[0];
    const separator = Array(maxCols).fill("---");
    const bodyRows = normalized.length > 1 ? normalized.slice(1) : [];

    const lines = [
      `| ${header.join(' | ')} |`,
      `| ${separator.join(' | ')} |`,
      ...bodyRows.map(r => `| ${r.join(' | ')} |`)
    ];

    return lines.join("\n");
  }

  // ==========================================
  // OLE Compound File (CFBF) & MathType Decoder
  // ==========================================

  extractOleNativeStream(oleBytes) {
    const buf = oleBytes;
    if (!buf || buf.length < 512) return null;
    if (buf[0] !== 0xD0 || buf[1] !== 0xCF || buf[2] !== 0x11 || buf[3] !== 0xE0) return null;

    try {
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const sectorShift = view.getUint16(0x1E, true);
      const sectorSize = 1 << sectorShift;
      const miniSectorShift = view.getUint16(0x20, true);
      const miniSectorSize = 1 << miniSectorShift;
      const firstDirSector = view.getUint32(0x30, true);
      const miniCutoff = view.getUint32(0x38, true);
      const firstMiniFatSector = view.getUint32(0x3C, true);

      const fat = [];
      for (let i = 0; i < 109; i++) {
        const secNum = view.getUint32(0x4C + i * 4, true);
        if (secNum >= 0xFFFFFFFE) break;
        const offset = (secNum + 1) * sectorSize;
        for (let j = 0; j < sectorSize; j += 4) {
          fat.push(view.getUint32(offset + j, true));
        }
      }

      const getFatChain = (s) => {
        const chain = [];
        while (s < 0xFFFFFFFE && s < fat.length) {
          chain.push(s);
          s = fat[s];
        }
        return chain;
      };

      const readFatStream = (s, length) => {
        const chain = getFatChain(s);
        const result = new Uint8Array(chain.length * sectorSize);
        let pos = 0;
        for (const sec of chain) {
          const offset = (sec + 1) * sectorSize;
          result.set(buf.subarray(offset, offset + sectorSize), pos);
          pos += sectorSize;
        }
        return result.subarray(0, length);
      };

      const dirChain = getFatChain(firstDirSector);
      const dirBuf = new Uint8Array(dirChain.length * sectorSize);
      let dirPos = 0;
      for (const sec of dirChain) {
        const offset = (sec + 1) * sectorSize;
        dirBuf.set(buf.subarray(offset, offset + sectorSize), dirPos);
        dirPos += sectorSize;
      }
      const dirView = new DataView(dirBuf.buffer, dirBuf.byteOffset, dirBuf.byteLength);

      const rootStartSector = dirView.getUint32(0x74, true);
      const rootStreamLen = dirView.getUint32(0x78, true);
      const miniStreamData = readFatStream(rootStartSector, rootStreamLen);

      const minifat = [];
      for (const sec of getFatChain(firstMiniFatSector)) {
        const offset = (sec + 1) * sectorSize;
        for (let j = 0; j < sectorSize; j += 4) {
          minifat.push(view.getUint32(offset + j, true));
        }
      }

      const getMiniFatChain = (s) => {
        const chain = [];
        while (s < 0xFFFFFFFE && s < minifat.length) {
          chain.push(s);
          s = minifat[s];
        }
        return chain;
      };

      const readMiniStream = (s, length) => {
        const chain = getMiniFatChain(s);
        const result = new Uint8Array(chain.length * miniSectorSize);
        let pos = 0;
        for (const sec of chain) {
          const offset = sec * miniSectorSize;
          result.set(miniStreamData.subarray(offset, offset + miniSectorSize), pos);
          pos += miniSectorSize;
        }
        return result.subarray(0, length);
      };

      for (let i = 0; i < dirBuf.length; i += 128) {
        const nameLen = dirView.getUint16(i + 0x40, true);
        if (nameLen === 0) continue;
        let name = "";
        for (let c = 0; c < nameLen - 2; c += 2) {
          name += String.fromCharCode(dirView.getUint16(i + c, true));
        }
        const entryType = dirBuf[i + 0x42];
        const startSector = dirView.getUint32(i + 0x74, true);
        const streamLen = dirView.getUint32(i + 0x78, true);

        if (entryType === 2 && name.includes("Equation")) {
          if (streamLen < miniCutoff) {
            return readMiniStream(startSector, streamLen);
          } else {
          return readFatStream(startSector, streamLen);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to extract OLE CFBF stream:", err);
    }
    return null;
  }

  parseMTEFToLatex(uint8Array) {
    if (!uint8Array || uint8Array.length === 0) return "";
    let pos = 0;

    for (let i = 0; i < uint8Array.length - 3; i++) {
      if (uint8Array[i] === 0x0A && uint8Array[i + 1] === 0x01 && uint8Array[i + 2] === 0x00) {
        pos = i + 3;
        break;
      }
    }

    while (pos < uint8Array.length && (uint8Array[pos] === 0x10 || uint8Array[pos] === 0x00)) {
      pos++;
    }

    const readByte = () => (pos < uint8Array.length ? uint8Array[pos++] : 0);
    const readUint16 = () => {
      const b1 = readByte();
      const b2 = readByte();
      return b1 | (b2 << 8);
    };
    const peekByte = () => (pos < uint8Array.length ? uint8Array[pos] : 0);

    const parseContainer = (depth = 0) => {
      const tokens = [];
      while (pos < uint8Array.length) {
        const tag = uint8Array[pos++];
        if (tag === 0) { // END
          if (depth > 0) break;
        } else if (tag === 1 || tag === 15) { // LINE or FULL
          readByte(); // line options
          const lineContent = parseContainer(depth + 1);
          if (lineContent) tokens.push(lineContent);
        } else if (tag === 2) { // CHAR
          const opt = readByte(); // char options
          const chCode = readByte();
          let ch = "";
          if (chCode === 131 || chCode === 136 || chCode === 150 || chCode === 130 || chCode === 129) {
            const cVal = readByte();
            ch = String.fromCharCode(cVal);
            if (peekByte() === 0) readByte();
          } else if (chCode === 134) {
            readByte(); readByte();
            const cVal = readByte();
            if (cVal === 43) ch = " + ";
            else if (cVal === 61) ch = " = ";
            else if (cVal === 45) ch = " - ";
            else if (cVal === 42) ch = " \\cdot ";
            else if (cVal === 47) ch = "/";
            else if (cVal === 60) ch = " < ";
            else if (cVal === 62) ch = " > ";
            else if (cVal === 58) ch = ": ";
            else if (cVal === 59) ch = "; ";
            else if (cVal === 44) ch = ", ";
            else ch = String.fromCharCode(cVal);
          } else if (chCode >= 32 && chCode < 128) {
            ch = String.fromCharCode(chCode);
          } else {
            const next = readByte();
            if (chCode === 0x86 && next === 0xc5) {
              readByte(); readByte();
              ch = ".";
            } else if (chCode === 0x86 && next === 0x2b) {
              readByte(); readByte(); ch = " + ";
            } else if (chCode === 0x86 && next === 0x3d) {
              readByte(); readByte(); ch = " = ";
            } else if (chCode === 0x86 && next === 0x2d) {
              readByte(); readByte(); ch = " - ";
            } else if (chCode === 0x96 && next === 0xd7) {
              readByte(); readByte(); ch = "'";
            }
          }
          if (ch) tokens.push(ch);
        } else if (tag === 3) { // TMPL
          const sel = readByte();
          const variation = readUint16();
          const opt = readByte();
          
          if (sel === 0) { // FENCE / PARENS / INTERVALS
            const inner = parseContainer(depth + 1);
            if (variation === 1 || variation === 0) tokens.push(`(${inner})`);
            else if (variation === 2) tokens.push(`[${inner}]`);
            else if (variation === 3) tokens.push(`\\{${inner}\\}`);
            else if (variation === 9 || variation === 0x09) tokens.push(`[${inner})`);
            else if (variation === 0x0a || variation === 10) tokens.push(`(${inner}]`);
            else tokens.push(`(${inner})`);
          } else if (sel === 1 || sel === 11) { // FRACTION
            const num = parseContainer(depth + 1);
            const den = parseContainer(depth + 1);
            tokens.push(`\\frac{${num}}{${den}}`);
          } else if (sel === 2 || sel === 3) { // RADICAL
            if (variation === 1) {
              const root = parseContainer(depth + 1);
              const inner = parseContainer(depth + 1);
              tokens.push(`\\sqrt[${root}]{${inner}}`);
            } else {
              const inner = parseContainer(depth + 1);
              tokens.push(`\\sqrt{${inner}}`);
            }
          } else if (sel === 3) { // SUB / SUPER
            const sub = parseContainer(depth + 1);
            const sup = parseContainer(depth + 1);
            if (sub && sup) tokens.push(`_{${sub}}^{${sup}}`);
            else if (sub) tokens.push(`_{${sub}}`);
            else if (sup) tokens.push(`^{${sup}}`);
          } else if (sel === 4 || sel === 12) { // INTEGRAL
            const sub = parseContainer(depth + 1);
            const sup = parseContainer(depth + 1);
            tokens.push(`\\int_{${sub}}^{${sup}}`);
          } else if (sel === 7 || sel === 31) { // VECTOR
            const inner = parseContainer(depth + 1);
            tokens.push(`\\vec{${inner}}`);
          } else {
            const inner = parseContainer(depth + 1);
            tokens.push(inner);
          }
        } else if (tag === 6) { // EMBELL
          const embType = readByte();
          const embVal = readByte();
          if (embVal === 5 || embVal === 6 || embType === 5 || embType === 6) { // Vector arrow
            if (tokens.length > 0) {
              const allTokens = tokens.join("");
              tokens.length = 0;
              tokens.push(`\\vec{${allTokens}}`);
            }
          } else if (embVal === 1 || embType === 1) { // Prime
            tokens.push("'");
          } else if (embVal === 2 || embType === 2) { // Double prime
            tokens.push("''");
          } else if (embVal === 3 || embType === 3) { // Triple prime
            tokens.push("'''");
          } else if (embVal === 4 || embType === 4) { // Dot
            if (tokens.length > 0) {
              const last = tokens.pop();
              tokens.push(`\\dot{${last}}`);
            }
          }
        } else if (tag === 7) { // SUB
          const sub = parseContainer(depth + 1);
          if (tokens.length > 0) {
            const last = tokens.pop();
            tokens.push(`${last}_{${sub}}`);
          } else {
            tokens.push(`_{${sub}}`);
          }
        } else if (tag === 8) { // SUP
          const sup = parseContainer(depth + 1);
          if (tokens.length > 0) {
            const last = tokens.pop();
            tokens.push(`${last}^{${sup}}`);
          } else {
            tokens.push(`^{${sup}}`);
          }
        } else if (tag === 9) { // SUBSUP
          const sub = parseContainer(depth + 1);
          const sup = parseContainer(depth + 1);
          if (tokens.length > 0) {
            const last = tokens.pop();
            tokens.push(`${last}_{${sub}}^{${sup}}`);
          } else {
            tokens.push(`_{${sub}}^{${sup}}`);
          }
        } else if (tag === 4) { // PILE
          readByte(); readByte();
          tokens.push(parseContainer(depth + 1));
        } else if (tag === 5) { // MATRIX
          readByte(); readByte(); readByte();
          tokens.push(parseContainer(depth + 1));
        }
      }
      return tokens.join("").trim();
    };

    return parseContainer(0);
  }

  ommlToLatex(node) {
    if (!node) return "";
    const name = node.nodeName || node.tagName || "";

    if (name.endsWith(":t") || name === "t") {
      return node.textContent || "";
    }

    if (name.endsWith(":f") || name === "f") { // Fraction
      const numNode = this.findOmmlChild(node, "num");
      const denNode = this.findOmmlChild(node, "den");
      const num = numNode ? this.ommlChildrenToLatex(numNode) : "";
      const den = denNode ? this.ommlChildrenToLatex(denNode) : "";
      return `\\frac{${num}}{${den}}`;
    }

    if (name.endsWith(":sSup") || name === "sSup") { // Superscript
      const eNode = this.findOmmlChild(node, "e");
      const supNode = this.findOmmlChild(node, "sup");
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      const sup = supNode ? this.ommlChildrenToLatex(supNode) : "";
      return `{${e}}^{${sup}}`;
    }

    if (name.endsWith(":sSub") || name === "sSub") { // Subscript
      const eNode = this.findOmmlChild(node, "e");
      const subNode = this.findOmmlChild(node, "sub");
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      const sub = subNode ? this.ommlChildrenToLatex(subNode) : "";
      return `{${e}}_{${sub}}`;
    }

    if (name.endsWith(":sSubSup") || name === "sSubSup") { // Sub-Superscript
      const eNode = this.findOmmlChild(node, "e");
      const subNode = this.findOmmlChild(node, "sub");
      const supNode = this.findOmmlChild(node, "sup");
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      const sub = subNode ? this.ommlChildrenToLatex(subNode) : "";
      const sup = supNode ? this.ommlChildrenToLatex(supNode) : "";
      return `{${e}}_{${sub}}^{${sup}}`;
    }

    if (name.endsWith(":sPre") || name === "sPre") { // Pre-Sub-Superscript (Physics Nuclear notation)
      const eNode = this.findOmmlChild(node, "e");
      const subNode = this.findOmmlChild(node, "sub");
      const supNode = this.findOmmlChild(node, "sup");
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      const sub = subNode ? this.ommlChildrenToLatex(subNode) : "";
      const sup = supNode ? this.ommlChildrenToLatex(supNode) : "";
      return `_{${sub}}^{${sup}}{${e}}`;
    }

    if (name.endsWith(":rad") || name === "rad") { // Radical / Root
      const degNode = this.findOmmlChild(node, "deg");
      const eNode = this.findOmmlChild(node, "e");
      const deg = degNode ? this.ommlChildrenToLatex(degNode).trim() : "";
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      return deg ? `\\sqrt[${deg}]{${e}}` : `\\sqrt{${e}}`;
    }

    if (name.endsWith(":d") || name === "d") { // Delimiters ()
      const eNode = this.findOmmlChild(node, "e");
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      return `(${e})`;
    }

    if (name.endsWith(":nary") || name === "nary") { // Integrals / Sums
      const subNode = this.findOmmlChild(node, "sub");
      const supNode = this.findOmmlChild(node, "sup");
      const eNode = this.findOmmlChild(node, "e");
      const sub = subNode ? this.ommlChildrenToLatex(subNode) : "";
      const sup = supNode ? this.ommlChildrenToLatex(supNode) : "";
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      return `\\int_{${sub}}^{${sup}}{${e}}`;
    }

    if (name.endsWith(":acc") || name === "acc") { // Vector / Accent
      const eNode = this.findOmmlChild(node, "e");
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      return `\\vec{${e}}`;
    }

    if (name.endsWith(":bar") || name === "bar") { // Overbar
      const eNode = this.findOmmlChild(node, "e");
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      return `\\overline{${e}}`;
    }

    if (name.endsWith(":func") || name === "func") { // Function
      const fNode = this.findOmmlChild(node, "fName");
      const eNode = this.findOmmlChild(node, "e");
      const f = fNode ? this.ommlChildrenToLatex(fNode) : "";
      const e = eNode ? this.ommlChildrenToLatex(eNode) : "";
      return `${f}(${e})`;
    }

    let res = "";
    if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        res += this.ommlToLatex(node.childNodes[i]);
      }
    }
    return res;
  }

  findOmmlChild(parent, localName) {
    if (!parent || !parent.childNodes) return null;
    for (let i = 0; i < parent.childNodes.length; i++) {
      const c = parent.childNodes[i];
      const n = c.nodeName || c.tagName || "";
      if (n.endsWith(":" + localName) || n === localName) return c;
    }
    return null;
  }

  ommlChildrenToLatex(node) {
    let res = "";
    if (!node || !node.childNodes) return "";
    for (let i = 0; i < node.childNodes.length; i++) {
      res += this.ommlToLatex(node.childNodes[i]);
    }
    return res.trim();
  }

  async extractPdfAsImages(file, scale = 2.0) {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("Thư viện PDF.js chưa được tải.");
    }
    // Don't reset currentExtractedImages here — DOCX images should persist if already extracted.
    // PDF page images are only used as Gemini Vision inlineData, not for per-question embedding.
    const data = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    const pdf = await loadingTask.promise;
    const images = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: scale });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.85));
    }
    
    return images;
  }

  async extractTextFromPDF(file) {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("Thư viện PDF.js chưa sẵn sàng để đọc tệp PDF.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width || 595;
      const textContent = await page.getTextContent();
      const items = textContent.items || [];
      if (items.length === 0) continue;

      // Check if page has 2 distinct columns (typical exam layout)
      const mid = pageWidth / 2;
      const leftItems = items.filter(i => (i.transform?.[4] || 0) < mid);
      const rightItems = items.filter(i => (i.transform?.[4] || 0) >= mid);
      const isTwoCol = leftItems.length > 8 && rightItems.length > 8 && (leftItems.length / items.length > 0.25) && (rightItems.length / items.length > 0.25);

      const groupLines = (colItems) => {
        const linesByY = [];
        for (const item of colItems) {
          const str = item.str;
          if (!str || !str.trim()) continue;
          const tx = item.transform ? item.transform[4] : 0;
          const ty = item.transform ? Math.round(item.transform[5] / 3) * 3 : 0;
          const tw = item.width || 0;

          let line = linesByY.find(l => Math.abs(l.y - ty) <= 3);
          if (!line) {
            line = { y: ty, items: [] };
            linesByY.push(line);
          }
          line.items.push({ x: tx, width: tw, str });
        }

        // Sort lines top to bottom (descending Y in PDF viewport)
        linesByY.sort((a, b) => b.y - a.y);

        const pageLines = [];
        for (const line of linesByY) {
          // Sort items in line left to right (ascending X)
          line.items.sort((a, b) => a.x - b.x);

          let lineStr = "";
          let lastEnd = null;

          for (const it of line.items) {
            const s = it.str;
            if (!s) continue;
            const curX = it.x;
            const curW = it.width || 0;

            if (lastEnd !== null) {
              const gap = curX - lastEnd;
              // In PDF fonts, inter-word space is typically >= 2.0px. Smaller gaps mean same-word character/diacritic glyphs.
              if (gap > 2.0 && !lineStr.endsWith(" ") && !s.startsWith(" ")) {
                lineStr += " ";
              }
            }
            lineStr += s;
            lastEnd = curX + curW;
          }

          const cleanLine = this.fixVietnameseSpacedText(lineStr.replace(/\s+/g, " ").trim());
          if (cleanLine) pageLines.push(cleanLine);
        }
        return pageLines;
      };

      // Extract images embedded on this page
      const pageImages = await this.extractImagesFromPdfPage(page);
      let pageImageText = "";
      if (pageImages && pageImages.length > 0) {
        pageImageText = "\n\n" + pageImages.join("\n\n") + "\n\n";
      }

      if (isTwoCol) {
        const leftLines = groupLines(leftItems);
        const rightLines = groupLines(rightItems);
        fullText += [...leftLines, ...rightLines].join("\n") + pageImageText + "\n\n";
      } else {
        fullText += groupLines(items).join("\n") + pageImageText + "\n\n";
      }
    }

    return this.fixVietnameseSpacedText(fullText.trim());
  }

  async extractImagesFromPdfPage(page) {
    const tokens = [];
    try {
      const ops = await page.getOperatorList();
      if (!ops || !ops.fnArray) return tokens;

      for (let j = 0; j < ops.fnArray.length; j++) {
        const fn = ops.fnArray[j];
        if (typeof pdfjsLib !== "undefined" && (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject)) {
          const imgName = ops.argsArray[j][0];
          const imgObj = await new Promise((resolve) => {
            page.objs.get(imgName, (img) => resolve(img));
          });

          if (imgObj && imgObj.data && imgObj.width > 25 && imgObj.height > 25) {
            const canvas = document.createElement("canvas");
            canvas.width = imgObj.width;
            canvas.height = imgObj.height;
            const ctx = canvas.getContext("2d");
            const imgData = ctx.createImageData(imgObj.width, imgObj.height);

            if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
              imgData.data.set(imgObj.data);
            } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
              let s = 0, d = 0;
              while (s < imgObj.data.length) {
                imgData.data[d++] = imgObj.data[s++];
                imgData.data[d++] = imgObj.data[s++];
                imgData.data[d++] = imgObj.data[s++];
                imgData.data[d++] = 255;
              }
            } else if (imgObj.data.length === imgObj.width * imgObj.height) {
              let s = 0, d = 0;
              while (s < imgObj.data.length) {
                const val = imgObj.data[s++];
                imgData.data[d++] = val;
                imgData.data[d++] = val;
                imgData.data[d++] = val;
                imgData.data[d++] = 255;
              }
            }
            ctx.putImageData(imgData, 0, 0);
            const dataUri = canvas.toDataURL("image/png");

            const count = Object.keys(this.currentExtractedImages).length + 1;
            const token = `[IMG_${count}]`;
            this.currentExtractedImages[token] = dataUri;
            tokens.push(token);
          }
        }
      }
    } catch (e) {
      console.warn("Could not extract image from PDF page:", e);
    }
    return tokens;
  }

  fixVietnameseSpacedText(text) {
    if (!text) return "";
    let res = text;
    // Multi-pass character merging for broken syllable fragments from PDF glyph subsets
    // e.g. "Luy ệ n" -> "Luyện", "t ừ" -> "từ", "gi ả m" -> "giảm", "lư ợ ng" -> "lượng"
    for (let pass = 0; pass < 2; pass++) {
      res = res.replace(/(?<=\b[a-zA-ZđĐ]{1,4})\s+([àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])/g, "$1");
      res = res.replace(/([àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])\s+(?=[a-zA-ZđĐ]{1,3}\b)/g, "$1");
    }
    // Fix formulas like "CO 2" -> "CO2", "H 2 O" -> "H2O"
    res = res.replace(/\b([A-Z][a-z]?)\s+(\d+)\b/g, "$1$2");
    return res;
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
