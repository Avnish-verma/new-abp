import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 1. API Keys Rotation Logic
 * Multiple keys use karne se rate limits ki problem nahi aati.
 */
const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY1,
  import.meta.env.VITE_GEMINI_API_KEY2,
  import.meta.env.VITE_GEMINI_API_KEY3,
  import.meta.env.VITE_GEMINI_API_KEY4,
  import.meta.env.VITE_GEMINI_API_KEY5
].filter(Boolean);

// Randomly ek key aur model select karne ke liye helper
const getModel = () => {
  const key = API_KEYS[Math.floor(Math.random() * API_KEYS.length)] || "";
  const genAI = new GoogleGenerativeAI(key);
  // Using gemini-2.5-flash-preview-09-2025 for best performance in preview
  return genAI.getGenerativeModel(
    { model: "gemini-2.5-flash-preview-09-2025" },
    { apiVersion: "v1beta" }
  );
};

/**
 * 2. Specialized AI Functions (Named Exports)
 */

// Function for WatchVideo doubts
export const askDoubts = async (question, context) => {
  try {
    const model = getModel();
    const { videoTitle, subject, currentTimestamp } = context;
    const prompt = `
      System Role: You are an expert teacher for ${subject || 'General Studies'}.
      Context: Student is watching "${videoTitle}" at ${currentTimestamp}s.
      Question: "${question}"
      Instructions: Answer simply in Hinglish (Hindi+English) under 150 words.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("askDoubts Error:", error);
    return "Doubt solve karne mein dikkat aa rahi hai. Kripya dobara koshish karein.";
  }
};

/**
 * Updated: Infinite AI Quiz
 * Ab AI sirf 'videoTitle' ko analyze karega aur Class/Chapter/Topic khud nikal lega.
 */
export const generateInfiniteQuiz = async (config, videoTitle) => {
  try {
    const model = getModel();
    const prompt = `
      Task: Create ${config.count} MCQs based on the following video title.
      Video Title: "${videoTitle}"
      Difficulty: ${config.difficulty}

      Instructions:
      1. Analyze the Video Title to automatically identify the Class, Subject, Chapter, and Topic.
      2. Generate high-quality questions that are strictly relevant to the identified topic.
      3. The questions should be suitable for the academic level implied in the title.
      4. Return ONLY a valid JSON array with this structure:
      [{ "question": "str", "optionA": "str", "optionB": "str", "optionC": "str", "optionD": "str", "correct": "A", "chapter": "str", "subtopic": "str" }]
    `;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("generateInfiniteQuiz Error:", error);
    throw error;
  }
};

/**
 * ✨ FIX: Image ya PDF se Quiz generate karne ke liye function
 */
export const generateQuizFromAI = async (fileBase64, mimeType) => {
  try {
    const model = getModel();
    const prompt = `
      Analyze this educational document and create 5 multiple-choice questions (MCQs).
      Return ONLY a JSON array with this structure:
      [{ "question": "", "optionA": "", "optionB": "", "optionC": "", "optionD": "", "correct": "A" }]
      Ensure the output is valid JSON and contains no other text.
    `;

    // Multi-modal input (Text + Image/PDF)
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Quiz Error:", error);
    return null;
  }
};

// Function for Smart Hints
export const getQuizHint = async (questionObj) => {
  try {
    const model = getModel();
    const prompt = `Provide a helpful hint for this question: "${questionObj.question}". Don't give the answer. Language: Hinglish.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Think about the main concept discussed in the video.";
  }
};

// Function for AI Performance Feedback
export const getPerformanceFeedback = async (score, total, topic) => {
  try {
    const model = getModel();
    const prompt = `Student scored ${score}/${total} in a quiz on "${topic}". Give encouraging feedback and 1 study tip in Hinglish.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Good effort! Keep practicing to improve.";
  }
};

/**
 * Exporting a default object for compatibility
 */
export const geminiService = {
  askDoubts,
  generateInfiniteQuiz,
  generateQuizFromAI,
  getQuizHint,
  getPerformanceFeedback
};