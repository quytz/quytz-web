/**
 * QuizMaster Web - Google Gemini AI Client Service
 * 100% Client-Side API Integration (Direct to Google AI Studio)
 * Exclusively uses Gemini 3.5 Flash Lite
 */
import { APP_CONFIG } from "../config.js";
import { createQuestion, createQuestionOption, createSubItem, createVocabularyCard } from "../models/types.js";
import { documentParser } from "./document-parser.js";

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

class GeminiAPIService {
  constructor() {
    this.model = "gemini-3.5-flash-lite";
  }

  async validateAPIKey(apiKey) {
    const key = (apiKey || "").trim();
    if (!key) return false;

    const url = `${APP_CONFIG.geminiBaseUrl}/${this.model}:generateContent?key=${key}`;
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
      console.warn(`Validate API key failed for ${this.model}:`, e);
    }
    return false;
  }

  async generateQuiz({
    documentText,
    isCreateMultipleChoice = false,
    apiKey,
    language = "vi",
    depthMode = "normal",
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi quét.");
    }

    const cleanedText = documentText.trim();
    if (!cleanedText) return [];

    if (onProgress) onProgress(15, "Đang phân tích cấu trúc tài liệu...");

    const chunkSize = 13000;
    if (cleanedText.length > chunkSize) {
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
            isCreateMultipleChoice,
            apiKey: key,
            language,
            depthMode
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
      isCreateMultipleChoice,
      apiKey: key,
      language,
      depthMode
    });
    if (onProgress) onProgress(98, "Đang hoàn tất bộ câu hỏi...");
    return res;
  }

  async generateQuizSingleBatch({
    documentText,
    isCreateMultipleChoice,
    apiKey,
    language,
    depthMode
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
      promptText = `You are an expert document OCR quiz extractor. Extract ALL real, pre-existing questions, answer options (A, B, C, D), correct answer indexes (0-based integer), and explanations found in the document.

${targetLangInstruction}

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

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: isCreateMultipleChoice ? 0.3 : 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey);
    return this.parseQuestionsFromGeminiResponse(data, isCreateMultipleChoice);
  }

  async generateLanguageExam({
    documentText,
    targetCEFR = "ALL",
    apiKey,
    onProgress = null
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi quét.");
    }

    const cleanedText = documentText.trim();
    if (!cleanedText) return { questions: [], vocabularies: [], detectedDurationMinutes: null };

    if (onProgress) onProgress(15, "Đang phân tích cấu trúc đề thi ngoại ngữ...");

    const chunkSize = 13000;
    if (cleanedText.length > chunkSize) {
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
            targetCEFR,
            apiKey: key
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
      targetCEFR,
      apiKey: key
    });
    if (onProgress) onProgress(98, "Đang hoàn tất bộ đề thi ngoại ngữ...");
    return res;
  }

  async generateLanguageExamSingleBatch({ documentText, targetCEFR, apiKey }) {
    const cefrFilter = targetCEFR === "ALL"
      ? "Extract vocabulary words across CEFR levels (A1 to C2) found in the test."
      : `Focus vocabulary extraction on words around CEFR level ${targetCEFR} or higher.`;

    const promptText = `You are a master English linguistics professor and exam parser specializing in Vietnamese National High School Graduation Exams ("Đề thi tốt nghiệp THPT môn Tiếng Anh"), IELTS, and CEFR-aligned standardized language tests.

Analyze the provided document text and perform two tasks in a single JSON response:

CRITICAL ACCURACY & WORD ORDER RULES:
1. PRESERVE ORIGINAL WORD ORDER: Maintain the exact natural word sequence and grammatical structure for all questions, reading passages, and options. Do not scramble words.
2. EXTRACT ALL QUESTIONS IN THE PROVIDED CHUNK: Do not omit or truncate any question.
3. PRESERVE OPTION ORDER: Keep options (A, B, C, D) in their exact original sequence.

TASK 1: Extract all Exam Questions into structured sections:
- Detect if the document states an allotted exam time (e.g. "Thời gian làm bài: 50 phút", "Time allowed: 60 minutes"). If found, set "durationMinutes" to that integer. If not found, set "durationMinutes" to null.
- Identify the skill of each question: "reading" (Reading comprehension / Đọc hiểu), "listening" (Nghe hiểu), "lexical" (Grammar, Vocabulary, Pronunciation, Stress / Ngữ âm, Trọng âm, Tìm lỗi sai, Điền từ vào đoạn văn / Cloze test), or "general".
- CRITICAL RULE FOR READING & CLOZE TEST PASSAGES:
  * If a group of questions belongs to a Reading passage or a Cloze test passage (điền từ vào đoạn văn), extract the FULL passage text and attach it to the "readingPassage" field of EVERY question belonging to that passage.
  * For each individual question belonging to a Reading/Cloze passage, DO NOT REPEAT the passage in "text". Instead, set "text" strictly to the specific question prompt, blank reference or instruction. KEEP THE QUESTION BOX CLEAN AND SHORT!
- TARGET MARKINGS & UNDERLINES IN LEXICAL QUESTIONS:
  * Many lexical questions in Vietnamese exams target specific underlined, bolded, or opposite/closest meaning words.
  * You MUST preserve and format target words with Markdown **bold**, _italics_, or [underlined] brackets in both "text" and "options".
- Preserve all IPA pronunciation symbols, phonetic slashes (e.g. /ə/, /ɪ/, /eɪ/), and Vietnamese explanations faithfully without character corruption.
- Set "correctAnswerIndex" as a 0-based integer (0 for A, 1 for B, 2 for C, 3 for D).

TASK 2: Extract a High-Yield Vocabulary, Idioms & Phrasal Verbs Deck from the exam for flashcard study:
- ${cefrFilter}
- IN ADDITION TO INDIVIDUAL WORDS, YOU MUST SYSTEMATICALLY EXTRACT:
  * Idiomatic expressions with "wordType": "idiom"
  * Phrasal verbs & Collocations with "wordType": "phr v" or "collocation"
  * Advanced / Key vocabulary words
- For each target item, provide:
  1. "word": Root word, phrase, idiom, or phrasal verb
  2. "wordType": Part of speech or category in short notation (e.g. "n", "v", "adj", "adv", "idiom", "phr v")
  3. "phonetic": Accurate IPA pronunciation with slashes (e.g. "/ˌʌn.dɚˈmɑɪn/")
  4. "vietnameseMeaning": Clear, concise Vietnamese translation
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
      "explanation": "Detailed explanation...",
      "skill": "reading",
      "subTopic": "Đọc hiểu",
      "readingPassage": "Full reading passage text here..."
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

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16384,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey);
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

  async callGeminiAPI(payload, apiKey) {
    const url = `${APP_CONFIG.geminiBaseUrl}/${this.model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status} (${this.model}): ${errBody}`);
    }

    return await response.json();
  }

  splitDocumentIntoChunks(text, targetChunkSize) {
    if (text.length <= targetChunkSize) return [text];

    const lines = text.split("\n");
    const chunks = [];
    let currentChunk = "";
    const questionRegex = /^(?:câu|question|bài|q)\s*\d+[\.:\s]/i;

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
      // Find array bounds
      const firstBracket = clean.indexOf("[");
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

      // Find object bounds
      const firstBrace = clean.indexOf("{");
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
      if (Array.isArray(item.options)) {
        item.options.forEach((opt, idx) => {
          let text = typeof opt === "string" ? opt : (opt.text || opt.content || opt.option || "");
          if (text.length >= 2 && text[1] === ".") {
            text = text.substring(2).trim();
          }
          rawOptions.push(createQuestionOption(labels[idx] || `${idx + 1}`, text));
        });
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

      questions.push(createQuestion({
        text: restoreImageTokens(qText),
        options: finalOptions.map(opt => ({ ...opt, text: restoreImageTokens(opt.text) })),
        correctAnswerIndex: finalCorrectIndex,
        explanation: restoreImageTokens(item.explanation || item.explain || item.detail || ""),
        skill: item.skill || null,
        subTopic: item.subTopic || null,
        readingPassage: restoreImageTokens(item.readingPassage || "") || null
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

  parseLanguageExamFromGeminiResponse(data) {
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

    const rawVocabs = parsed.vocabularies || parsed.vocabulary || [];
    if (Array.isArray(rawVocabs)) {
      rawVocabs.forEach(v => {
        if (v.word && v.word.trim()) {
          vocabularies.push(createVocabularyCard({
            word: v.word.trim(),
            wordType: v.wordType || "",
            phonetic: v.phonetic || "",
            vietnameseMeaning: v.vietnameseMeaning || "",
            exampleSentence: v.exampleSentence || "",
            cefrLevel: (v.cefrLevel || "B1").toUpperCase()
          }));
        }
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

  async generateTHPTSectionBatch({ sectionPart, documentText, apiKey, images = [] }) {
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

    const promptText = `Bạn là chuyên gia khảo thí và biên soạn đề thi tốt nghiệp THPT Quốc gia theo cấu trúc chuẩn của Bộ Giáo dục & Đào tạo.

${sectionInstruction}

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
}

export const geminiService = new GeminiAPIService();
