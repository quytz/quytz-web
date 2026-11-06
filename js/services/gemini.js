/**
 * QuizMaster Web - Google Gemini AI Client Service
 * 100% Client-Side API Integration (Direct to Google AI Studio)
 * Exclusively uses Gemini 3.5 Flash Lite
 */
import { APP_CONFIG } from "../config.js";
import { createQuestion, createQuestionOption, createSubItem, createVocabularyCard, THPT_SUBJECTS } from "../models/types.js";
import { documentParser } from "./document-parser.js";
import { storage } from "./storage.js";

function restoreImageTokens(text) {
  if (!text) return "";
  const map = documentParser.currentExtractedImages || {};
  // Broad regex: catches [IMG_1], [IMG_2], [HINH_ANH_1], [HINHANH_1], [HINH_1], [IMAGE_1] etc.
  return text.replace(/\[(?:IMG|HINH(?:_?ANH)?|IMAGE)\s*[_-]?\s*(\d+)\s*\]/gi, (match, num) => {
    // Try canonical form first
    const canonical = `[IMG_${num}]`;
    if (map[canonical]) {
      return `\n\n![Hình ảnh minh họa](${map[canonical]})\n\n`;
    }
    // Legacy HINH_ANH form
    const legacy = `[HINH_ANH_${num}]`;
    if (map[legacy]) {
      return `\n\n![Hình ảnh minh họa](${map[legacy]})\n\n`;
    }
    return match;
  });
}

function cleanRawVocabText(text) {
  if (!text) return "";
  let clean = text.trim();
  if (clean.includes("{\\rtf") || clean.startsWith("{\\")) {
    clean = clean.replace(/\{\\\*[\s\S]*?\}/g, "");
    clean = clean.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info)[\s\S]*?\}/gi, "");
    clean = clean.replace(/\\(?:par|line)\b/gi, "\n");
    clean = clean.replace(/\\([\{\}\\])/g, "$1");
    clean = clean.replace(/\\\w+\d*\s?/g, " ");
    clean = clean.replace(/[{}]/g, " ");
  }
  return clean.trim();
}

