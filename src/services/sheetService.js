// 🔴 IMPORTANT: Google Script Deploy karke jo URL mile, use yahan paste karein
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_akCjVZ-TrUkl1WQUx_EJ3FEAJ4z5Wu-ICNhEHo_8ctd9hZ8k3yZ7yR73UVqwUVl2/exec";

export const sheetService = {
  // --- 1. NOTES (AI Generated) ---
  saveNote: async (data) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: 'note' }),
      });
      return true;
    } catch (error) {
      console.error("Note Save Error:", error);
      return false;
    }
  },

  getNotes: async (videoId) => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getNotes&videoId=${videoId}`);
      const json = await response.json();
      return json.data; // Returns { title, content } or null
    } catch (error) {
      console.error("Note Fetch Error:", error);
      return null;
    }
  },

  // --- 2. COMMENTS / DISCUSSIONS ---
  getComments: async (videoId) => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getComments&videoId=${videoId}`);
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      return [];
    }
  },

  // --- 3. SAVE INTERACTIONS (Comments/Doubts) ---
  saveInteraction: async (data) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  // --- 4. DOUBTS ---
  getMyDoubts: async (videoId, userId) => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getDoubts&videoId=${videoId}&userId=${userId}`);
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      return [];
    }
  },

  // --- 5. QUIZ ---
  getQuiz: async (videoId) => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getQuiz&videoId=${videoId}`);
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      return [];
    }
  },

  saveQuizScore: async (data) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: 'quiz_score' }),
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  getQuizResult: async (studentId, videoTitle) => {
    try {
      const encodedTitle = encodeURIComponent(videoTitle);
      const response = await fetch(`${SCRIPT_URL}?action=getQuizResult&studentId=${studentId}&videoTitle=${encodedTitle}`);
      const json = await response.json();
      return json.data; 
    } catch (error) {
      return null;
    }
  },
  // ... purane functions ke neeche add karein ...

  saveQuizQuestions: async (videoId, questions) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: 'save_quiz', 
          videoId: videoId, 
          questions: questions 
        }),
      });
      return true;
    } catch (error) {
      return false;
    }
  }
};