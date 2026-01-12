import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, AlertCircle, Trophy, RefreshCcw, 
  Loader2, Sparkles, Brain, Lightbulb, ChevronRight,
  BookOpen, Layers, FileText, Upload, Settings2, Info
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * QuizSection Component
 * Focused on Google Sheets storage (Full Service) and Gemini AI features.
 */

// --- Global Configuration ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_akCjVZ-TrUkl1WQUx_EJ3FEAJ4z5Wu-ICNhEHo_8ctd9hZ8k3yZ7yR73UVqwUVl2/exec";

// Unified Sheet Service (In-file to avoid import issues)
export const sheetService = {
  // NOTES
  getNotes: async (videoId) => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getNotes&videoId=${videoId}`);
      const json = await response.json();
      return json.data; // { title, content }
    } catch (error) {
      console.error("Note Fetch Error:", error);
      return null;
    }
  },
  saveNote: async (data) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: 'note' }),
      });
      return true;
    } catch (error) { return false; }
  },
  // QUIZ
  getQuiz: async (videoId) => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getQuiz&videoId=${videoId}`);
      const json = await response.json();
      return json.data || [];
    } catch (error) { return []; }
  },
  getPreviousResult: async (studentId, title) => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getQuizResult&studentId=${studentId}&videoTitle=${encodeURIComponent(title)}`);
      const json = await response.json();
      return json.data; 
    } catch (error) { return null; }
  },
  saveResult: async (data) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: 'quiz_score' }),
      });
      return true;
    } catch (error) { return false; }
  }
};

const QuizSection = ({ videoId, videoTitle, user }) => {
  const apiKey = ""; // Gemini API Key
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('selection'); 
  const [quizMode, setQuizMode] = useState('regular'); 
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [savingResult, setSavingResult] = useState(false);
  
  const [previousScore, setPreviousScore] = useState(null);
  const [hint, setHint] = useState("");
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [infConfig, setInfConfig] = useState({ count: 5, difficulty: 'moderate' });

  // --- Gemini AI Helper ---
  const callGemini = async (prompt, systemInstruction = "", inlineData = null) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" }, { apiVersion: "v1beta" });
    
    const parts = [{ text: prompt }];
    if (inlineData) parts.push({ inlineData });

    for (let i = 0; i < 5; i++) {
      try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: parts }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
        });
        const response = await result.response;
        return response.text();
      } catch (err) {
        if (i === 4) throw err;
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
  };

  // --- Initial Data Load ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!videoId) return;
      setLoading(true);
      try {
        if (user?.uid) {
            const prev = await sheetService.getPreviousResult(user.uid, videoTitle);
            if (prev) setPreviousScore(prev.score);
        }
        const sheetQs = await sheetService.getQuiz(videoId);
        setQuestions(sheetQs || []);
      } catch (err) { 
          console.error("Initial Load Error:", err); 
      } finally {
          setLoading(false);
      }
    };
    loadInitialData();
  }, [videoId, user?.uid]);

  const handleOptionSelect = (option) => {
    setUserAnswers({ ...userAnswers, [currentIndex]: option });
  };

  const startRegularQuiz = async () => {
    if (questions.length > 0) {
      setQuizMode('regular');
      setCurrentIndex(0); setUserAnswers({}); setScore(0); setHint(""); setCurrentStep('playing');
    } else {
      alert("Is video ke liye Sheet mein koi quiz nahi mila.");
    }
  };

  const startInfiniteQuiz = async () => {
    setIsGenerating(true);
    const prompt = `Create MCQs based on: "${videoTitle}". Count: ${infConfig.count}, Difficulty: ${infConfig.difficulty}. JSON array: [{ "question": "str", "optionA": "str", "optionB": "str", "optionC": "str", "optionD": "str", "correct": "A" }]`;
    try {
      const resText = await callGemini(prompt, "Return raw JSON only.");
      const cleanedJson = resText.replace(/```json|```/g, "").trim();
      setQuestions(JSON.parse(cleanedJson));
      setQuizMode('infinite');
      setCurrentIndex(0); setUserAnswers({}); setScore(0); setHint(""); setCurrentStep('playing');
    } catch (err) { alert("AI error!"); }
    finally { setIsGenerating(false); }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const prompt = `Analyze document and create MCQs. Raw JSON array: [{ "question": "str", "optionA": "str", "optionB": "str", "optionC": "str", "optionD": "str", "correct": "A" }]`;
        const res = await callGemini(prompt, "Return raw JSON.", { data: base64, mimeType: file.type });
        const aiQs = JSON.parse(res.replace(/```json|```/g, "").trim());
        setQuestions(aiQs);
        setQuizMode('document');
        setCurrentIndex(0); setUserAnswers({}); setScore(0); setHint(""); setCurrentStep('playing');
      };
    } catch (err) { alert("Document error."); }
    finally { setUploadLoading(false); }
  };

  const fetchHint = async () => {
    if (isHintLoading) return;
    setIsHintLoading(true);
    try {
      const h = await callGemini(`Short Hinglish hint for: "${questions[currentIndex].question}". No answer.`);
      setHint(h);
    } catch (e) { setHint("Think about the basics."); }
    finally { setIsHintLoading(false); }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setHint("");
    } else {
      let finalScore = 0;
      questions.forEach((q, idx) => { if (userAnswers[idx] === q.correct) finalScore++; });
      setScore(finalScore);
      setCurrentStep('result');
      try {
        const feedback = await callGemini(`Scored ${finalScore}/${questions.length} on "${videoTitle}". Feedback in Hinglish.`);
        setAiFeedback(feedback);
      } catch (e) { setAiFeedback("Excellent attempt!"); }
      if (quizMode === 'regular') saveToSheet(finalScore);
    }
  };

  const saveToSheet = async (finalScore) => {
    setSavingResult(true);
    try {
      await sheetService.saveResult({
        studentId: user?.uid || 'anonymous',
        studentName: user?.displayName || 'Student',
        videoTitle, videoId, score: finalScore,
        total: questions.length, timestamp: new Date().toLocaleString()
      });
    } catch (err) { console.error(err); }
    finally { setSavingResult(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-blue-500" size={32} />
      <p className="text-xs font-black text-slate-400 uppercase italic tracking-widest">Connecting to Sheets...</p>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6">
      {currentStep === 'selection' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          {/* Card 1: Regular Quiz */}
          <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter italic">
                  <CheckCircle2 className="text-blue-500" size={20}/> Sheet Quiz
                </h3>
                {previousScore !== null && <span className="bg-green-100 text-green-700 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-green-200">Done</span>}
              </div>
              {previousScore !== null ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center mb-6">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Last Score</p>
                    <p className="text-2xl font-black text-slate-800">{previousScore}/{questions.length}</p>
                </div>
              ) : (
                <div className="bg-blue-50/40 p-5 rounded-2xl border-2 border-dashed border-blue-100 text-center mb-6">
                   <p className="text-xs text-blue-600 font-bold italic tracking-tight uppercase">Start to update records!</p>
                </div>
              )}
              <button onClick={startRegularQuiz} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition">
                {previousScore !== null ? 'Try Again' : 'Start Assessment'}
              </button>
            </div>
          </div>

          {/* Card 2: Document Quiz */}
          <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-indigo-200 shadow-sm relative overflow-hidden group">
            <div className="relative flex flex-col items-center text-center">
              <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600 mb-4">
                {uploadLoading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24}/>}
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tighter italic text-sm mb-1">Notes to Quiz</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">PDF/PNG AI Builder</p>
              <input type="file" ref={fileInputRef} onChange={handleDocumentUpload} className="hidden" accept="image/*,application/pdf" />
              <button onClick={() => fileInputRef.current.click()} disabled={uploadLoading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2">
                {uploadLoading ? "Analyzing..." : <><Upload size={16}/> Upload Notes</>}
              </button>
            </div>
          </div>

          {/* Card 3: Infinite AI Quiz */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <Brain className="absolute top-4 right-4 opacity-10" size={100} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-8">
                <Sparkles className="text-yellow-300 animate-pulse" size={24}/>
                <h3 className="font-black text-lg uppercase italic">AI Practice</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-60">Level</label>
                  <select className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-bold" value={infConfig.difficulty} onChange={e => setInfConfig({...infConfig, difficulty: e.target.value})}>
                    <option value="easy" className="text-slate-900">Easy</option>
                    <option value="moderate" className="text-slate-900">Moderate</option>
                    <option value="hard" className="text-slate-900">Hard</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-60">Count</label>
                  <input type="number" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-bold" value={infConfig.count} onChange={e => setInfConfig({...infConfig, count: parseInt(e.target.value)})} />
                </div>
              </div>
              <button disabled={isGenerating} onClick={startInfiniteQuiz} className="w-full bg-white text-indigo-700 py-4 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-3">
                {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <><Brain size={18}/> Generate Set</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING SCREEN */}
      {currentStep === 'playing' && questions[currentIndex] && (
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-2xl animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-8">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Q {currentIndex + 1} / {questions.length}</span>
            <div className="flex-1 h-2 bg-slate-50 rounded-full mx-6 overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
            </div>
            <button onClick={() => setCurrentStep('selection')} className="text-slate-300 hover:text-red-500"><RefreshCcw size={18}/></button>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-10 leading-tight">{questions[currentIndex].question}</h3>
          <div className="space-y-4 mb-10">
            {['A', 'B', 'C', 'D'].map((key) => (
              <button key={key} onClick={() => handleOptionSelect(key)} className={`w-full text-left p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${userAnswers[currentIndex] === key ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-50 hover:border-slate-200'}`}>
                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${userAnswers[currentIndex] === key ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{key}</span>
                <span className={`text-base font-bold ${userAnswers[currentIndex] === key ? 'text-indigo-900' : 'text-slate-600'}`}>{questions[currentIndex][`option${key}`]}</span>
              </button>
            ))}
          </div>
          <div className="mb-10">
            {hint ? (
              <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 flex gap-4 animate-in slide-in-from-top-2">
                <Lightbulb className="text-amber-500 shrink-0" size={24}/><p className="text-xs text-amber-700 font-bold italic">{hint}</p>
              </div>
            ) : (
              <button onClick={fetchHint} disabled={isHintLoading} className="text-[11px] font-black text-indigo-500 uppercase flex items-center gap-2 p-2">{isHintLoading ? <Loader2 className="animate-spin" size={14}/> : <><Sparkles size={14}/> Ask AI Hint</>}</button>
            )}
          </div>
          <button disabled={!userAnswers[currentIndex]} onClick={handleNext} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest active:scale-95 transition">Finish</button>
        </div>
      )}

      {/* RESULT SCREEN */}
      {currentStep === 'result' && (
        <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-50 shadow-2xl text-center animate-in zoom-in-95">
          <Trophy size={48} className="text-amber-500 mx-auto mb-8 animate-bounce" />
          <h2 className="text-3xl font-black text-slate-800 mb-2 italic">Session Complete!</h2>
          <div className="grid grid-cols-2 gap-4 mb-10 mt-10">
            <div className="bg-slate-50 p-6 rounded-[2rem] border"><p className="text-[10px] font-black text-slate-400 mb-2 uppercase">Score</p><p className="text-4xl font-black text-slate-800">{score}/{questions.length}</p></div>
            <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100"><p className="text-[10px] font-black text-green-400 mb-2 uppercase">Accuracy</p><p className="text-4xl font-black text-green-600">{Math.round((score / questions.length) * 100)}%</p></div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[3rem] text-left mb-10 relative overflow-hidden">
            <Sparkles className="absolute -top-6 -right-6 text-white/5" size={120} />
            <p className="text-[11px] font-black text-indigo-400 uppercase mb-4 flex items-center gap-2"><Brain size={14}/> AI Analyst</p>
            <p className="text-sm text-white/90 font-medium italic">{aiFeedback || "Processing feedback..."}</p>
          </div>
          <button onClick={() => setCurrentStep('selection')} className="w-full bg-slate-100 text-slate-900 py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-md">Go Back</button>
          {savingResult && <p className="text-[10px] text-blue-500 mt-6 animate-pulse font-black uppercase italic">Syncing with Sheet...</p>}
        </div>
      )}
    </div>
  );
};

export default QuizSection;