function extractVocabListItems(rawText) {
  const text = cleanRawVocabText(rawText);
  if (!text || !text.trim()) return [];

  const bulletOrNumberedRegex = /^[\s*\-•\d]+[\.\)\:\s\-]\s*/;
  const posPattern = /\s*\(((?:adj|adv|noun|n|verb|v|phr\s*v|phrase|prep|idiom|collocation|a|vt|vi|pron|conj|int|exp))\)\s*/gi;

  // Case 1: Continuous single-line or inline text with parenthetical POS tags (e.g. "amazing (adj) army-like (adj) ...")
  if (!text.includes("\n") && !text.includes(";") && posPattern.test(text)) {
    const items = [];
    const pattern = /([^\(\)]+?)\s*\(((?:adj|adv|noun|n|verb|v|phr\s*v|phrase|prep|idiom|collocation|a|vt|vi|pron|conj|int|exp))\)/gi;
    let match;
    let lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      let rawChunk = match[1].trim();
      const pos = match[2].trim().toLowerCase();
      
      const words = rawChunk.split(/\s+/).filter(Boolean);
      if (words.length > 2) {
        const mainWord = words[words.length - 1];
        const precedingPhrase = words.slice(0, -1).join(" ");
        items.push({ word: precedingPhrase, meaning: "", wordType: "" });
        items.push({ word: mainWord, meaning: "", wordType: pos });
      } else if (words.length === 2 && (pos === "adj" || pos === "v")) {
        const isCompound = /^(coral|ice|sea|rain|solar|climate|global|public|long|short|well|ill)\b/i.test(rawChunk);
        if (isCompound) {
          items.push({ word: rawChunk, meaning: "", wordType: pos });
        } else {
          items.push({ word: words[0], meaning: "", wordType: "" });
          items.push({ word: words[1], meaning: "", wordType: pos });
        }
      } else {
        items.push({ word: rawChunk, meaning: "", wordType: pos });
      }
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim();
      if (remaining) {
        items.push({ word: remaining, meaning: "", wordType: "" });
      }
    }
    if (items.length > 0) return items;
  }

  const lines = text.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);
  const words = [];

  for (const line of lines) {
    const cleanedLine = line.replace(bulletOrNumberedRegex, "").trim();
    if (!cleanedLine) continue;

    const defMatch = cleanedLine.match(/^([a-zA-Z\s\-\'\/\(\)]+?)(?:\s*[:\-\–\—\=\>\→]\s*|\s*\[.*?\]\s*)(.+)$/);
    if (defMatch && !/^(từ|word|vocabulary|nghĩa|meaning)$/i.test(defMatch[1].trim())) {
      const term = defMatch[1].trim();
      if (term) {
        words.push({ word: term, meaning: defMatch[2].trim() });
        continue;
      }
    }

    if (cleanedLine.includes(",")) {
      const items = cleanedLine.split(",").map(i => i.trim()).filter(Boolean);
      items.forEach(item => {
        const itemClean = item.replace(bulletOrNumberedRegex, "").trim();
        if (itemClean && !/^(từ|word|vocabulary|nghĩa|meaning)$/i.test(itemClean)) {
          words.push({ word: itemClean, meaning: "" });
        }
      });
      continue;
    }

    if (lines.length === 1 && cleanedLine.split(/\s+/).length > 2 && !cleanedLine.includes(":") && !cleanedLine.includes("-")) {
      const spaceWords = cleanedLine.split(/\s+/).filter(Boolean);
      spaceWords.forEach(w => {
        if (w && !/^(từ|word|vocabulary|nghĩa|meaning)$/i.test(w)) {
          words.push({ word: w, meaning: "" });
        }
      });
      continue;
    }

    words.push({ word: cleanedLine, meaning: "" });
  }

  return words;
}

class GeminiAPIService {
  constructor() {
    this.model = APP_CONFIG.defaultModel || "gemini-3.5-flash-lite";
  }

  getModel(overrideModel = null) {
    if (overrideModel) return overrideModel;
    return storage?.settings?.model || APP_CONFIG.defaultModel || "gemini-3.5-flash-lite";
  }

  async validateAPIKey(apiKey, model = null) {
    const key = (apiKey || "").trim();
    if (!key) return false;
    const activeModel = this.getModel(model);
    this.model = activeModel;

    const url = `${APP_CONFIG.geminiBaseUrl}/${activeModel}:generateContent?key=${key}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping test. Respond with OK." }] }]
        })
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn(`Validate API key failed for ${activeModel}:`, e);
    }
    return false;
  }

  async generateQuiz({
    documentText,
    answerText = "",
    isCreateMultipleChoice = false,
    apiKey,
    language = "vi",
    depthMode = "normal",
    images = [],
    model = null,
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi quét.");
    }

    const cleanedText = (documentText || "").trim();
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!cleanedText && !hasImages) return [];

    if (onProgress) onProgress(15, "Đang phân tích cấu trúc tài liệu...");

    let effectiveAnswerText = (answerText || "").trim();
    if (!effectiveAnswerText && !isCreateMultipleChoice) {
      effectiveAnswerText = this.extractTrailingAnswerBlock(cleanedText);
    }

    const chunkSize = 13000;
    if (cleanedText.length > chunkSize && !hasImages) {
      const chunks = this.splitDocumentIntoChunks(cleanedText, chunkSize);
      let allQuestions = [];
      const seenTexts = new Set();
      let lastError = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const pct = Math.round(20 + (i / chunks.length) * 75);
        if (onProgress) onProgress(pct, `Đang xử lý phần ${i + 1}/${chunks.length}...`);
        try {
          const chunkQuestions = await this.generateQuizSingleBatch({
            documentText: chunk,
            answerText: effectiveAnswerText,
            isCreateMultipleChoice,
            apiKey: key,
            language,
            depthMode,
            images: [],
            model
          });
          for (const q of chunkQuestions) {
            const normalized = q.text.toLowerCase().trim();
            if (!seenTexts.has(normalized)) {
              seenTexts.add(normalized);
              allQuestions.push(q);
            }
          }
        } catch (e) {
          lastError = e;
          console.warn(`Chunk ${i} error:`, e);
        }
      }

      if (onProgress) onProgress(98, "Đang hoàn tất bộ câu hỏi...");
      if (allQuestions.length > 0) return allQuestions;
      if (lastError) throw lastError;
    }

    if (onProgress) onProgress(45, "Gemini đang trích xuất câu hỏi trắc nghiệm...");
    const res = await this.generateQuizSingleBatch({
      documentText: cleanedText,
      answerText: effectiveAnswerText,
      isCreateMultipleChoice,
      apiKey: key,
      language,
      depthMode,
      images,
      model
    });
    if (onProgress) onProgress(98, "Đang hoàn tất bộ câu hỏi...");
    return res;
  }

  async generateQuizSingleBatch({
    documentText,
    answerText = "",
    isCreateMultipleChoice,
    apiKey,
    language,
    depthMode,
    images = [],
    model = null
  }) {
    const targetLangInstruction = "YÊU CẦU NGÔN NGỮ BẮT BUỘC: Viết BẮT BUỘC TOÀN BỘ câu hỏi, các phương án lựa chọn và phần giải thích bằng TIẾNG VIỆT.";

    let depthInstruction = "";
    if (depthMode === "core") {
      depthInstruction = "DEPTH MODE - CORE: Focus strictly on the CORE ideas, main takeaways, key theorems, and essential concepts of the document.";
    } else if (depthMode === "thorough") {
      depthInstruction = "DEPTH MODE - THOROUGH: Exhaustively analyze every single paragraph, sentence, and detail of the document. Create a DENSE, EXTREMELY DETAILED, and COMPREHENSIVE multiple-choice test covering EVERY fact, rule, date, definition, example, and detail mentioned in the document. Do not skip any question or section.";
    } else {
      depthInstruction = "DEPTH MODE - NORMAL: Generate a balanced and comprehensive multiple-choice test covering all parts of the text thoroughly.";
    }

    let promptText = "";
    if (isCreateMultipleChoice) {
      promptText = `You are a master academic professor and test designer. Analyze the document below.

${targetLangInstruction}
${depthInstruction}

CRITICAL TEXT INTEGRITY & WORD ORDER RULES:
1. PRESERVE NATURAL SENTENCE WORD ORDER: Write clear, grammatically sound, and natural sentences. Never scramble or invert word order.
2. CHOICE LENGTH EQUALIZATION: All 4 choices (A, B, C, D) MUST be of equal length, depth, and detail. DO NOT make the correct choice noticeably longer or more complex than the distractors.
3. PLAUSIBLE DISTRACTORS: All wrong choices must be realistic and plausible.
4. CORRECT ANSWER SHUFFLING: Randomly distribute correct answers across A, B, C, D.
5. Correct Answer Indexing: Set "correctAnswerIndex" as a 0-BASED integer (0 for A, 1 for B, 2 for C, 3 for D).

Target Output JSON Schema:
Return ONLY a valid JSON array of question objects without markdown code blocks:
[
  {
    "text": "Question text...",
    "options": [
      {"label": "A", "text": "Option A..."},
      {"label": "B", "text": "Option B..."},
      {"label": "C", "text": "Option C..."},
      {"label": "D", "text": "Option D..."}
    ],
    "correctAnswerIndex": 0,
    "explanation": "Detailed educational explanation..."
  }
]

Document Content:
${documentText}`;
    } else {
      const answerPrompt = answerText && answerText.trim()
        ? `
OFFICIAL ANSWER KEY FILE CONTENT:
--------------------------------------------------------------------------------
${answerText.trim()}
--------------------------------------------------------------------------------
CRITICAL ANSWER KEY RULES:
- Use this official answer key to accurately determine "correctAnswerIndex" (0 for A, 1 for B, 2 for C, 3 for D) for each question.
- Do NOT convert answer keys into quiz questions.`
        : "";

      promptText = `You are an expert document OCR quiz extractor. Extract ALL real, pre-existing questions, answer options (A, B, C, D), correct answer indexes (0-based integer), and explanations found in the document.

${targetLangInstruction}
${answerPrompt}

CRITICAL EXTRACTION & ANTI-HALLUCINATION RULES:
1. MANDATORY REAL QUESTION EXTRACTION: Extract ALL questions present in the document from beginning to end.
2. DO NOT GENERATE DUMMY / PLACEHOLDER QUESTIONS: NEVER fabricate or output placeholder questions (e.g. "Câu hỏi trắc nghiệm số X thuộc Phần Y", "Question X content..."). Only extract questions that actually have real prompt text and options in the exam body.
3. ANSWER KEYS & SOLUTION TABLES: If the document contains an answer key table at the end (e.g. "BẢNG ĐÁP ÁN: 1.A 2.B 3.C..."), use it ONLY to determine the correct answers for the actual questions above. NEVER convert rows of an answer key table into separate fake questions if there is no question text in the document!
4. WORD-FOR-WORD FIDELITY: Extract the exact sentence structure, question text, options, and explanations from the document word-for-word without changing the word order.
5. PRESERVE ORIGINAL OPTION ORDER: Keep option A, B, C, D in their original sequence.
6. PRESERVE CODE INDENTATION & SPACING: For programming code snippets (Python, C++, Pascal, SQL, HTML, etc.), you MUST preserve exact leading spaces, indentation, and newlines. Enclose multi-line code snippets in Markdown code blocks (\`\`\`python ... \`\`\`) or maintain indentation with exact spaces.
7. PRESERVE IMAGES & DIAGRAMS: If a question contains an image tag (e.g. ![Hình ảnh...](data:image/...)), you MUST preserve the exact image markdown inside the question "text".
8. Set "correctAnswerIndex" as a 0-based integer (0 for A, 1 for B, 2 for C, 3 for D).

Target Output JSON Schema:
Return ONLY a valid JSON array containing ALL extracted question objects without markdown code blocks:
[
  {
    "text": "Question 1 text...",
    "options": [
      {"label": "A", "text": "Option A..."},
      {"label": "B", "text": "Option B..."},
      {"label": "C", "text": "Option C..."},
      {"label": "D", "text": "Option D..."}
    ],
    "correctAnswerIndex": 0,
    "explanation": "Explanation..."
  }
]

Document Content:
${documentText}`;
    }

    const parts = [{ text: promptText }];
    if (images && images.length > 0) {
      images.forEach(imgData => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imgData.split(",")[1]
          }
        });
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: isCreateMultipleChoice ? 0.3 : 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey, model);
    return this.parseQuestionsFromGeminiResponse(data, isCreateMultipleChoice);
  }

  extractTrailingAnswerBlock(text) {
    if (!text) return "";
    const keyMatch = text.match(/\n+(?:(?:BẢNG\s+)?ĐÁP\s+ÁN|ANSWER\s+KEY|HƯỚNG\s+DẪN\s+CHẤM|KEY\s*:|KEYS\s*:|ĐÁP\s+SỐ)[\s\S]+$/i);
    if (keyMatch && keyMatch[0].length > 20) {
      return keyMatch[0].trim();
    }
    const trailingLettersMatch = text.match(/(?:\n\s*[A-D]\s*){10,}$/i);
    if (trailingLettersMatch) {
      return trailingLettersMatch[0].trim();
    }
    return "";
  }

  async generateLanguageExam({
    documentText,
    answerText = "",
    targetCEFR = "ALL",
    apiKey,
    images = [],
    model = null,
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi quét.");
    }

    const cleanedText = (documentText || "").trim();
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!cleanedText && !hasImages) return { questions: [], vocabularies: [], detectedDurationMinutes: null };

    if (onProgress) onProgress(15, "Đang phân tích cấu trúc đề thi ngoại ngữ...");

    let effectiveAnswerText = (answerText || "").trim();
    if (!effectiveAnswerText) {
      effectiveAnswerText = this.extractTrailingAnswerBlock(cleanedText);
    }

    const chunkSize = 24000;
    if (cleanedText.length > chunkSize && !hasImages) {
      const chunks = this.splitDocumentIntoChunks(cleanedText, chunkSize);
      let allQuestions = [];
      let allVocabs = [];
      let detectedDuration = null;
      const seenQ = new Set();
      const seenW = new Set();
      let lastError = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const pct = Math.round(20 + (i / chunks.length) * 75);
        if (onProgress) onProgress(pct, `Đang xử lý phần ${i + 1}/${chunks.length}...`);
        try {
          const res = await this.generateLanguageExamSingleBatch({
            documentText: chunk,
            answerText: effectiveAnswerText,
            targetCEFR,
            apiKey: key,
            images: [],
            model
          });
          if (!detectedDuration) detectedDuration = res.detectedDurationMinutes;
          for (const q of res.questions) {
            const k = q.text.toLowerCase().trim();
            if (!seenQ.has(k)) {
              seenQ.add(k);
              allQuestions.push(q);
            }
          }
          for (const v of res.vocabularies) {
            const wk = v.word.toLowerCase().trim();
            if (!seenW.has(wk)) {
              seenW.add(wk);
              allVocabs.push(v);
            }
          }
        } catch (e) {
          lastError = e;
          console.warn(`Language chunk ${i} error:`, e);
        }
      }

      if (onProgress) onProgress(98, "Đang trích xuất từ vựng và câu hỏi CEFR...");
      if (allQuestions.length > 0) {
        return {
          questions: allQuestions,
          vocabularies: allVocabs,
          detectedDurationMinutes: detectedDuration
        };
      }
      if (lastError) throw lastError;
    }

    if (onProgress) onProgress(45, "Gemini đang quét đề thi và tạo thẻ từ vựng...");
    const res = await this.generateLanguageExamSingleBatch({
      documentText: cleanedText,
      answerText: effectiveAnswerText,
      targetCEFR,
      apiKey: key,
      images,
      model
    });
    if (onProgress) onProgress(98, "Đang hoàn tất bộ đề thi ngoại ngữ...");
    return res;
  }

  async generateLanguageExamSingleBatch({ documentText, answerText = "", targetCEFR, apiKey, images = [], model = null }) {
    const cefrFilter = targetCEFR === "ALL"
      ? "Extract high-yield vocabulary words, idioms, and collocations across all CEFR levels (A1 to C2) found in the test."
      : `Focus vocabulary extraction on high-yield words, idioms, and collocations around CEFR level ${targetCEFR} or higher.`;

    const answerSectionPrompt = answerText && answerText.trim()
      ? `
OFFICIAL SEPARATE ANSWER KEY FILE CONTENT:
--------------------------------------------------------------------------------
${answerText.trim()}
--------------------------------------------------------------------------------
CRITICAL OFFICIAL ANSWER KEY MAPPING INSTRUCTIONS:
1. The user has provided an OFFICIAL ANSWER KEY above for this exam.
2. You MUST cross-reference each question in the test document with this official answer key to set "correctAnswerIndex" (0 for A, 1 for B, 2 for C, 3 for D) with 100% accuracy.
3. Carefully match section headers (e.g., Section A Listening, Section B Lexical & Grammar, Section C Reading, PHẦN TRẮC NGHIỆM, Part 1, Part 2) and question numbers (1, 2, 3... or 31, 32...).
4. If the answer key document contains official explanations, grammatical notes, or audio scripts (transcripts), extract them into the "explanation" field of the corresponding questions.
5. NEVER generate answer key rows or answer listings as quiz questions.`
      : `
ANSWER DETECTION INSTRUCTIONS:
1. CHECK FOR EMBEDDED OR TRAILING ANSWER KEYS: Many Vietnamese English exams place the answer key at the very bottom or end of the document (under "ĐÁP ÁN", "ANSWER KEY", "HƯỚNG DẪN CHẤM", or as a sequence of letters A, B, C, D). If present, cross-reference them to set "correctAnswerIndex" accurately.
2. DO NOT treat the answer key list, grading scale, or scoring rubric as exam questions.
3. If no answer key is present for a question, accurately solve the question using your expert knowledge of English grammar, vocabulary, collocations, phonetics, and reading comprehension.`;

    const promptText = `You are a master English linguistics professor and specialized exam parser for Vietnamese High School Graduation Exams ("Đề thi tốt nghiệp THPT môn Tiếng Anh"), Provincial & National Excellent Student Exams ("Đề thi Học Sinh Giỏi (HSG) THPT môn Tiếng Anh"), IELTS, and CEFR standardized tests.

Analyze the provided exam document and generate a comprehensive JSON response containing:
1. Structured multiple-choice questions ("questions")
2. High-yield vocabulary, idioms & collocations flashcard deck ("vocabularies")
3. Detected exam duration ("durationMinutes")

CRITICAL ACCURACY & INTEGRITY RULES:
1. PRESERVE ORIGINAL WORD ORDER & SEQUENCE: Maintain exact phrasing, natural word sequence, and grammatical structure for all questions, reading passages, and options. Do not scramble words.
2. PRESERVE OPTION ORDER: Keep options (A, B, C, D) in their exact original sequence.
3. EXTRACT ALL QUESTIONS IN THE PROVIDED CHUNK: Do not omit or truncate any valid question.

TASK 1: Extract all Exam Questions into structured format:
- TIME DETECTION: Detect if the document states an allotted exam time (e.g. "Thời gian làm bài: 50 phút", "Time allowed: 60 minutes", "180 phút"). If found, set "durationMinutes" to that integer. If not found, set "durationMinutes" to null.
- QUESTION SKILLS & SUBTOPICS:
  * "skill": Assign one of:
    - "lexical": Grammar, Vocabulary, Word formation, Phrasal verbs, Idioms, Collocations, Pronunciation, Stress, Finding errors, or Cloze test (điền từ vào đoạn văn).
    - "reading": Reading comprehension passages and related questions.
    - "listening": Listening comprehension questions.
    - "general": General language questions.
  * "subTopic": Provide a clear Vietnamese label, e.g.:
    - "Phát âm" (Pronunciation)
    - "Trọng âm" (Stress)
    - "Ngữ pháp & Từ vựng" (Lexical & Grammar)
    - "Từ đồng nghĩa" (Closest meaning) / "Từ trái nghĩa" (Opposite meaning)
    - "Tìm lỗi sai" (Error identification)
    - "Điền từ vào đoạn văn" (Cloze test)
    - "Đọc hiểu" (Reading comprehension)
    - "Nghe hiểu" (Listening comprehension)

- CRITICAL RULE FOR PHONETICS & TARGET MARKINGS:
  * Pronunciation & Stress questions test specific sounds or stress positions.
  * Underlined letters or words in the source document are marked with <u>...</u>, [underlined], or **bold**.
  * You MUST preserve and display these target markings in the options and question prompt (e.g. "A. <u>ob</u>stacle", "B. <u>ob</u>scure", or "opposed in meaning to the underlined word **inevitable**").
  * For stress questions, ensure the root words are clearly given in options A, B, C, D.

- CRITICAL RULE FOR READING & CLOZE TEST PASSAGES:
  * If questions belong to a Reading passage or a Cloze test (điền từ đoạn văn), extract the FULL passage text into the "readingPassage" field of EVERY question belonging to that passage.
  * For Cloze tests, keep the numbered blanks (e.g. (1), (2) or [1], [2]) intact in the "readingPassage".
  * For each individual question belonging to a Reading/Cloze passage, DO NOT REPEAT the passage in "text". Keep "text" strictly to the specific question prompt, line reference, or blank number (e.g. "Question 31: Chọn từ thích hợp điền vào vị trí (1):", "What is the passage mainly about?").

- EXPLANATION REQUIREMENT:
  * Provide a detailed, pedagogically sound explanation in Vietnamese ("explanation") for EVERY question:
    - Explain WHY the correct option is right (cite the grammatical rule, collocation, idiom meaning, IPA phonetic contrast e.g. /s/ vs /z/, or quote the exact sentence from the reading passage).
    - Explain why other distractors are incorrect if helpful.

${answerSectionPrompt}

TASK 2: Extract a High-Yield Vocabulary, Idioms & Collocations Deck for flashcard study:
- ${cefrFilter}
- Extract 10 to 30 top high-yield items from this exam section, including:
  * Advanced or distinctive vocabulary words
  * Idiomatic expressions ("wordType": "idiom")
  * Phrasal verbs ("wordType": "phr v")
  * Fixed collocations ("wordType": "collocation")
- For each item, provide:
  1. "word": Root word, phrase, idiom, or phrasal verb
  2. "wordType": Part of speech or category (e.g. "n", "v", "adj", "adv", "idiom", "phr v", "collocation")
  3. "phonetic": Accurate IPA pronunciation with slashes (e.g. "/ˌʌn.dɚˈmɑɪn/")
  4. "vietnameseMeaning": Clear, accurate Vietnamese translation
  5. "exampleSentence": An illustrative English example sentence where the target word/phrase is in bold **target**
  6. "cefrLevel": Estimated CEFR level string: "A1", "A2", "B1", "B2", "C1", or "C2"

Target Output JSON Schema:
Return ONLY a valid JSON object matching this schema:
{
  "durationMinutes": 50,
  "questions": [
    {
      "text": "Question text...",
      "options": [
        {"label": "A", "text": "Option A..."},
        {"label": "B", "text": "Option B..."},
        {"label": "C", "text": "Option C..."},
        {"label": "D", "text": "Option D..."}
      ],
      "correctAnswerIndex": 0,
      "explanation": "Chi tiết giải thích bằng Tiếng Việt...",
      "skill": "lexical",
      "subTopic": "Phát âm",
      "readingPassage": null
    }
  ],
  "vocabularies": [
    {
      "word": "mitigate",
      "wordType": "v",
      "phonetic": "/ˈmɪt.ɪ.ɡeɪt/",
      "vietnameseMeaning": "Giảm nhẹ, làm dịu bớt hậu quả",
      "exampleSentence": "Policies aim to **mitigate** climate change.",
      "cefrLevel": "B2"
    }
  ]
}

Document Content:
${documentText}`;

    const parts = [{ text: promptText }];
    if (images && images.length > 0) {
      images.forEach(imgData => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imgData.split(",")[1]
          }
        });
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey, model);
    return this.parseLanguageExamFromGeminiResponse(data);
  }

  async askQuestionDetail({ question, userQuery = "", apiKey, language = "vi" }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt.");
    }

    const optionsText = question.options.map(o => `${o.label}. ${o.text}`).join("\n");
    const targetLang = "VIETNAMESE";

    const promptText = `You are an expert academic tutor. A student is asking for a detailed explanation regarding the following multiple-choice question.

Language Requirement: Respond exclusively in ${targetLang} (Tiếng Việt).

Question: ${question.text}
Options:
${optionsText}
Correct Answer: ${question.options[question.correctAnswerIndex]?.label || ""}. ${question.options[question.correctAnswerIndex]?.text || ""}
Existing Explanation: ${question.explanation || "None"}

Student's Custom Question / Request:
${userQuery || "Please explain step-by-step why the correct answer is right and why each incorrect option is wrong, with clear examples."}

Instructions for Tutor Response:
- Provide a comprehensive, clear, and easy-to-understand response with markdown formatting.
- Break down the concepts step-by-step.
- Explain why the correct option is right.
- Explain why each distractor option is incorrect.
- Provide a real-world example or practical analogy if applicable.`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.3
      }
    };

    const data = await this.callGeminiAPI(payload, key);
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error("Không nhận được câu trả lời từ Gemini AI.");
    }
    return candidate;
  }

  async callGeminiAPI(payload, apiKey, model = null) {
    const activeModel = this.getModel(model);
    this.model = activeModel;
    const url = `${APP_CONFIG.geminiBaseUrl}/${activeModel}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status} (${activeModel}): ${errBody}`);
    }

    return await response.json();
  }

  splitDocumentIntoChunks(text, targetChunkSize) {
    if (text.length <= targetChunkSize) return [text];

    const lines = text.split("\n");
    const chunks = [];
    let currentChunk = "";
    const questionRegex = /^(?:(?:\d+[\.:\)\s])|(?:(?:câu|question|bài|q)\s*\d+[\.:\s]))/i;

    for (const line of lines) {
      const trimmed = line.trim();
      const isQuestionStart = questionRegex.test(trimmed);

      if (currentChunk.length >= targetChunkSize && (isQuestionStart || trimmed.length === 0)) {
        chunks.push(currentChunk.trim());
        currentChunk = line + "\n";
      } else if (currentChunk.length >= targetChunkSize + 4000) {
        chunks.push(currentChunk.trim());
        currentChunk = line + "\n";
      } else {
        currentChunk += line + "\n";
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  extractValidJSONData(rawText) {
    let clean = (rawText || "").trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    else if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);
    clean = clean.trim();

    try {
      return JSON.parse(clean);
    } catch (e) {
      const firstBrace = clean.indexOf("{");
      const firstBracket = clean.indexOf("[");

      // If starts as an object or { appears before [
      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        const lastBrace = clean.lastIndexOf("}");
        if (lastBrace > firstBrace) {
          try {
            return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
          } catch (eObj) {}
        }
      }

      // Find array bounds
      if (firstBracket !== -1) {
        const lastBracket = clean.lastIndexOf("]");
        if (lastBracket > firstBracket) {
          try {
            return JSON.parse(clean.substring(firstBracket, lastBracket + 1));
          } catch (e2) {}
        }

        // Resilient backwards search for truncated JSON array (matching Swift GeminiAPIService)
        let searchEnd = clean.length;
        while (searchEnd > firstBracket) {
          const braceIdx = clean.lastIndexOf("}", searchEnd);
          if (braceIdx === -1 || braceIdx <= firstBracket) break;
          const candidate = clean.substring(firstBracket, braceIdx + 1) + "\n]";
          try {
            return JSON.parse(candidate);
          } catch (e3) {}
          searchEnd = braceIdx - 1;
        }
      }

      // Find object bounds fallback
      if (firstBrace !== -1) {
        const lastBrace = clean.lastIndexOf("}");
        if (lastBrace > firstBrace) {
          try {
            return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
          } catch (e4) {}
        }
      }
    }
    return null;
  }

  parseQuestionsFromGeminiResponse(data, shuffleOptions = true) {
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Không thể đọc nội dung văn bản từ phản hồi của Gemini AI.");
    }

    const parsedJson = this.extractValidJSONData(candidateText);
    if (!parsedJson) {
      throw new Error("Dữ liệu trả về từ AI không đúng định dạng JSON hợp lệ.");
    }

    let rawQuestions = [];
    if (Array.isArray(parsedJson)) {
      rawQuestions = parsedJson;
    } else if (typeof parsedJson === "object") {
      rawQuestions = parsedJson.questions || parsedJson.quiz || parsedJson.items || parsedJson.data || [];
    }

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("Không tìm thấy danh sách câu hỏi trong phản hồi của AI.");
    }

    const questions = [];
    const labels = ["A", "B", "C", "D", "E", "F"];

    for (const item of rawQuestions) {
      const qText = (item.text || item.question || item.prompt || item.title || "").trim();
      if (!qText) continue;

      // Anti-dummy question filter
      if (/câu\s+hỏi\s+(?:trắc\s+nghiệm\s+)?(?:số\s+)?\d+\s+(?:thuộc|nằm\s+trong|trong)\s+phần/i.test(qText)) continue;
      if (/^câu\s+\d+[\.:\s]+câu\s+hỏi\s+trắc\s+nghiệm/i.test(qText)) continue;
      if (/^nội\s+dung\s+câu\s+hỏi\s+(?:số\s+)?\d+/i.test(qText)) continue;

      let rawOptions = [];
      const opts = item.options || item.choices || item.answers || item.optionsList || item.optionList || [];
      if (Array.isArray(opts)) {
        opts.forEach((opt, idx) => {
          let text = "";
          if (typeof opt === "string") {
            text = opt;
          } else if (typeof opt === "object" && opt !== null) {
            text = opt.text || opt.content || opt.option || opt.value || opt.label || "";
            // If opt is single-key object like {"A": "a - b - c - d"}
            if (!text) {
              const keys = Object.keys(opt);
              if (keys.length === 1 && typeof opt[keys[0]] === "string") {
                text = opt[keys[0]];
              } else {
                const val = Object.values(opt).find(v => typeof v === "string" && v.length > 0);
                if (val) text = val;
              }
            }
          }
          if (typeof text === "string") {
            // Strip leading "A. ", "B) ", "(A) ", "A: " but NEVER strip arrangement choices like "a - b - c - d"
            if (/^[A-F\d][\.\:\)]\s+/i.test(text)) {
              text = text.replace(/^[A-F\d][\.\:\)]\s+/i, '').trim();
            } else if (/^\([A-F\d]\)\s*/i.test(text)) {
              text = text.replace(/^\([A-F\d]\)\s*/i, '').trim();
            }
          }
          if (text) {
            rawOptions.push(createQuestionOption(labels[idx] || `${idx + 1}`, text));
          }
        });
      } else if (typeof opts === "object" && opts !== null) {
        Object.entries(opts).forEach(([k, v], idx) => {
          let text = typeof v === "string" ? v : (v.text || v.content || v.option || v.value || "");
          if (typeof text === "string") {
            if (/^[A-F\d][\.\:\)]\s+/i.test(text)) {
              text = text.replace(/^[A-F\d][\.\:\)]\s+/i, '').trim();
            } else if (/^\([A-F\d]\)\s*/i.test(text)) {
              text = text.replace(/^\([A-F\d]\)\s*/i, '').trim();
            }
          }
          if (text) {
            rawOptions.push(createQuestionOption(labels[idx] || k.toUpperCase(), text));
          }
        });
      }

      // Check top-level item keys: item.A, item.B, item.C, item.D or item.optionA, item.optionB
      if (rawOptions.length === 0) {
        labels.slice(0, 4).forEach(letter => {
          const val = item[letter] || item[letter.toLowerCase()] || item[`option${letter}`] || item[`option_${letter}`] || item[`option_${letter.toLowerCase()}`];
          if (val && typeof val === "string") {
            let text = val.trim();
            if (/^[A-F\d][\.\:\)]\s+/i.test(text)) {
              text = text.replace(/^[A-F\d][\.\:\)]\s+/i, '').trim();
            } else if (/^\([A-F\d]\)\s*/i.test(text)) {
              text = text.replace(/^\([A-F\d]\)\s*/i, '').trim();
            }
            if (text) {
              rawOptions.push(createQuestionOption(letter, text));
            }
          }
        });
      }

      // Check if options are embedded directly in item.text (e.g. "Question...\nA. a - b - c - d\nB. b - a - d - c")
      let cleanQText = restoreImageTokens(qText).trim();
      if (rawOptions.length === 0 && cleanQText) {
        const optMatches = [...cleanQText.matchAll(/(?:^|\n)\s*([A-D])[\.\:\)]\s*([^\n]+)/gi)];
        if (optMatches.length >= 2) {
          optMatches.forEach(m => {
            rawOptions.push(createQuestionOption(m[1].toUpperCase(), m[2].trim()));
          });
          // Strip embedded options from question prompt
          cleanQText = cleanQText.replace(/(?:\n\s*[A-D][\.\:\)][^\n]+)+$/i, '').trim();
        }
      }

      // If extracting pre-existing questions and all options are empty, skip dummy question
      if (!shuffleOptions && rawOptions.every(o => !o.text || o.text.trim().length === 0 || o.text.trim() === o.label)) {
        continue;
      }

      if (rawOptions.length === 0) {
        if (!shuffleOptions) continue; // In extraction mode, don't create fake options
        rawOptions = [
          createQuestionOption("A", "Phương án A"),
          createQuestionOption("B", "Phương án B"),
          createQuestionOption("C", "Phương án C"),
          createQuestionOption("D", "Phương án D")
        ];
      }

      let correctIndex = 0;
      if (typeof item.correctAnswerIndex === "number") {
        correctIndex = item.correctAnswerIndex;
      } else if (typeof item.correctIndex === "number") {
        correctIndex = item.correctIndex;
      } else if (typeof item.correctAnswer === "string") {
        const letter = item.correctAnswer.trim().toUpperCase();
        if (letter.startsWith("A")) correctIndex = 0;
        else if (letter.startsWith("B")) correctIndex = 1;
        else if (letter.startsWith("C")) correctIndex = 2;
        else if (letter.startsWith("D")) correctIndex = 3;
      }

      if (correctIndex < 0 || correctIndex >= rawOptions.length) {
        correctIndex = 0;
      }

      const targetCorrectOption = rawOptions[correctIndex];
      let finalOptions = [...rawOptions];
      let finalCorrectIndex = correctIndex;

      if (shuffleOptions) {
        finalOptions.sort(() => Math.random() - 0.5);
        finalOptions = finalOptions.map((opt, i) => ({
          ...opt,
          label: labels[i] || `${i + 1}`
        }));
        finalCorrectIndex = finalOptions.findIndex(opt => opt.id === targetCorrectOption.id);
        if (finalCorrectIndex === -1) finalCorrectIndex = 0;
      }

      const rawReadingPassage = restoreImageTokens(item.readingPassage || "").trim();

      // Deduplicate passage from question prompt if passage is already present in readingPassage
      if (rawReadingPassage && rawReadingPassage.length > 20) {
        if (cleanQText === rawReadingPassage) {
          cleanQText = "Chọn phương án đúng nhất theo bài đọc / đoạn văn:";
        } else if (cleanQText.includes(rawReadingPassage)) {
          cleanQText = cleanQText.replace(rawReadingPassage, "").trim();
        } else {
          // Check if cleanQText contains a long prefix of passage text ending with "Question X:" or "Choose..."
          const qMatch = cleanQText.match(/\n+((?:Question\s+\d+|Câu\s+\d+|Choose\s+|Select\s+|According\s+to\s+|The\s+word\s+|What\s+|Which\s+|In\s+paragraph)[\s\S]+)$/i);
          if (qMatch && cleanQText.length - qMatch[1].length > 60) {
            cleanQText = qMatch[1].trim();
          }
        }
      }

      questions.push(createQuestion({
        text: cleanQText || "Chọn phương án đúng nhất:",
        options: finalOptions.map(opt => ({ ...opt, text: restoreImageTokens(opt.text) })),
        correctAnswerIndex: finalCorrectIndex,
        explanation: restoreImageTokens(item.explanation || item.explain || item.detail || ""),
        skill: item.skill || null,
        subTopic: item.subTopic || null,
        readingPassage: rawReadingPassage || null
      }));
    }

    return questions;
  }

  attachExtractedImagesToQuestions(rawItems) {
    if (!rawItems || rawItems.length === 0) return;
    const map = documentParser.currentExtractedImages || {};
    const allTokens = Object.keys(map);
    if (allTokens.length === 0) return;

    if (!this.currentScanUsedTokens) {
      this.currentScanUsedTokens = new Set();
    }
    const usedTokens = this.currentScanUsedTokens;

    // Track which tokens are already placed in item text or explanations
    for (const item of rawItems) {
      const qFull = (item.text || item.question || item.prompt || "") + " " + (item.explanation || "");
      for (const token of allTokens) {
        // Match both [IMG_N] and any variant Gemini might have produced
        if (qFull.includes(token) || (map[token] && qFull.includes(map[token]))) {
          usedTokens.add(token);
        }
        // Also check for number-based match (e.g. "HINHANH_1" vs "IMG_1")
        const numMatch = token.match(/(\d+)\]$/);
        if (numMatch) {
          const n = numMatch[1];
          if (new RegExp(`\\\\[(?:IMG|HINH(?:_?ANH)?)\\\\s*[_-]?\\\\s*${n}\\\\s*\\\\]`, 'i').test(qFull)) {
            usedTokens.add(token);
          }
        }
      }
    }

    const availableTokens = allTokens.filter(t => !usedTokens.has(t));
    if (availableTokens.length === 0) return;

    const imageRefRegex = /(?:xem\s+hình|hình\s+(?:dưới|bên|trên|vẽ|minh\s+họa)|đồ\s+thị|sơ\s+đồ|bảng\s+số\s+liệu|mô\s+hình|thí\s+nghiệm|như\s+hình|thể\s+hiện\s+ở\s+hình)/i;

    for (const item of rawItems) {
      if (availableTokens.length === 0) break;
      const t = item.text || item.question || item.prompt || "";
      const hasImageAlready = (t.includes("![") || allTokens.some(tok => t.includes(tok)));
      if (!hasImageAlready && imageRefRegex.test(t)) {
        const nextToken = availableTokens.shift();
        usedTokens.add(nextToken);
        const baseKey = item.text ? "text" : (item.question ? "question" : "prompt");
        item[baseKey] = `${t.trim()}\n\n${nextToken}\n\n`;
      }
    }
  }

  parseLanguageExamFromGeminiResponse(data, originalVocabList = "") {
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Không thể đọc phản hồi từ Gemini AI.");
    }

    const parsed = this.extractValidJSONData(candidateText);
    if (!parsed) {
      throw new Error("Dữ liệu đề thi không khớp định dạng JSON.");
    }

    const questions = this.parseQuestionsFromGeminiResponse(data, false);
    const vocabularies = [];

    const rawVocabs = parsed.vocabularies || parsed.vocabulary || parsed.vocab || parsed.words || parsed.flashcards || [];
    if (Array.isArray(rawVocabs)) {
      rawVocabs.forEach(v => {
        const wordStr = typeof v === "string" ? v : (v.word || v.term || v.vocabulary || "");
        if (wordStr && wordStr.trim()) {
          vocabularies.push(createVocabularyCard({
            word: wordStr.trim(),
            wordType: (typeof v === "object" ? v.wordType || v.type || v.partOfSpeech : "") || "n",
            phonetic: (typeof v === "object" ? v.phonetic || v.ipa || v.pronunciation : "") || "",
            vietnameseMeaning: (typeof v === "object" ? v.vietnameseMeaning || v.meaning || v.definition || v.vietnamese : "") || "",
            exampleSentence: (typeof v === "object" ? v.exampleSentence || v.example || v.sentence : "") || "",
            cefrLevel: (typeof v === "object" ? (v.cefrLevel || v.level || "B1") : "B1").toUpperCase()
          }));
        }
      });
    }

    // Auto-fallback: If no vocabularies returned, construct cards from original input
    if (vocabularies.length === 0 && originalVocabList) {
      const items = extractVocabListItems(originalVocabList);
      items.forEach(it => {
        vocabularies.push(createVocabularyCard({
          word: it.word,
          wordType: "n",
          phonetic: "",
          vietnameseMeaning: it.meaning || "",
          exampleSentence: `Practice using the word **${it.word}**.`,
          cefrLevel: "B1"
        }));
      });
    }

    return {
      questions,
      vocabularies,
      detectedDurationMinutes: parsed.durationMinutes || null
    };
  }

  async generateTHPTQuiz({
    documentText,
    answerText = "",
    apiKey,
    images = [],
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi quét.");
    }

    const cleanedText = documentText.trim();
    if (!cleanedText && images.length === 0) return [];

    this.currentScanUsedTokens = new Set();

    let effectiveAnswerText = (answerText || "").trim();
    if (!effectiveAnswerText) {
      effectiveAnswerText = this.extractTrailingAnswerBlock(cleanedText);
    }

    if (onProgress) onProgress(15, "Đang phân tích cấu trúc 3 phần đề thi THPT...");

    // Try section-aware splitting first (Part I, Part II, Part III)
    const sections = this.splitTHPTSections(cleanedText);
    if (sections && sections.length > 0) {
      let allQuestions = [];
      let lastError = null;

      const partLabels = {
        part1: "Phần I: Trắc nghiệm 4 lựa chọn",
        part2: "Phần II: Đúng / Sai 4 ý",
        part3: "Phần III: Trả lời ngắn"
      };

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const basePercent = Math.round(20 + (sIdx / sections.length) * 70);
        const partName = partLabels[sec.part] || `Phần ${sIdx + 1}`;
        if (onProgress) onProgress(basePercent, `Đang quét ${partName}...`);

        try {
          if (sec.text.length > 14000) {
            const secChunks = this.splitTHPTDocumentIntoChunks(sec.text, 13000);
            for (let cIdx = 0; cIdx < secChunks.length; cIdx++) {
              const sc = secChunks[cIdx];
              const chunkPercent = Math.min(92, Math.round(basePercent + (cIdx / secChunks.length) * (70 / sections.length)));
              if (onProgress) onProgress(chunkPercent, `Đang quét ${partName} (đoạn ${cIdx + 1}/${secChunks.length})...`);
              const chunkQuestions = await this.generateTHPTSectionBatch({
                sectionPart: sec.part,
                documentText: sc,
                answerText: effectiveAnswerText,
                apiKey: key,
                images: images
              });
              if (Array.isArray(chunkQuestions) && chunkQuestions.length > 0) {
                allQuestions.push(...chunkQuestions);
              }
            }
          } else {
            const secQuestions = await this.generateTHPTSectionBatch({
              sectionPart: sec.part,
              documentText: sec.text,
              answerText: effectiveAnswerText,
              apiKey: key,
              images: images
            });
            if (Array.isArray(secQuestions) && secQuestions.length > 0) {
              allQuestions.push(...secQuestions);
            }
          }
        } catch (e) {
          lastError = e;
          console.warn(`Error scanning THPT ${sec.part}:`, e);
        }
      }

      if (onProgress) onProgress(98, "Đang hoàn tất cấu trúc đề thi THPT...");
      if (allQuestions.length > 0) return allQuestions;
      if (lastError) throw lastError;
    }

    // Fallback: character-based chunking
    const chunkSize = 11000;
    if (cleanedText.length > chunkSize) {
      const chunks = this.splitTHPTDocumentIntoChunks(cleanedText, chunkSize);
      let allQuestions = [];
      let lastError = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const pct = Math.round(20 + (i / chunks.length) * 75);
        if (onProgress) onProgress(pct, `Đang xử lý phần ${i + 1}/${chunks.length}...`);
        try {
          const chunkQuestions = await this.generateTHPTQuizSingleBatch({
            documentText: chunk,
            apiKey: key
          });
          if (Array.isArray(chunkQuestions) && chunkQuestions.length > 0) {
            allQuestions.push(...chunkQuestions);
          }
        } catch (e) {
          lastError = e;
          console.warn("Chunk scan error:", e);
        }
      }

      if (onProgress) onProgress(98, "Đang hoàn tất đề thi THPT...");
      if (allQuestions.length > 0) return allQuestions;
      if (lastError) throw lastError;
    }

    if (onProgress) onProgress(45, "Gemini đang quét đề thi THPT...");
    const res = await this.generateTHPTQuizSingleBatch({
      documentText: cleanedText,
      apiKey: key
    });
    if (onProgress) onProgress(98, "Đang hoàn tất đề thi THPT...");
    return res;
  }

  splitTHPTSections(fullText) {
    // Find all P1, P2, P3 occurrences in full document
    const findMatches = (regex) => {
      const matches = [];
      let m;
      const re = new RegExp(regex.source, regex.flags + (regex.flags.includes("g") ? "" : "g"));
      while ((m = re.exec(fullText)) !== null) {
        matches.push(m.index);
      }
      return matches;
    };

    const p1Matches = findMatches(/(?:PHẦN|Phần|PART)\s+(?:I|1|nhất)\b/i);
    const p2Matches = findMatches(/(?:PHẦN|Phần|PART)\s+(?:II|2|hai)\b/i);
    const p3Matches = findMatches(/(?:PHẦN|Phần|PART)\s+(?:III|3|ba)\b/i);

    if (p2Matches.length === 0) return null;

    const firstP1 = p1Matches.length > 0 ? p1Matches[0] : 0;
    const firstP2 = p2Matches[0];
    const firstP3 = p3Matches.length > 0 ? p3Matches[0] : null;

    // Strict boundary for Answer Key / End of Exam (must be on its own line or with dashes)
    const ansKeywords = findMatches(/(?:^|\n)\s*(?:[-=*#_~]{2,}\s*)?(?:BẢNG\s+ĐÁP\s+ÁN|HƯỚNG\s+DẪN\s+CHẤM|ĐÁP\s+ÁN\s+CHI\s+TIẾT|HƯỚNG\s+DẪN\s+GIẢI|[-=*#_~]{2,}\s*HẾT\s*[-=*#_~]{2,}|\bĐÁP\s+ÁN\b)/im);

    let ansCandidates = [];
    if (firstP3 !== null) {
      ansCandidates = ansKeywords.filter(idx => idx > firstP3);
      if (p1Matches.length > 1) ansCandidates.push(...p1Matches.slice(1).filter(idx => idx > firstP3));
      if (p2Matches.length > 1) ansCandidates.push(...p2Matches.slice(1).filter(idx => idx > firstP3));
      if (p3Matches.length > 1) ansCandidates.push(...p3Matches.slice(1).filter(idx => idx > firstP3));
    } else {
      ansCandidates = ansKeywords.filter(idx => idx > firstP2);
      if (p1Matches.length > 1) ansCandidates.push(...p1Matches.slice(1).filter(idx => idx > firstP2));
      if (p2Matches.length > 1) ansCandidates.push(...p2Matches.slice(1).filter(idx => idx > firstP2));
    }

    const examEnd = ansCandidates.length > 0 ? Math.min(...ansCandidates) : fullText.length;
    const ansText = examEnd < fullText.length ? fullText.substring(examEnd).trim() : "";

    const sections = [];

    // Part 1: firstP1 to firstP2
    const p1Body = fullText.substring(firstP1, firstP2).trim();
    if (p1Body) {
      sections.push({
        part: "part1",
        text: p1Body + (ansText ? "\n\n--- BẢNG ĐÁP ÁN THAM KHẢO ---\n" + ansText : "")
      });
    }

    // Part 2: firstP2 to (firstP3 or examEnd)
    const p2End = firstP3 !== null && firstP3 < examEnd ? firstP3 : examEnd;
    const p2Body = fullText.substring(firstP2, p2End).trim();
    if (p2Body) {
      sections.push({
        part: "part2",
        text: p2Body + (ansText ? "\n\n--- BẢNG ĐÁP ÁN THAM KHẢO ---\n" + ansText : "")
      });
    }

    // Part 3: firstP3 to examEnd
    if (firstP3 !== null && firstP3 < examEnd) {
      const p3Body = fullText.substring(firstP3, examEnd).trim();
      if (p3Body) {
        sections.push({
          part: "part3",
          text: p3Body + (ansText ? "\n\n--- BẢNG ĐÁP ÁN THAM KHẢO ---\n" + ansText : "")
        });
      }
    }

    return sections.length > 0 ? sections : null;
  }

  async generateTHPTSectionBatch({ sectionPart, documentText, answerText = "", apiKey, images = [] }) {
    let sectionInstruction = "";
    let schemaExample = "";

    if (sectionPart === "part2") {
      sectionInstruction = `TÀI LIỆU NÀY LÀ PHẦN II: CÂU TRẮC NGHIỆM ĐÚNG / SAI.
YÊU CẦU BẮT BUỘC CHO PHẦN II:
- Trích xuất TOÀN BỘ các câu hỏi Đúng/Sai có trong đoạn văn bản bên dưới (không quan trọng số thứ tự câu bắt đầu từ đâu).
- TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ SÓT câu nào.
- Mỗi câu BẮT BUỘC dùng trường "subItems" (KHÔNG dùng "options") với đúng 4 ý a, b, c, d:
  "subItems": [
    {"label": "a", "text": "Nội dung khẳng định a...", "isCorrect": true},
    {"label": "b", "text": "Nội dung khẳng định b...", "isCorrect": false},
    {"label": "c", "text": "Nội dung khẳng định c...", "isCorrect": true},
    {"label": "d", "text": "Nội dung khẳng định d...", "isCorrect": false}
  ]
- "isCorrect" BẮT BUỘC là boolean (true hoặc false), KHÔNG dùng chuỗi "Đúng"/"Sai".
- Đặt "part": "part2", "questionType": "trueFalseGroup", "pointValue": 1.0.`;

      schemaExample = `[
  {
    "text": "Nội dung câu hỏi dẫn...",
    "part": "part2",
    "questionType": "trueFalseGroup",
    "subItems": [
      {"label": "a", "text": "Khẳng định a...", "isCorrect": true},
      {"label": "b", "text": "Khẳng định b...", "isCorrect": false},
      {"label": "c", "text": "Khẳng định c...", "isCorrect": true},
      {"label": "d", "text": "Khẳng định d...", "isCorrect": false}
    ],
    "pointValue": 1.0,
    "explanation": "Giải thích chi tiết..."
  }
]`;
    } else if (sectionPart === "part3") {
      sectionInstruction = `TÀI LIỆU NÀY LÀ PHẦN III: CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN.
YÊU CẦU BẮT BUỘC CHO PHẦN III:
- Trích xuất TOÀN BỘ các câu hỏi tự điền đáp án ngắn có trong đoạn văn bản bên dưới (không quan trọng số thứ tự câu).
- Đặt "part": "part3", "questionType": "shortAnswer", "shortAnswer": "đáp án", "pointValue": 0.5.`;

      schemaExample = `[
  {
    "text": "Nội dung câu hỏi tính toán...",
    "part": "part3",
    "questionType": "shortAnswer",
    "shortAnswer": "12.5",
    "acceptedAnswers": ["12.5", "12,5"],
    "pointValue": 0.5,
    "explanation": "Giải thích..."
  }
]`;
    } else {
      sectionInstruction = `TÀI LIỆU NÀY LÀ PHẦN I: CÂU TRẮC NGHIỆM NHIỀU LỰA CHỌN (CHỌN 1 TRONG 4 PHƯƠNG ÁN A, B, C, D).
YÊU CẦU BẮT BUỘC CHO PHẦN I:
- Trích xuất TOÀN BỘ các câu hỏi 4 lựa chọn có trong đoạn văn bản bên dưới (bất kể số thứ tự câu bắt đầu từ đâu).
- Mỗi câu BẮT BUỘC phải có đầy đủ 4 phương án A, B, C, D trong mảng "options" và chỉ số "correctAnswerIndex" (0=A, 1=B, 2=C, 3=D).
- Đặt "part": "part1", "questionType": "multipleChoice", "pointValue": 0.25.`;

      schemaExample = `[
  {
    "text": "Nội dung câu hỏi trắc nghiệm...",
    "part": "part1",
    "questionType": "multipleChoice",
    "options": [
      {"label": "A", "text": "Phương án A..."},
      {"label": "B", "text": "Phương án B..."},
      {"label": "C", "text": "Phương án C..."},
      {"label": "D", "text": "Phương án D..."}
    ],
    "correctAnswerIndex": 0,
    "pointValue": 0.25,
    "explanation": "Giải thích chi tiết..."
  }
]`;
    }

    const imageRule = images && images.length > 0
      ? `7. HÌNH ẢNH MINH HỌA VÀ ĐỒ THỊ: Tài liệu được cung cấp dưới dạng ảnh (${images.length} trang). Nếu một câu hỏi có hình vẽ/đồ thị, hãy MÔ TẢ ngắn gọn nội dung hình ảnh đó TRỰC TIẾP TRONG trường "text" (ví dụ: "(Hình: hình lăng trụ đứng ABC.A'B'C' với AB=AC=BC=2)"). KHÔNG dùng ký hiệu [IMG_N]. KHÔNG bỏ trống hình ảnh.`
      : `7. HÌNH ẢNH MINH HỌA VÀ ĐỒ THỊ: Nếu câu hỏi có ký hiệu [IMG_N] (ví dụ [IMG_1], [IMG_2]), hãy sao chép CHÍNH XÁC ký hiệu đó vào trường "text". TUYỆT ĐỐI KHÔNG thay đổi hay rút gọn ký hiệu (phải có dấu gạch dưới: [IMG_1] không phải [IMG1]).`;

    const answerRule = answerText && answerText.trim()
      ? `\nBẢNG ĐÁP ÁN ĐÍNH KÈM TỪ FILE ĐÁP ÁN RIÊNG:\n${answerText.trim()}\n-> Hãy đối soát với bảng đáp án này để điền chính xác đáp án/khẳng định đúng sai cho phần thi tương ứng.\n`
      : "";

    const promptText = `Bạn là chuyên gia khảo thí và biên soạn đề thi tốt nghiệp THPT Quốc gia theo cấu trúc chuẩn của Bộ Giáo dục & Đào tạo.

${sectionInstruction}
${answerRule}

QUY TẮC BẮT BUỘC VỀ TRÍCH XUẤT VÀ CHỐNG TẠO CÂU HỎI RÁC/GIẢ:
1. CHỈ TRÍCH XUẤT CÂU HỎI THẬT: Trích xuất đầy đủ tất cả các câu hỏi CÓ ĐỀ BÀI trong tài liệu (từ Câu 1 đến câu cuối cùng của phần tương ứng). TUYỆT ĐỐI KHÔNG BỎ SÓT CÂU HỎI.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT / TẠO CÂU HỎI GIẢ HOẶC PLACEHOLDER (ví dụ: CẤM xuất các câu như "Câu hỏi trắc nghiệm số 7 thuộc Phần I", "Nội dung câu hỏi số X...").
3. BẢNG ĐÁP ÁN Ở CUỐI TRANG: Nếu tài liệu có bảng đáp án tóm tắt, hãy sử dụng nó để điền đáp án đúng cho các câu hỏi tương ứng phía trên. KHÔNG biến các dòng trong bảng đáp án thành câu hỏi giả nếu không có đề bài!
4. CÔNG THỨC TOÁN VÀ KÝ HIỆU: TUYỆT ĐỐI GIỮ NGUYÊN toàn bộ chuỗi LaTeX nguyên văn trong dấu $...$ — KHÔNG được sửa đổi, dịch hay viết lại công thức. Nếu tài liệu có $\frac{a}{b}$ thì output PHẢI là $\frac{a}{b}$ (ví dụ: $y = f(x)$, $f'(x) > 0$, $(-\\infty; -1)$, $\\frac{a}{b}$, $[0; 40)$).
5. BẢNG DỮ LIỆU / BẢNG SỐ LIỆU / BẢNG BIẾN THIÊN: Giữ nguyên và định dạng dưới dạng bảng Markdown chuẩn (ví dụ: | Cột 1 | Cột 2 | ...) với đầy đủ tiêu đề cột và các dòng dữ liệu để câu hỏi hiển thị trực quan và rõ ràng nhất.
6. BẢO TOÀN THỤT ĐẦU DÒNG VÀ ĐỊNH DẠNG CODE (TIN HỌC / LẬP TRÌNH): Đối với các đoạn mã nguồn (Python, C++, Pascal, SQL, HTML, thuật toán, v.v.), BẮT BUỘC giữ nguyên 100% khoảng trắng thụt lề đầu dòng (indentation/spaces/tabs) và ngắt dòng.
${imageRule}
8. CÔNG THỨC VẬT LÝ & HÓA HỌC: Giữ nguyên ký hiệu hạt nhân ($^{235}_{92}\\text{U}$, $_{Z}^{A}\\text{X}$), phân số ($\\frac{a}{b}$), số mũ ($10^{-6}$) và chỉ số dưới ($v_0$).
9. TỰ ĐỘNG GHÉP VÀ CHUẨN HÓA TIẾNG VIỆT: Nếu chữ bị tách rời dấu (ví dụ: "Luy ệ n thép"), BẮT BUỘC ghép lại thành từ chuẩn ("Luyện thép").

Target Output JSON Schema:
Trả về DUY NHẤT một mảng JSON hợp lệ chứa các câu hỏi theo schema đã hướng dẫn (không dùng markdown code blocks):
${schemaExample}

Nội dung tài liệu:
${documentText}`;

    const parts = [{ text: promptText }];
    if (images && images.length > 0) {
      images.forEach(imgData => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imgData.split(",")[1]
          }
        });
      });
    }

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey);
    return this.parseTHPTQuestionsFromGeminiResponse(data, sectionPart);
  }

  splitTHPTDocumentIntoChunks(text, targetChunkSize) {
    if (text.length <= targetChunkSize) return [text];

    const lines = text.split("\n");
    const chunks = [];
    let currentChunk = "";
    const sectionRegex = /^(?:phần|phan|part)\s+(?:i|ii|iii|1|2|3|nhất|hai|ba)|^(?:câu|question|bài|q)\s*\d+[\.:\s]/i;

    for (const line of lines) {
      const trimmed = line.trim();
      const isSectionStart = sectionRegex.test(trimmed);

      if (currentChunk.length >= targetChunkSize && (isSectionStart || trimmed.length === 0)) {
        chunks.push(currentChunk.trim());
        currentChunk = line + "\n";
      } else if (currentChunk.length >= targetChunkSize + 4000) {
        chunks.push(currentChunk.trim());
        currentChunk = line + "\n";
      } else {
        currentChunk += line + "\n";
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  async generateTHPTQuizSingleBatch({ documentText, apiKey, images = [] }) {
    const promptText = `Bạn là chuyên gia khảo thí và biên soạn đề thi tốt nghiệp THPT Quốc gia theo cấu trúc 3 phần chuẩn của Bộ Giáo dục & Đào tạo.
Hãy phân tích tài liệu/đề thi bên dưới và trích xuất TOÀN BỘ câu hỏi theo ĐẦY ĐỦ CẤU TRÚC 3 PHẦN THPT QUỐC GIA:

QUY TẮC BẮT BUỘC VỀ TRÍCH XUẤT VÀ CHỐNG TẠO CÂU HỎI RÁC/GIẢ:
1. CHỈ TRÍCH XUẤT CÂU HỎI THẬT: Trích xuất đầy đủ tất cả các câu hỏi CÓ ĐỀ BÀI VÀ CÁC PHƯƠNG ÁN trong tài liệu. TUYỆT ĐỐI KHÔNG BỎ SÓT CÂU HỎI.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT / TẠO CÂU HỎI GIẢ HOẶC PLACEHOLDER.
3. BẢNG ĐÁP ÁN Ở CUỐI TRANG: Nếu tài liệu có bảng đáp án tóm tắt, hãy sử dụng nó để điền đáp án đúng cho các câu hỏi tương ứng phía trên.
4. CÔNG THỨC TOÁN VÀ KÝ HIỆU: Hãy giữ nguyên định dạng LaTeX chuẩn đặt trong dấu $...$ (ví dụ: $y = f(x)$, $f'(x) > 0$, $(-\\infty; -1)$, $\\frac{a}{b}$, $[0; 40)$).
5. BẢNG DỮ LIỆU / BẢNG SỐ LIỆU / BẢNG BIẾN THIÊN: Giữ nguyên và định dạng dưới dạng bảng Markdown chuẩn (ví dụ: | Cột 1 | Cột 2 | ...) với đầy đủ tiêu đề cột và các dòng dữ liệu để câu hỏi hiển thị trực quan và rõ ràng nhất.
6. BẢO TOÀN THỤT ĐẦU DÒNG VÀ ĐỊNH DẠNG CODE: Đối với các đoạn mã nguồn (Python, C++, Pascal, SQL, HTML, thuật toán, v.v.), BẮT BUỘC giữ nguyên 100% khoảng trắng thụt lề đầu dòng (indentation/spaces/tabs) và ngắt dòng.
7. HÌNH ẢNH MINH HỌA VÀ ĐỒ THỊ: Nếu trong tài liệu có hình ảnh, hoặc có ký hiệu [IMG_1], [IMG_2]..., hãy sử dụng đúng y hệt ký hiệu đó (ví dụ: [IMG_1]) trong nội dung câu hỏi để đại diện cho hình ảnh đó.
8. CÔNG THỨC VẬT LÝ & HÓA HỌC: Giữ nguyên ký hiệu hạt nhân ($^{235}_{92}\\text{U}$, $_{Z}^{A}\\text{X}$), phân số ($\\frac{a}{b}$), số mũ ($10^{-6}$) và chỉ số dưới ($v_0$).
9. TỰ ĐỘNG GHÉP VÀ CHUẨN HÓA TIẾNG VIỆT: Nếu chữ bị tách rời dấu, BẮT BUỘC ghép lại thành từ tiếng Việt chuẩn chính xác.

CẤU TRÚC 3 PHẦN:
1. PHẦN I: Trắc nghiệm nhiều lựa chọn (chọn 1 trong 4 phương án A, B, C, D).
   - "part": "part1"
   - "questionType": "multipleChoice"
   - "text": "Nội dung câu hỏi..."
   - "options": [{"label": "A", "text": "..."}, {"label": "B", "text": "..."}, {"label": "C", "text": "..."}, {"label": "D", "text": "..."}]
   - "correctAnswerIndex": 0 đến 3 (0=A, 1=B, 2=C, 3=D)
   - "pointValue": 0.25
   - "explanation": "Giải thích chi tiết phương pháp giải..."

2. PHẦN II: Trắc nghiệm Đúng / Sai (mỗi câu gồm 4 ý khẳng định a, b, c, d).
   - "part": "part2"
   - "questionType": "trueFalseGroup"
   - "text": "Nội dung câu hỏi dẫn..."
   - "subItems": [
       {"label": "a", "text": "Khẳng định a...", "isCorrect": true hoặc false},
       {"label": "b", "text": "Khẳng định b...", "isCorrect": true hoặc false},
       {"label": "c", "text": "Khẳng định c...", "isCorrect": true hoặc false},
       {"label": "d", "text": "Khẳng định d...", "isCorrect": true hoặc false}
     ]
   - "pointValue": 1.0

3. PHẦN III: Trắc nghiệm trả lời ngắn (tự điền kết quả / giá trị số).
   - "part": "part3"
   - "questionType": "shortAnswer"
   - "text": "Nội dung câu hỏi yêu cầu tính toán..."
   - "shortAnswer": "Đáp án chính xác (ví dụ: 12.5, -4, 2/3)"

Target Output JSON Schema:
Trả về DUY NHẤT một mảng JSON hợp lệ chứa các câu hỏi theo schema trên (không dùng markdown code blocks).

Nội dung tài liệu:
${documentText}`;

    const parts = [{ text: promptText }];
    if (images && images.length > 0) {
      images.forEach(imgData => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imgData.split(",")[1]
          }
        });
      });
    }

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey);
    return this.parseTHPTQuestionsFromGeminiResponse(data);
  }

  parseTHPTQuestionsFromGeminiResponse(data, fallbackPart = null) {
    try {
      let rawText = "";
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawText = data.candidates[0].content.parts[0].text;
      } else if (typeof data === "string") {
        rawText = data;
      }
      
      const parsed = this.extractValidJSONData(rawText);
      const items = Array.isArray(parsed) ? parsed : (parsed?.questions || []);
      this.attachExtractedImagesToQuestions(items);

      const questions = [];
      for (const item of items) {
        const qText = (item.text || item.question || item.prompt || "").trim();
        if (!qText) continue;

        // Anti-dummy question filter
        if (/câu\s+hỏi\s+(?:trắc\s+nghiệm\s+)?(?:số\s+)?\d+\s+(?:thuộc|nằm\s+trong|trong)\s+phần/i.test(qText)) continue;
        if (/^câu\s+\d+[\.:\s]+câu\s+hỏi\s+trắc\s+nghiệm/i.test(qText)) continue;
        if (/^nội\s+dung\s+câu\s+hỏi\s+(?:số\s+)?\d+/i.test(qText)) continue;

        // Detect SubItems from various Gemini schema formats
        let rawSubsList = item.subItems || item.sub_items || item.statements || item.items || item.subQuestions || item.assertions;
        if (!rawSubsList && Array.isArray(item.options)) {
          const hasBool = item.options.some(o => o.isCorrect !== undefined || o.correct !== undefined || typeof o.answer === "boolean" || typeof o.answer === "string");
          const isABCD = item.options.every((o, i) => ["a", "b", "c", "d", "A", "B", "C", "D"].includes(o.label || ["a", "b", "c", "d"][i]));
          if (hasBool || (isABCD && item.options.length === 4 && (item.part === "part2" || item.questionType === "trueFalseGroup" || fallbackPart === "part2" || /đúng.*sai/i.test(qText)))) {
            rawSubsList = item.options;
          }
        }
        // Handle Gemini returning a,b,c,d as top-level keys: {a: "text", a_correct: true, b: "text"...}
        if (!rawSubsList && (item.a !== undefined || item.b !== undefined)) {
          rawSubsList = ["a","b","c","d"].filter(k => item[k] !== undefined).map(k => ({
            label: k,
            text: String(item[k] || ""),
            isCorrect: item[`${k}_correct`] ?? item[`${k}Correct`] ?? item[`isCorrect_${k}`] ?? false
          }));
          if (rawSubsList.length === 0) rawSubsList = null;
        }

        const rawSubs = Array.isArray(rawSubsList) && rawSubsList.length > 0 ? rawSubsList.map((s, idx) => {
          const lbl = (s.label || ["a", "b", "c", "d"][idx] || `${idx + 1}`).toLowerCase();
          let isTrue = false;
          if (typeof s.isCorrect === "boolean") isTrue = s.isCorrect;
          else if (typeof s.correct === "boolean") isTrue = s.correct;
          else if (typeof s.answer === "boolean") isTrue = s.answer;
          else if (typeof s.answer === "string") isTrue = /đúng|true|yes|d\b|t\b|đ\b/i.test(s.answer.trim());
          else if (typeof s.isCorrect === "string") isTrue = /đúng|true|yes|d\b|t\b|đ\b/i.test(s.isCorrect.trim());
          return createSubItem(lbl, s.text || s.content || s.statement || "", isTrue);
        }) : null;

        const hasSubItems = Array.isArray(rawSubs) && rawSubs.length > 0;
        const isShort = Boolean(item.shortAnswer || item.short_answer || (item.questionType === "shortAnswer") || item.part === "part3" || fallbackPart === "part3");

        const itemPart = hasSubItems ? "part2" : (isShort ? "part3" : (item.part || fallbackPart || "part1"));
        const itemQType = hasSubItems ? "trueFalseGroup" : (isShort ? "shortAnswer" : (item.questionType || (itemPart === "part2" ? "trueFalseGroup" : (itemPart === "part3" ? "shortAnswer" : "multipleChoice"))));

        const rawOpts = item.options && !hasSubItems ? item.options.map((o, idx) => createQuestionOption(o.label || ["A", "B", "C", "D"][idx] || `${idx + 1}`, o.text || "")) : [];

        // Detect if question text has math or image placeholder (means it's real even if options empty)
        const hasMathOrImage = /\[MATH\]|\[IMG_\d+\]|\[HINH_ANH_\d+\]|!\[/i.test(qText);

        // Skip multipleChoice only if options truly empty and question text is also trivial
        if (itemQType === "multipleChoice") {
          const allOptsEmpty = rawOpts.length === 0 || rawOpts.every(o => !o.text || o.text.trim().length === 0 || o.text.trim() === o.label);
          if (allOptsEmpty && !hasMathOrImage) continue;
          // If no options but question text has real content (math etc), keep with empty opts rather than skip
          if (rawOpts.length === 0 && hasMathOrImage) {
            // Push placeholder options so the question is usable
            rawOpts.push(...["A","B","C","D"].map(l => createQuestionOption(l, "...")));
          }
        }

        // Skip Part 2 only if subitems truly empty
        if (itemQType === "trueFalseGroup" && (!rawSubs || rawSubs.every(s => !s.text || s.text.trim().length === 0))) {
          continue;
        }

        questions.push(createQuestion({
          text: restoreImageTokens(qText),
          part: itemPart,
          questionType: itemQType,
          options: rawOpts.map(opt => ({ ...opt, text: restoreImageTokens(opt.text) })),
          correctAnswerIndex: typeof item.correctAnswerIndex === "number" ? item.correctAnswerIndex : 0,
          subItems: rawSubs ? rawSubs.map(s => ({ ...s, text: restoreImageTokens(s.text) })) : null,
          shortAnswer: item.shortAnswer ? String(item.shortAnswer) : (item.short_answer ? String(item.short_answer) : ""),
          acceptedAnswers: Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers.map(String) : (item.shortAnswer ? [String(item.shortAnswer)] : []),
          pointValue: typeof item.pointValue === "number" ? item.pointValue : (itemPart === "part2" ? 1.0 : (itemPart === "part3" ? 0.5 : 0.25)),
          explanation: restoreImageTokens(item.explanation || item.explain || item.detail || ""),
          skill: item.skill || null,
          subTopic: item.subTopic || null
        }));
      }

      return questions;
    } catch (e) {
      console.error("Failed to parse THPT questions from Gemini response:", e);
      throw new Error("Không thể phân tích định dạng câu hỏi THPT từ AI. Vui lòng thử lại.");
    }
  }

  // AI Generation Functions (without document input)

  async generateLanguageExamFromPrompt({
    mode = "thpt",
    vocabList = "",
    questionCount = 15,
    cefrLevel = "ALL",
    topic = "",
    difficulty = "medium",
    apiKey,
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi tạo đề.");
    }

    const cleanedTopic = (topic || "").trim();

    // Delegate IELTS Academic mode to dedicated 3-Passage, 40-question Cambridge generator
    if (mode === "ielts") {
      return await this.generateIELTSAcademicExam({
        topic: cleanedTopic,
        difficulty,
        apiKey: key,
        onProgress
      });
    }

    if (onProgress) onProgress(15, "Đang chuẩn bị tạo đề thi Ngoại ngữ bằng AI...");

    const difficultyStr = difficulty === "easy" ? "dễ" : difficulty === "medium" ? "trung bình" : "khó";
    const cefrFilter = cefrLevel === "ALL"
      ? "Tất cả các trình độ CEFR (A1 đến C2)"
      : `Tập trung vào trình độ CEFR ${cefrLevel}`;

    const targetQuestions = mode === "thpt"
      ? 40
      : (mode === "vocab"
        ? (questionCount || Math.max(2, extractVocabListItems(vocabList).length * 2))
        : (questionCount || 15));

    let promptText = "";

    if (mode === "vocab") {
      // MODE 3: ÔN TẬP TỪ VỰNG (VOCABULARY REVIEW / MASTERY)
      const wordItems = extractVocabListItems(vocabList);
      const vocabCount = wordItems.length || 1;
      const wordNames = wordItems.map(w => w.word).join(", ");

      const contextInstruction = cleanedTopic
        ? `- ĐỊNH HƯỚNG CHỦ ĐỀ / NGỮ CẢNH: Tạo các câu hỏi xoay quanh chủ đề "${cleanedTopic}".`
        : `- ĐỊNH HƯỚNG NGỮ CẢNH: TỰ NHIÊN VÀ BÁM SÁT BẢN CHẤT CỦA TỪNG TỪ VỰNG: Tạo các câu hỏi với ngữ cảnh tự nhiên, chân thực và phổ biến nhất của chính từ vựng đó (đời sống, học thuật, công việc, giao tiếp...). Bám sát chính xác nghĩa gốc, sắc thái từ và các collocation chuẩn mực của từng từ vựng mà không gượng ép vào bất kỳ chủ đề đơn lẻ nào.`;

      promptText = `Bạn là chuyên gia ngôn ngữ học và sư phạm tiếng Anh hàng đầu.
Nhiệm vụ của bạn là tạo một BỘ ĐỀ THI ÔN TẬP TỪ VỰNG & BỘ THẺ FLASHCARD 3D CHUYÊN SÂU với ĐÚNG CHÍNH XÁC ${targetQuestions} CÂU HỎI TRẮC NGHIỆM dựa trên danh sách từ vựng được người dùng cung cấp dưới đây:

DANH SÁCH ${vocabCount} TỪ VỰNG ĐẦU VÀO:
"""
${vocabList}
"""

YÊU CẦU BẮT BUỘC (2 NHIỆM VỤ TRONG CÙNG 1 JSON):

NHIỆM VỤ 1: TẠO ĐỦ ĐÚNG CHÍNH XÁC ${targetQuestions} CÂU HỎI TRẮC NGHIỆM NGỮ CẢNH ĐA DẠNG:
- Số lượng: BẮT BUỘC TẠO ĐỦ ĐÚNG ${targetQuestions} CÂU HỎI TRẮC NGHIỆM trong mảng "questions" (từ câu 1 đến câu ${targetQuestions}). Tuyệt đối không được tạo ít hơn ${targetQuestions} câu, không được chỉ tạo 2-3 câu ví dụ.
- Mục đích: Giúp người học ghi nhớ sâu sắc các từ vựng trong danh sách (${wordNames}), hiểu đúng ngữ cảnh, collocation, giới từ đi kèm, từ đồng nghĩa/trái nghĩa và sắc thái nghĩa.
${contextInstruction}
- Tần suất xuất hiện: Hãy phân bố câu hỏi sao cho mỗi từ vựng trong danh sách xuất hiện lặp lại đều đặn trong ${targetQuestions} câu hỏi với các dạng bài và ngữ cảnh khác nhau:
  1. Contextual Gap-filling: Điền từ thích hợp vào chỗ trống trong một câu ngữ cảnh giàu thông tin thực tế.
  2. Closest in Meaning / Synonym: Tìm từ/cụm từ đồng nghĩa với từ mục tiêu trong câu.
  3. Opposite in Meaning / Antonym: Tìm từ/cụm từ trái nghĩa với từ mục tiêu.
  4. Collocation & Preposition Usage: Kiểm tra cụm từ cố định hoặc giới từ đi kèm với từ vựng.
  5. Sentence Nuance & Definition: Chọn câu sử dụng từ vựng đúng ngữ cảnh nhất hoặc giải thích đúng nghĩa của từ trong ngữ cảnh.
- Mức độ khó: ${difficultyStr}.
- Đặt "skill": "lexical", "subTopic": "Ôn tập từ vựng".
- GIẢI THÍCH CHI TIẾT (BẮT BUỘC BẰNG TIẾNG VIỆT):
  * Giải thích rõ ràng nghĩa của từ cần chọn, dịch câu tiếng Anh sang tiếng Việt.
  * Phân tích tại sao đáp án đúng là chính xác và giải thích ngắn gọn các đáp án sai/gây nhiễu để người học mở rộng vốn từ.

NHIỆM VỤ 2: TẠO BỘ THẺ TỪ VỰNG FLASHCARD CEFR CHO 100% CÁC TỪ TRONG DANH SÁCH:
- Trích xuất toàn bộ các từ/cụm từ (${wordNames}) vào mảng "vocabularies".
- Với mỗi từ vựng, cung cấp đầy đủ và chuẩn xác:
  1. "word": Từ gốc hoặc cụm từ/thành ngữ/phrasal verb
  2. "wordType": Loại từ viết tắt ("n", "v", "adj", "adv", "phr v", "idiom", "collocation")
  3. "phonetic": Phiên âm quốc tế IPA chuẩn xác đặt trong dấu gạch chéo (ví dụ: "/ˌre.zɪˈli.ənt/", "/ˈmɪt.ɪ.ɡeɪt/")
  4. "vietnameseMeaning": Nghĩa tiếng Việt chuẩn, súc tích, dễ nhớ
  5. "exampleSentence": Câu ví dụ tiếng Anh tự nhiên, thực tế và in đậm từ mục tiêu bằng Markdown (ví dụ: "Local communities need to be **resilient** against natural disasters.")
  6. "cefrLevel": Cấp độ CEFR ước tính ("A1", "A2", "B1", "B2", "C1", "C2")

QUY TẮC CÂU HỎI & ĐÁP ÁN:
- Cân bằng độ dài 4 phương án A, B, C, D (không để đáp án đúng dài hơn bất thường).
- Đảo ngẫu nhiên vị trí đáp án đúng qua các chữ cái A, B, C, D.
- "correctAnswerIndex": Số nguyên 0-based (0=A, 1=B, 2=C, 3=D).`;

    } else {
      // MODE 1: THPT QUỐC GIA (TIẾNG ANH) - CHUẨN BỘ GIÁO DỤC & ĐÀO TẠO (40 CÂU - 50 PHÚT)
      promptText = `Bạn là chuyên gia khảo thí và biên soạn đề thi tốt nghiệp THPT Quốc gia môn Tiếng Anh theo ma trận chuẩn của Bộ Giáo dục & Đào tạo.
Nhiệm vụ của bạn là biên soạn một BỘ ĐỀ THI TỐT NGHIỆP THPT TIẾNG ANH CHUẨN HOÀN CHỈNH gồm ĐÚNG CHÍNH XÁC 40 CÂU HỎI TRẮC NGHIỆM (thời gian làm bài: 50 phút) kèm BỘ THẺ TỪ VỰNG FLASHCARD CEFR.

YÊU CẦU ĐỀ THI:
- Số lượng: BẮT BUỘC TẠO ĐỦ ĐÚNG 40 câu hỏi trắc nghiệm trong mảng "questions" (từ Câu 1 đến Câu 40). Tuyệt đối không dừng lại ở câu 30 hay rút ngắn.
- Trình độ: Chuẩn tốt nghiệp THPT (tương đương Bậc 3/6 KNLNNVN / CEFR B1), Mức độ khó: ${difficultyStr}.
${cleanedTopic ? `- Chủ đề định hướng: ${cleanedTopic}` : "- Chủ đề: Đa dạng, bám sát chương trình THPT và các vấn đề đương đại (môi trường, công nghệ, giáo dục, đời sống xã hội...)"}

QUY TẮC QUAN TRỌNG VỀ ĐOẠN VĂN & CÂU HỎI (BẮT BUỘC TUÂN THỦ):
1. TRƯỜNG "readingPassage":
   - Chứa TOÀN BỘ nội dung bài đọc / thông báo / quảng cáo / đoạn văn.
   - Đối với các phần đọc điền (Thông báo, Cloze test, Điền khuyết câu): BẮT BUỘC dùng ký hiệu chỗ trống dạng **(1) _______**, **(2) _______**, **(7) _______**... TUYỆT ĐỐI KHÔNG ĐƯỢC để lộ đáp án sẵn trong readingPassage!
   - Sử dụng định dạng Markdown trong bài đọc:
     * In đậm các từ vựng mục tiêu cần hỏi nghĩa bằng **word** (ví dụ: **resilient**, **mitigate**).
     * In đậm các đại từ quy chiếu cần hỏi bằng **it**, **they**, **this**.
     * Đặt các vị trí điền câu dạng **[A]**, **[B]**, **[C]**, **[D]** cho câu hỏi chèn câu vào đoạn văn.
2. TRƯỜNG "text" CỦA CÂU HỎI:
   - CHỈ CHỨA DUY NHẤT câu hỏi / yêu cầu (ví dụ: "Choose the best option to fill in blank (1).", "The word **resilient** in paragraph 2 is closest in meaning to:", "According to paragraph 3, which statement is TRUE?").
   - TUYỆT ĐỐI KHÔNG lặp lại toàn bộ bài đọc hay thông báo trong trường "text"!
3. PHẦN SẮP XẾP HỘI THOẠI & VĂN BẢN (Câu 13 - 17):
   - Trường "text" liệt kê các câu với ký hiệu chữ cái: "a. ...\\nb. ...\\nc. ...\\nd. ...".
   - 4 phương án options là các chuỗi thứ tự: "a - b - c - d", "b - a - d - c", "c - a - d - b", "d - c - b - a".

MA TRẬN CẤU TRÚC ĐỀ THI THPT TIẾNG ANH 40 CÂU (BẮT BUỘC TUÂN THỦ CHÍNH XÁC TỪNG PHẦN):
1. PHẦN 1: ĐỌC ĐIỀN THÔNG BÁO / QUẢNG CÁO (ANNOUNCEMENT / ADVERTISEMENT) - 6 CÂU (Câu 1 - 6):
   - Viết 1 hoặc 2 đoạn thông báo/quảng cáo ngắn (70 - 120 từ) chứa các chỗ trống **(1) _______** đến **(6) _______**. Gán nội dung thông báo vào trường "readingPassage" của cả 6 câu.
   - Kiểm tra: Từ loại/Phân từ, Trật tự từ, Rút gọn MĐQH, Giới từ, Collocations, Động từ nguyên mẫu có "to".
   - "skill": "lexical", "subTopic": "Đọc điền thông báo/quảng cáo".
2. PHẦN 2: ĐỌC ĐIỀN TỪ RỜI VÀO ĐOẠN VĂN (CLOZE TEST) - 6 CÂU (Câu 7 - 12):
   - Viết 1 đoạn văn ngắn (120 - 180 từ) chứa các chỗ trống **(7) _______** đến **(12) _______**. Gán đoạn văn vào trường "readingPassage" của cả 6 câu.
   - Kiểm tra: Lượng từ (quantifiers), Cụm động từ (phrasal verbs), Cụm giới từ, Từ vựng theo ngữ cảnh.
   - "skill": "lexical", "subTopic": "Đọc điền từ vào đoạn văn".
3. PHẦN 3: SẮP XẾP ĐOẠN HỘI THOẠI / LÁ THƯ / ĐOẠN VĂN - 5 CÂU (Câu 13 - 17):
   - Câu hỏi sắp xếp trật tự các câu đối thoại, lá thư hoặc đoạn văn để tạo thành văn bản hoàn chỉnh có nghĩa.
   - "skill": "reading", "subTopic": "Sắp xếp hội thoại & văn bản".
4. PHẦN 4: ĐỌC ĐIỀN KHUYẾT CÂU VÀO ĐOẠN VĂN - 5 CÂU (Câu 18 - 22):
   - Viết 1 đoạn văn chứa các chỗ trống **(18) _______** đến **(22) _______** và chọn mệnh đề/câu thích hợp điền vào (Câu bị động, Mệnh đề quan hệ, Ngữ cảnh liên kết). Gán đoạn văn vào "readingPassage".
   - "skill": "reading", "subTopic": "Đọc điền khuyết câu".
5. PHẦN 5: BÀI ĐỌC HIỂU 1 (8 CÂU) - (Câu 23 - 30):
   - Viết 1 bài đọc hiểu học thuật (250 - 350 từ). Gán toàn bộ bài đọc vào trường "readingPassage" của TẤT CẢ các câu từ 23 đến 30.
   - Các câu hỏi: Thông tin chi tiết, Từ gần nghĩa, Từ trái nghĩa, Từ quy chiếu (reference), Paraphrasing, TRUE / NOT TRUE, Thông tin theo đoạn.
   - "skill": "reading", "subTopic": "Đọc hiểu bài 1".
6. PHẦN 6: BÀI ĐỌC HIỂU 2 (10 CÂU) - (Câu 31 - 40):
   - Viết 1 bài đọc hiểu phân tích sâu (350 - 450 từ) có chèn các vị trí **[A]**, **[B]**, **[C]**, **[D]** và in đậm từ khóa. Gán toàn bộ bài đọc vào trường "readingPassage" của TẤT CẢ các câu từ 31 đến 40.
   - Các câu hỏi: Điền câu phù hợp vào đoạn ([A]/[B]/[C]/[D]), Từ gần nghĩa, Từ quy chiếu, Thông tin chi tiết, Ý chính tác giả (Main idea), Từ trái nghĩa, TRUE / NOT TRUE, Paraphrasing, Câu hỏi suy luận (Inference).
   - "skill": "reading", "subTopic": "Đọc hiểu bài 2".
7. GIẢI THÍCH NGẮN GỌN & SÚC TÍCH (BẮT BUỘC BẰNG TIẾNG VIỆT):
   - Mỗi câu giải thích súc tích trong 1-2 câu tiếng Việt (dịch nghĩa, cấu trúc ngữ pháp và lý do chọn đáp án đúng).
8. BỘ THẺ TỪ VỰNG CEFR ĐỀ THI (FLASHCARDS):
   - Trích xuất 15 - 20 từ vựng/collocations hay nhất trong đề thi vào mảng "vocabularies" với đầy đủ: "word", "wordType", "phonetic" (IPA chuẩn), "vietnameseMeaning", "exampleSentence" (in đậm **word**), "cefrLevel" (B1/B2/C1).`;
    }

    const fullPrompt = `${promptText}

TARGET OUTPUT JSON SCHEMA:
Trả về DUY NHẤT một JSON object hợp lệ (không chứa markdown code block ngoài JSON).
LƯU Ý QUAN TRỌNG: Mảng "questions" BẮT BUỘC PHẢI CHỨA ĐỦ ĐÚNG ${targetQuestions} PHẦN TỬ CÂU HỎI (từ câu 1 đến câu ${targetQuestions}):
{
  "durationMinutes": ${mode === "ielts" ? 60 : (mode === "thpt" ? 50 : 30)},
  "questions": [
    {
      "text": "Question 1 prompt text...",
      "options": [
        {"label": "A", "text": "Option A content..."},
        {"label": "B", "text": "Option B content..."},
        {"label": "C", "text": "Option C content..."},
        {"label": "D", "text": "Option D content..."}
      ],
      "correctAnswerIndex": 0,
      "explanation": "Giải thích chi tiết bằng tiếng Việt...",
      "skill": "lexical",
      "subTopic": "Ôn tập từ vựng",
      "readingPassage": null
    }
  ],
  "vocabularies": [
    {
      "word": "mitigate",
      "wordType": "v",
      "phonetic": "/ˈmɪt.ɪ.ɡeɪt/",
      "vietnameseMeaning": "Làm dịu bớt, giảm nhẹ mức độ nghiêm trọng",
      "exampleSentence": "Policies aim to **mitigate** climate change risks.",
      "cefrLevel": "B2"
    }
  ]
}`;

    if (onProgress) onProgress(35, "Đang giao tiếp với Gemini AI để tạo đề thi & bộ thẻ Flashcard...");

    const payload = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    if (onProgress) onProgress(55, "Đang nhận dữ liệu đề thi và xử lý cấu trúc câu hỏi...");

    const data = await this.callGeminiAPI(payload, apiKey);
    
    if (onProgress) onProgress(85, "Đang phân tích bài đọc hiểu và trích xuất thẻ từ vựng CEFR...");

    const result = this.parseLanguageExamFromGeminiResponse(data, vocabList);

    if (onProgress) onProgress(98, "Đang hoàn tất bộ đề thi Ngoại ngữ...");

    return result;
  }

  // Dedicated Multi-Passage IELTS Academic Generator (Cambridge 17-19 Standard: 3 Essays, 40 Questions, 60 Mins)

  async generateIELTSAcademicExam({
    topic = "",
    difficulty = "medium",
    apiKey,
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi tạo đề.");
    }

    if (onProgress) onProgress(8, "Đang tra cứu bộ đề IELTS Forecast & cấu trúc bài thi Cambridge 17-19...");

    // Step 1: Resolve 3 authentic IELTS reading themes and Cambridge styles
    const plan = await this.resolveIELTSForecastPlan({ topic, apiKey: key });

    // Step 2: Generate Passage 1 (Questions 1 - 13: 13 questions, ~700-800 words)
    if (onProgress) onProgress(18, `Đang biên soạn Passage 1: "${plan.passage1.title}" (~750 từ, 13 câu hỏi)...`);
    const p1 = await this.generateIELTSPassageBatch({
      passageIndex: 1,
      startNumber: 1,
      questionCount: 13,
      passagePlan: plan.passage1,
      difficulty,
      apiKey: key
    });

    // Step 3: Generate Passage 2 (Questions 14 - 26: 13 questions, ~800-850 words)
    if (onProgress) onProgress(48, `Đang biên soạn Passage 2: "${plan.passage2.title}" (~800 từ, 13 câu hỏi)...`);
    const p2 = await this.generateIELTSPassageBatch({
      passageIndex: 2,
      startNumber: 14,
      questionCount: 13,
      passagePlan: plan.passage2,
      difficulty,
      apiKey: key
    });

    // Step 4: Generate Passage 3 (Questions 27 - 40: 14 questions, ~850-950 words)
    if (onProgress) onProgress(76, `Đang biên soạn Passage 3: "${plan.passage3.title}" (~850 từ, 14 câu hỏi)...`);
    const p3 = await this.generateIELTSPassageBatch({
      passageIndex: 3,
      startNumber: 27,
      questionCount: 14,
      passagePlan: plan.passage3,
      difficulty,
      apiKey: key
    });

    if (onProgress) onProgress(95, "Đang hợp nhất đủ 40 câu hỏi và tổng hợp bộ thẻ từ vựng AWL Flashcards...");

    // Merge questions from all 3 passages
    const allQuestions = [
      ...(p1.questions || []),
      ...(p2.questions || []),
      ...(p3.questions || [])
    ];

    // Deduplicate and combine vocabularies
    const vocabMap = new Map();
    [...(p1.vocabularies || []), ...(p2.vocabularies || []), ...(p3.vocabularies || [])].forEach(v => {
      const wKey = (v.word || "").trim().toLowerCase();
      if (wKey && !vocabMap.has(wKey)) {
        vocabMap.set(wKey, v);
      }
    });

    if (onProgress) onProgress(100, "Hoàn tất bộ đề thi IELTS Academic Reading!");

    return {
      questions: allQuestions,
      vocabularies: Array.from(vocabMap.values()),
      detectedDurationMinutes: 60
    };
  }

  async resolveIELTSForecastPlan({ topic = "", apiKey }) {
    const cleaned = (topic || "").trim();

    // Curated bank of authentic Cambridge 17-19 / Recent Actual Test Forecast themes
    const curatedThemes = [
      {
        passage1: {
          title: "The Subterranean Water Engineering of Ancient Arid Civilizations",
          theme: "Ancient Persian qanats and Nazca puquios, subterranean aqueduct surveying, hydrological preservation and desert survival techniques",
          sourceStyle: "Smithsonian Magazine / BBC History (Descriptive, historical, chronological)"
        },
        passage2: {
          title: "Acoustic Ecology: Mapping Anthropogenic Ocean Noise and Cetacean Disruption",
          theme: "Bioacoustic research on marine mammals, cargo vessel acoustic frequencies, echolocation masking, and deep-sea acoustic recording arrays",
          sourceStyle: "Nature / Scientific American (Empirical methodology, laboratory & field findings, environmental data)"
        },
        passage3: {
          title: "The Architecture of Intuition: Algorithmic versus Human Cognitive Agency",
          theme: "Cognitive psychology, dual-process theory (System 1 & System 2), predictive algorithmic decision-making, epistemic trust and human autonomy",
          sourceStyle: "The Economist / Mind & Language (Philosophical debate, abstract discursive reasoning, authorial stance)"
        }
      },
      {
        passage1: {
          title: "Biomimetic Architecture: Termite Mound Ventilation in Structural Design",
          theme: "Mick Pearce's Eastgate Centre in Zimbabwe, passive macro-porous thermoregulation, natural diurnal temperature damping in architecture",
          sourceStyle: "National Geographic (Descriptive factual case study)"
        },
        passage2: {
          title: "Deep-Sea Bioluminescence and Chemosynthetic Ecosystems",
          theme: "Hydrothermal vents, enzymatic luciferin-luciferase mechanisms, adaptations to extreme oceanic baric pressures, biotechnology applications of green fluorescent proteins",
          sourceStyle: "New Scientist (Analytical academic research)"
        },
        passage3: {
          title: "The Linguistic Relativity Debate in the Era of Artificial Intelligence",
          theme: "Sapir-Whorf hypothesis, linguistic determinism vs Chomskyan universal grammar, semantic spaces in multilingual LLMs, and cross-cultural conceptualization",
          sourceStyle: "Journal of Cognitive Linguistics (Theoretical critique, nuanced academic dispute)"
        }
      },
      {
        passage1: {
          title: "The LiDAR Drone Revolution and High-Altitude Medieval Cities",
          theme: "Discovery of high-altitude Silk Road urban centers (Tugunbulak & Tashbulak) in the Pamir Mountains, drone LiDAR 3D topography and nomadic metallurgy",
          sourceStyle: "Archaeology Magazine (Fieldwork narrative, historical archaeology)"
        },
        passage2: {
          title: "Urban Rewilding and the Miyawaki Micro-Forest Model in Post-Industrial Megacities",
          theme: "Akira Miyawaki dense multi-tiered afforestation, rapid indigenous canopy development, urban heat island mitigation, urban biodiversity metrics",
          sourceStyle: "Ecological Applications (Data-driven environmental study)"
        },
        passage3: {
          title: "The Paradox of Abundance: Choice Overload and Contemporary Decision Heuristics",
          theme: "Barry Schwartz's choice overload, satisficers vs maximizers, opportunity cost rumination, cognitive exhaustion, and welfare in consumption societies",
          sourceStyle: "The Economist (Complex discursive synthesis and critique)"
        }
      }
    ];

    const chosenFallback = curatedThemes[Math.floor(Math.random() * curatedThemes.length)];

    if (!cleaned || cleaned.startsWith("Tự động")) {
      try {
        const prompt = `Bạn là chuyên gia nghiên cứu đề thi IELTS Academic quốc tế (Cambridge IELTS 17, 18, 19).
Hãy lập kế hoạch 3 bài đọc học thuật hoàn chỉnh bám sát bộ đề dự đoán mới nhất (IELTS Forecast 2024 - 2026):
- Passage 1: Khoa học thường thức, lịch sử tự nhiên hoặc kỹ thuật cổ đại (văn phong mô tả thực tế, ~700-800 từ).
- Passage 2: Nghiên cứu thực nghiệm, công nghệ sinh thái, hải dương học hoặc tâm lý học (văn phong phân tích học thuật, ~800-850 từ).
- Passage 3: Triết học nhận thức, ngôn ngữ học, trí tuệ nhân tạo hoặc kinh tế học hành vi (văn phong tranh luận đa chiều, ~850-950 từ).

Trả về DUY NHẤT một JSON hợp lệ:
{
  "passage1": {"title": "Tiêu đề tiếng Anh...", "theme": "...", "sourceStyle": "..."},
  "passage2": {"title": "Tiêu đề tiếng Anh...", "theme": "...", "sourceStyle": "..."},
  "passage3": {"title": "Tiêu đề tiếng Anh...", "theme": "...", "sourceStyle": "..."}
}`;
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
        };
        const res = await this.callGeminiAPI(payload, apiKey);
        const parsed = this.extractValidJSONData(res.candidates?.[0]?.content?.parts?.[0]?.text);
        if (parsed?.passage1?.title && parsed?.passage2?.title && parsed?.passage3?.title) {
          return parsed;
        }
      } catch (e) {
        console.warn("Auto-forecast resolution fallback to curated set:", e);
      }
      return chosenFallback;
    }

    // User specified a custom theme
    try {
      const prompt = `Chủ đề được yêu cầu: "${cleaned}".
Hãy thiết kế 3 bài đọc IELTS Academic (Passage 1, 2, 3) theo chuẩn Cambridge IELTS khai thác 3 khía cạnh học thuật chuyên sâu:
- Passage 1: Nguồn gốc, lịch sử, bối cảnh thực tế (~750 từ, văn phong BBC History / National Geographic).
- Passage 2: Nghiên cứu thực nghiệm, công nghệ, dữ liệu khoa học (~800 từ, văn phong New Scientist / Nature).
- Passage 3: Tranh luận học thuật, triết học, phản biện đa chiều (~850 từ, văn phong The Economist).

Trả về DUY NHẤT JSON:
{
  "passage1": {"title": "Tiêu đề tiếng Anh...", "theme": "...", "sourceStyle": "..."},
  "passage2": {"title": "Tiêu đề tiếng Anh...", "theme": "...", "sourceStyle": "..."},
  "passage3": {"title": "Tiêu đề tiếng Anh...", "theme": "...", "sourceStyle": "..."}
}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.5 }
      };
      const res = await this.callGeminiAPI(payload, apiKey);
      const parsed = this.extractValidJSONData(res.candidates?.[0]?.content?.parts?.[0]?.text);
      if (parsed?.passage1?.title && parsed?.passage2?.title && parsed?.passage3?.title) {
        return parsed;
      }
    } catch (e) {
      console.warn("Custom topic plan fallback:", e);
    }

    return {
      passage1: { title: `${cleaned}: Historical Foundations and Practical Discoveries`, theme: cleaned, sourceStyle: "BBC History" },
      passage2: { title: `${cleaned}: Empirical Investigations and Technological Breakthroughs`, theme: cleaned, sourceStyle: "Nature" },
      passage3: { title: `${cleaned}: Theoretical Complexities and Future Paradigms`, theme: cleaned, sourceStyle: "The Economist" }
    };
  }

  async generateIELTSPassageBatch({
    passageIndex,
    startNumber,
    questionCount,
    passagePlan,
    difficulty,
    apiKey
  }) {
    const endNumber = startNumber + questionCount - 1;
    const difficultyStr = difficulty === "easy" ? "dễ" : difficulty === "medium" ? "trung bình" : "khó";

    let wordCountRange = "";
    let questionTypesInstruction = "";

    if (passageIndex === 1) {
      wordCountRange = "700 đến 800 từ";
      questionTypesInstruction = `CẤU TRÚC BỘ CÂU HỎI PASSAGE 1 (ĐÚNG ${questionCount} CÂU HỎI TỪ CÂU ${startNumber} ĐẾN CÂU ${endNumber}):
1. CÂU ${startNumber} ĐẾN CÂU ${startNumber + 5} (6 CÂU): TRUE / FALSE / NOT GIVEN
   - Kiểm tra thông tin thực tế được nêu trong bài đọc.
   - BẮT BUỘC có 4 phương án trắc nghiệm:
     "options": [
       {"label": "A", "text": "True"},
       {"label": "B", "text": "False"},
       {"label": "C", "text": "Not Given"},
       {"label": "D", "text": "N/A"}
     ]
2. CÂU ${startNumber + 6} ĐẾN CÂU ${endNumber} (7 CÂU): MULTIPLE CHOICE 4 LỰA CHỌN & FACTUAL DETAIL
   - Trắc nghiệm 4 lựa chọn (A, B, C, D) kiểm tra chi tiết, nguyên nhân - kết quả, cụm từ theo ngữ cảnh bài đọc.`;
    } else if (passageIndex === 2) {
      wordCountRange = "750 đến 850 từ";
      questionTypesInstruction = `CẤU TRÚC BỘ CÂU HỎI PASSAGE 2 (ĐÚNG ${questionCount} CÂU HỎI TỪ CÂU ${startNumber} ĐẾN CÂU ${endNumber}):
1. CÂU ${startNumber} ĐẾN CÂU ${startNumber + 5} (6 CÂU): MATCHING INFORMATION / HEADINGS TO PARAGRAPHS
   - Dạng bài: "Which paragraph contains the following information?" hoặc "Which paragraph discusses...?".
   - 4 phương án là các đoạn văn: A. Paragraph A, B. Paragraph B, C. Paragraph C, D. Paragraph D...
2. CÂU ${startNumber + 6} ĐẾN CÂU ${endNumber} (7 CÂU): SUMMARY COMPLETION & ACADEMIC VOCABULARY IN CONTEXT
   - Trắc nghiệm 4 lựa chọn (A, B, C, D) hoàn thành tóm tắt hoặc kiểm tra từ vựng học thuật AWL theo ngữ cảnh bài đọc.`;
    } else {
      wordCountRange = "800 đến 950 từ";
      questionTypesInstruction = `CẤU TRÚC BỘ CÂU HỎI PASSAGE 3 (ĐÚNG ${questionCount} CÂU HỎI TỪ CÂU ${startNumber} ĐẾN CÂU ${endNumber}):
1. CÂU ${startNumber} ĐẾN CÂU ${startNumber + 6} (7 CÂU): YES / NO / NOT GIVEN
   - Kiểm tra quan điểm, khẳng định hoặc lập trường của tác giả (Claims or Views of the Writer).
   - 4 phương án trắc nghiệm:
     "options": [
       {"label": "A", "text": "Yes"},
       {"label": "B", "text": "No"},
       {"label": "C", "text": "Not Given"},
       {"label": "D", "text": "N/A"}
     ]
2. CÂU ${startNumber + 7} ĐẾN CÂU ${endNumber} (7 CÂU): ADVANCED MULTIPLE CHOICE & INFERENCE
   - Trắc nghiệm 4 lựa chọn (A, B, C, D) kiểm tra khả năng suy luận (Inference), mục đích của tác giả (Writer's purpose), hoặc kết luận trọng tâm (Main conclusion).`;
    }

    const promptText = `Bạn là giám khảo và chuyên gia khảo thí Cambridge IELTS Academic quốc tế.
Nhiệm vụ của bạn là biên soạn TOÀN DIỆN PHẦN THI IELTS READING - PASSAGE ${passageIndex} chuẩn khảo thí quốc tế tương đương sách Cambridge IELTS 17, 18, 19.

THÔNG TIN BÀI ĐỌC PASSAGE ${passageIndex}:
- Tiêu đề bài đọc: ${passagePlan.title}
- Chủ đề chuyên sâu: ${passagePlan.theme}
- Phong cách văn phong: ${passagePlan.sourceStyle}
- Độ khó mục tiêu: ${difficultyStr} (IELTS Band 6.5 - 8.5+)

YÊU CẦU BẮT BUỘC VỀ BÀI ĐỌC (ACADEMIC ESSAY):
1. ĐỘ DÀI VÀ CHẤT LƯỢNG HỌC THUẬT:
   - Bài đọc BẮT BUỘC PHẢI DÀI ĐẦY ĐỦ TỪ ${wordCountRange} tiếng Anh học thuật phong phú, mạch lạc và giàu chi tiết.
   - TUYỆT ĐỐI KHÔNG viết tóm tắt ngắn, KHÔNG cắt xén 1-2 đoạn.
2. BẮT BUỘC ĐÁNH KÝ HIỆU CHỮ CÁI ĐẦU MỖI ĐOẠN VĂN:
   - Chia bài đọc thành 5 đến 8 đoạn văn hoàn chỉnh.
   - Đặt ký hiệu ở đầu mỗi đoạn:
     **[Paragraph A]** ...
     **[Paragraph B]** ...
     **[Paragraph C]** ...
     **[Paragraph D]** ...
     **[Paragraph E]** ...
     **[Paragraph F]** ...
3. GÁN VÀO TRƯỜNG "readingPassage":
   - BẮT BUỘC gán TOÀN BỘ bài đọc hoàn chỉnh này vào trường "readingPassage" của TẤT CẢ ${questionCount} câu hỏi!

${questionTypesInstruction}

QUY TẮC CÂU HỎI VÀ ĐÁP ÁN:
- Số lượng: BẮT BUỘC TẠO ĐỦ ĐÚNG ${questionCount} CÂU HỎI TRẮC NGHIỆM (từ Câu ${startNumber} đến Câu ${endNumber}).
- Trường "text": Chỉ chứa câu hỏi hoặc mệnh đề cần kiểm tra, TUYỆT ĐỐI KHÔNG lặp lại bài đọc trong trường "text".
- Đáp án đúng "correctAnswerIndex": Số nguyên 0-based (0=A, 1=B, 2=C, 3=D). Cân bằng phương án đúng A, B, C, D.
- GIẢI THÍCH CHI TIẾT BẰNG TIẾNG VIỆT (BẮT BUỘC):
  * Trích dẫn câu/đoạn bằng chứng trong bài đọc (ví dụ: "Dẫn chứng ở Đoạn B: '...'").
  * Dịch câu dẫn chứng sang tiếng Việt và giải thích cặn kẽ tại sao chọn đáp án đó (và tại sao các phương án khác sai hoặc Not Given).

BỘ THẺ TỪ VỰNG HỌC THUẬT ACADEMIC WORD LIST (FLASHCARDS):
- Trích xuất 6 - 8 từ vựng/collocations học thuật hay nhất trong bài đọc vào mảng "vocabularies" với đầy đủ: "word", "wordType", "phonetic" (IPA chuẩn), "vietnameseMeaning", "exampleSentence" (in đậm **word**), "cefrLevel" ("B2", "C1", "C2").

TARGET OUTPUT JSON SCHEMA:
Trả về DUY NHẤT một JSON object hợp lệ:
{
  "questions": [
    {
      "text": "Question prompt...",
      "options": [
        {"label": "A", "text": "Option A..."},
        {"label": "B", "text": "Option B..."},
        {"label": "C", "text": "Option C..."},
        {"label": "D", "text": "Option D..."}
      ],
      "correctAnswerIndex": 0,
      "explanation": "Dẫn chứng ở Đoạn B: '...' -> Giải thích chi tiết bằng tiếng Việt...",
      "skill": "reading",
      "subTopic": "IELTS Passage ${passageIndex}",
      "readingPassage": "Full text of the essay with [Paragraph A], [Paragraph B]..."
    }
  ],
  "vocabularies": [
    {
      "word": "mitigate",
      "wordType": "v",
      "phonetic": "/ˈmɪt.ɪ.ɡeɪt/",
      "vietnameseMeaning": "Làm giảm nhẹ, giảm bớt tác hại",
      "exampleSentence": "Scientists are researching methods to **mitigate** ocean acidification.",
      "cefrLevel": "C1"
    }
  ]
}`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey);
    return this.parseLanguageExamFromGeminiResponse(data);
  }

  async generateTHPTQuizFromPrompt({
    part1Count,
    part2Count,
    part3Count,
    subject,
    topics,
    difficulty,
    apiKey,
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi tạo đề.");
    }

    if (onProgress) onProgress(15, "Đang chuẩn bị tạo đề thi THPT Quốc gia bằng AI...");

    const cleanedTopics = (topics || "").trim();
    const difficultyStr = difficulty === "easy" ? "dễ" : difficulty === "medium" ? "trung bình" : "khó";

    // Subject-specific enhancements for diagram/formula requests
    let subjectEnhancement = "";
    const subjectInfo = THPT_SUBJECTS.find(s => s.id === subject) || THPT_SUBJECTS[0];
    if (subjectInfo.needsDiagrams) {
      subjectEnhancement += "- YÊU CẦU ĐẶC BIỆT: Mô tả ngắn gọn nội dung hình ảnh, đồ thị, sơ đồ, hoặc hình học TRỰC TIẾP TRONG trường 'text' khi cần thiết để minh họa câu hỏi. Ví dụ: '(Hình: tam giác vuông ABC với góc B = 90°)' hoặc '(Đồ thị: hàm số y = x^2 - 4x + 3)'. ";
    }
    if (subjectInfo.needsFormulas) {
      subjectEnhancement += "- CÔNG THỨC TOÁN, VẬT LÝ, HÓA HỌC: Giữ nguyên ký hiệu LaTeX trong dấu $...$ cho các công thức toán học, vật lý, hóa học. Ví dụ: $E = mc^2$, $a^2 + b^2 = c^2$, $CH_4 + 2O_2 \rightarrow CO_2 + 2H_2O$. ";
    }

    let promptText = `Bạn là chuyên gia khảo thí và biên soạn đề thi tốt nghiệp THPT Quốc gia theo cấu trúc 3 phần chuẩn của Bộ Giáo dục & Đào tạo.
YÊU CẦU TẠO ĐỀ THI:
- Môn thi: ${subject}
- PHẦN I: Trắc nghiệm 4 lựa chọn (0.25đ/câu): ${part1Count} câu
- PHẦN II: Trắc nghiệm Đúng/Sai 4 ý (1.0đ/câu): ${part2Count} câu
- PHẦN III: Trắc nghiệm trả lời ngắn (0.25đ/câu): ${part3Count} câu
- Chủ đề/chương: ${cleanedTopics || "ngẫu nhiên, tổng hợp theo chương trình THPT"}
- Mức độ khó: ${difficultyStr}
- Tuân thủ đúng chuẩn đánh giá của MOET (Bộ GD&ĐT)
${subjectEnhancement}

QUY TẮC BẮT BUỘC VỀ TRÍCH XUẤT VÀ CHỐNG TẠO CÂU HỎI RÁC/GIẢ:
1. CHỈ TẠO CÂU HỎI THẬT: Tạo ra các câu hỏi có tính giáo dục thực sự, không phải câu hỏi umieszcz.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT / TẠO CÂU HỎI GIẢ HOẶC PLACEHOLDER.
3. CÔNG THỨC TOÁN VÀ KÝ HIỆU: TUYỆT ĐỐI GIỮ NGUYÊN toàn bộ chuỗi LaTeX nguyên văn trong dấu $...$ — KHÔNG được sửa đổi, dịch hay viết lại công thức.
4. BẢNG DỮ LIỆU / BẢNG SỐ LIỆU / BẢNG BIẾN THIÊN: Giữ nguyên và định dạng dưới dạng bảng Markdown chuẩn.
5. BẢO TOÀN THỤT ĐẦU DÒNG VÀ ĐỊNH DẠNG CODE: Đối với các đoạn mã nguồn, BẮT BUỘC giữ nguyên 100% khoảng trắng thụt lề đầu dòng.
6. HÌNH ẢNH MINH HỌA VÀ ĐỒ THỊ: Nếu cần, mô tả ngắn gọn nội dung hình ảnh TRỰC TIẾP TRONG trường "text".
7. CÔNG THỨC VẬT LÝ & HÓA HỌC: Giữ nguyên ký hiệu hạt nhân, phân số, số mũ và chỉ số dưới.
8. TỰ ĐỘNG GHÉP VÀ CHUẨN HÓA TIẾNG VIỆT: Nếu chữ bị tách rời dấu, BẮT BUỘC ghép lại thành từ tiếng Việt chuẩn.

CẤU TRÚC 3 PHẦN BẮT BUỘC:
1. PHẦN I: Trắc nghiệm nhiều lựa chọn (chọn 1 trong 4 phương án A, B, C, D).
   - "part": "part1"
   - "questionType": "multipleChoice"
   - "text": "Nội dung câu hỏi..."
   - "options": [{"label": "A", "text": "..."}, {"label": "B", "text": "..."}, {"label": "C", "text": "..."}, {"label": "D", "text": "..."}]
   - "correctAnswerIndex": 0 đến 3 (0=A, 1=B, 2=C, 3=D)
   - "pointValue": 0.25
   - "explanation": "Giải thích chi tiết phương pháp giải..."

2. PHẦN II: Trắc nghiệm Đúng / Sai (mỗi câu gồm 4 ý khẳng định a, b, c, d).
   - "part": "part2"
   - "questionType": "trueFalseGroup"
   - "text": "Nội dung câu hỏi dẫn..."
   - "subItems": [
       {"label": "a", "text": "Khẳng định a...", "isCorrect": true hoặc false},
       {"label": "b", "text": "Khẳng định b...", "isCorrect": true hoặc false},
       {"label": "c", "text": "Khẳng định c...", "isCorrect": true hoặc false},
       {"label": "d", "text": "Khẳng định d...", "isCorrect": true hoặc false}
     ]
   - "pointValue": 1.0

3. PHẦN III: Trắc nghiệm trả lời ngắn (tự điền kết quả / giá trị số).
   - "part": "part3"
   - "questionType": "shortAnswer"
   - "text": "Nội dung câu hỏi yêu cầu tính toán..."
   - "shortAnswer": "Đáp án chính xác (ví dụ: 12.5, -4, 2/3)"
   - "acceptedAnswers": ["12.5", "12,5"] (nhận dạng cả dấu chấm và dấu phẩy)
   - "pointValue": 0.25

Target Output JSON Schema:
Trả về DUY NHẤT một mảng JSON hợp lệ chứa các câu hỏi theo schema trên (không dùng markdown code blocks).

Nội dung hướng dẫn chi tiết: Hãy tạo đề thi THPT Quốc gia dựa trên kiến thức của bạn về các chủ đề: ${cleanedTopics || "tổng hợp theo chương trình THPT"}.
`;

    if (onProgress) onProgress(30, "Đang giao tiếp với Gemini AI để tạo câu hỏi...");

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    if (onProgress) onProgress(50, "Đang đợi phản hồi từ Gemini AI...");

    const data = await this.callGeminiAPI(payload, apiKey);
    const questions = this.parseTHPTQuestionsFromGeminiResponse(data); // Parse THPT questions

    if (onProgress) onProgress(90, "Đang xử lý và validating câu hỏi...");

    if (onProgress) onProgress(98, "Đang hoàn tất bộ đề thi THPT Quốc gia...");

    return questions;
  }

  // Helper method to extract vocabulary from generated questions (for language learning mode)
  extractVocabularyFromQuestions(questions) {
    const vocabularies = [];
    const wordSet = new Set();

    // Extract potential vocabulary words from question text and options
    const extractWordsFromText = (text) => {
      if (!text) return [];
      // Match English words (3+ characters)
      const wordMatches = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      return wordMatches.filter(word =>
        !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
      );
    };

    questions.forEach(q => {
      // Extract from question text
      const wordsFromText = extractWordsFromText(q.text);
      wordsFromText.forEach(word => {
        if (!wordSet.has(word)) {
          wordSet.add(word);
          vocabularies.push({
            word: word,
            wordType: "", // Would need POS tagging for accuracy
            phonetic: "",
            vietnameseMeaning: "", // Would need translation
            exampleSentence: "",
            cefrLevel: "B1" // Default, would need proper assessment
          });
        }
      });

      // Extract from options
      q.options.forEach(option => {
        const wordsFromOption = extractWordsFromText(option.text);
        wordsFromOption.forEach(word => {
          if (!wordSet.has(word)) {
            wordSet.add(word);
            vocabularies.push({
              word: word,
              wordType: "",
              phonetic: "",
              vietnameseMeaning: "",
              exampleSentence: "",
              cefrLevel: "B1"
            });
          }
        });
      });
    });

    // Limit to reasonable number
    return vocabularies.slice(0, 20);
  }

}

export const geminiService = new GeminiAPIService();
