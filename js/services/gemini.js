/**
 * QuizMaster Web - Google Gemini AI Client Service
 * 100% Client-Side API Integration (Direct to Google AI Studio)
 * Exclusively uses Gemini 3.5 Flash Lite
 */
import { APP_CONFIG } from "../config.js";
import { createQuestion, createQuestionOption, createVocabularyCard } from "../models/types.js";

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
    depthMode = "normal"
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi quét.");
    }

    const cleanedText = documentText.trim();
    if (!cleanedText) return [];

    const chunkSize = 13000;
    if (cleanedText.length > chunkSize) {
      const chunks = this.splitDocumentIntoChunks(cleanedText, chunkSize);
      let allQuestions = [];
      const seenTexts = new Set();
      let lastError = null;

      for (const chunk of chunks) {
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
        }
      }

      if (allQuestions.length > 0) return allQuestions;
      if (lastError) throw lastError;
    }

    return await this.generateQuizSingleBatch({
      documentText: cleanedText,
      isCreateMultipleChoice,
      apiKey: key,
      language,
      depthMode
    });
  }

  async generateQuizSingleBatch({
    documentText,
    isCreateMultipleChoice,
    apiKey,
    language,
    depthMode
  }) {
    const targetLangInstruction = language === "en"
      ? "STRICT LANGUAGE REQUIREMENT: Write ALL questions, options, and explanations in ENGLISH."
      : "YÊU CẦU NGÔN NGỮ BẮT BUỘC: Viết BẮT BUỘC TOÀN BỘ câu hỏi, các phương án lựa chọn và phần giải thích bằng TIẾNG VIỆT.";

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
      promptText = `You are an expert document OCR quiz extractor. Extract ALL pre-existing questions, answer options (A, B, C, D), correct answer indexes (0-based integer), and explanations found in the document.

${targetLangInstruction}

CRITICAL EXTRACTION INTEGRITY RULES:
1. MANDATORY FULL EXTRACTION: You MUST extract ALL questions present in the document from beginning to end. DO NOT stop after 4 questions! If there are 10, 20, 40, or 50 questions in the document, extract EVERY SINGLE ONE of them without omitting or summarizing any.
2. WORD-FOR-WORD FIDELITY: Extract the exact sentence structure, question text, options, and explanations from the document word-for-word without changing the word order.
3. PRESERVE ORIGINAL OPTION ORDER: Keep option A, B, C, D in their original sequence.
4. Set "correctAnswerIndex" as a 0-based integer (0 for A, 1 for B, 2 for C, 3 for D).

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
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };

    const data = await this.callGeminiAPI(payload, apiKey);
    return this.parseQuestionsFromGeminiResponse(data, isCreateMultipleChoice);
  }

  async generateLanguageExam({
    documentText,
    targetCEFR = "ALL",
    apiKey
  }) {
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error("Vui lòng cấu hình Google AI Studio API Key trong Cài đặt trước khi quét.");
    }

    const cleanedText = documentText.trim();
    if (!cleanedText) return { questions: [], vocabularies: [], detectedDurationMinutes: null };

    const chunkSize = 13000;
    if (cleanedText.length > chunkSize) {
      const chunks = this.splitDocumentIntoChunks(cleanedText, chunkSize);
      let allQuestions = [];
      let allVocabs = [];
      let detectedDuration = null;
      const seenQ = new Set();
      const seenW = new Set();
      let lastError = null;

      for (const chunk of chunks) {
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
        }
      }

      if (allQuestions.length > 0) {
        return {
          questions: allQuestions,
          vocabularies: allVocabs,
          detectedDurationMinutes: detectedDuration
        };
      }
      if (lastError) throw lastError;
    }

    return await this.generateLanguageExamSingleBatch({
      documentText: cleanedText,
      targetCEFR,
      apiKey: key
    });
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
        maxOutputTokens: 8192,
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
    const targetLang = language === "en" ? "ENGLISH" : "VIETNAMESE";

    const promptText = `You are an expert academic tutor. A student is asking for a detailed explanation regarding the following multiple-choice question.

Language Requirement: Respond in ${targetLang}.

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
      const qText = item.text || item.question || item.prompt || item.title || "";
      if (!qText.trim()) continue;

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

      if (rawOptions.length === 0) {
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
        text: qText,
        options: finalOptions,
        correctAnswerIndex: finalCorrectIndex,
        explanation: item.explanation || item.explain || item.detail || "",
        skill: item.skill || null,
        subTopic: item.subTopic || null,
        readingPassage: item.readingPassage || null
      }));
    }

    return questions;
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
}

export const geminiService = new GeminiAPIService();
