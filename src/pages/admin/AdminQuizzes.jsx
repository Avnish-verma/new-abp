import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // Fixed: Resolved path from lib/firebase to firebase
import { collection, getDocs } from 'firebase/firestore';
import { sheetService } from '../../services/sheetService';
import { generateQuizFromAI } from '../../services/geminiService';
import { Plus, Trash2, Save, FileType, Cpu } from 'lucide-react';

const AdminQuizzes = () => {
  const [batches, setBatches] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');

  const [builderType, setBuilderType] = useState('manual'); // 'manual' ya 'ai'
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Batches aur Videos load karein
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const snap = await getDocs(collection(db, "batches"));
        setBatches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Batches load karne me error:", error);
      }
    };
    fetchBatches();
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    const batch = batches.find(b => b.id === selectedBatch);
    let vids = [];
    if (batch?.syllabus) {
      Object.values(batch.syllabus).forEach(chaps => {
        Object.values(chaps).forEach(items => {
          items.forEach(i => { if (i.type === 'video') vids.push(i); });
        });
      });
    }
    setVideos(vids);
  }, [selectedBatch, batches]);

  // --- MANUAL METHODS ---
  const addManualQuestion = () => {
    setQuestions([...questions, { question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: 'A' }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // --- AI METHOD ---
  const handleAIUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const aiQuestions = await generateQuizFromAI(base64, file.type);
        if (aiQuestions) {
          setQuestions([...questions, ...aiQuestions]);
        } else {
          alert("AI quiz generate karne me asafal raha. Dobara koshish karein.");
        }
      } catch (error) {
        alert("File process karne me error aaya.");
      }
      setLoading(false);
    };
  };

  // --- SAVE TO SHEET ---
  const handleSave = async () => {
    if (!selectedVideoId || questions.length === 0) {
      alert("Kripya video select karein aur sawal jodein!");
      return;
    }
    setLoading(true);
    try {
      const success = await sheetService.saveQuizQuestions(selectedVideoId, questions);
      if (success) {
        alert("Quiz Google Sheet me save ho gaya!");
        setQuestions([]);
      } else {
        alert("Sheet me save karne me error aaya.");
      }
    } catch (error) {
      alert("Server se connect karne me dikkat aa rahi hai.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Quiz Builder</h1>

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Batch Select Karein</label>
          <select className="w-full border p-2 rounded-lg outline-none focus:ring-2 ring-blue-500" onChange={e => setSelectedBatch(e.target.value)}>
            <option value="">Select Batch</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Video Select Karein</label>
          <select className="w-full border p-2 rounded-lg outline-none focus:ring-2 ring-blue-500" onChange={e => setSelectedVideoId(e.target.value)}>
            <option value="">Select Video (Quiz isse link hoga)</option>
            {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        </div>
      </div>

      {/* Builder Toggle */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setBuilderType('manual')} 
          className={`flex-1 p-3 rounded-xl font-bold border transition flex items-center justify-center gap-2 ${builderType === 'manual' ? 'bg-blue-600 text-white shadow-lg border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
           <Plus size={18}/> Manual Create
        </button>
        <button 
          onClick={() => setBuilderType('ai')} 
          className={`flex-1 p-3 rounded-xl font-bold border transition flex items-center justify-center gap-2 ${builderType === 'ai' ? 'bg-purple-600 text-white shadow-lg border-purple-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
           <Cpu size={18}/> AI Builder (PNG/PDF)
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {builderType === 'ai' && (
          <div className="bg-purple-50 border border-purple-200 p-8 rounded-2xl text-center shadow-inner">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
              <FileType size={32}/>
            </div>
            <h3 className="font-bold text-purple-800 mb-2">Quiz Generate Karne ke liye PNG ya PDF Upload karein</h3>
            <p className="text-sm text-purple-600 mb-4">AI aapke document se automatically MCQs taiyar kar dega.</p>
            <input type="file" accept="image/*, application/pdf" onChange={handleAIUpload} className="hidden" id="ai-upload" />
            <label htmlFor="ai-upload" className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold cursor-pointer hover:bg-purple-700 transition shadow-md inline-block">
              File Chunein
            </label>
            {loading && <p className="mt-4 text-purple-600 animate-pulse font-medium">AI document process kar raha hai...</p>}
          </div>
        )}

        <div className="grid gap-4">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border relative shadow-sm hover:shadow-md transition group">
              <button 
                onClick={() => removeQuestion(idx)} 
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors p-1"
                title="Sawal Hatayein"
              >
                <Trash2 size={20}/>
              </button>
              
              <div className="flex gap-3 mb-4">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0">Q{idx + 1}</span>
                <input 
                  placeholder="Sawal yahan likhein..." 
                  className="w-full font-bold text-gray-800 border-b-2 border-transparent focus:border-blue-500 outline-none pb-1 transition-all" 
                  value={q.question} 
                  onChange={e => {
                    const newQ = [...questions]; newQ[idx].question = e.target.value; setQuestions(newQ);
                  }} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-11">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <div key={opt} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg group/opt">
                    <span className="font-bold text-gray-400 group-hover/opt:text-blue-500 transition-colors">{opt})</span>
                    <input 
                      className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-gray-300" 
                      value={q[`option${opt}`]} 
                      placeholder={`Option ${opt}`}
                      onChange={e => {
                        const newQ = [...questions]; newQ[idx][`option${opt}`] = e.target.value; setQuestions(newQ);
                      }} 
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 ml-11 pt-3 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sahi Jawab:</span>
                <div className="flex gap-2">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => {
                        const newQ = [...questions]; newQ[idx].correct = opt; setQuestions(newQ);
                      }}
                      className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${q.correct === opt ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {questions.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 mt-10">
            <button 
              onClick={addManualQuestion} 
              className="flex-1 bg-white border-2 border-dashed border-gray-300 p-4 rounded-2xl font-bold text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20}/> Ek aur Sawal Jodein
            </button>
            <button 
              onClick={handleSave} 
              disabled={loading || questions.length === 0} 
              className="flex-1 bg-green-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20}/> {loading ? "Save ho raha hai..." : "Quiz Sheet me Save Karein"}
            </button>
          </div>
        )}

        {questions.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">
            <p>Abhi tak koi sawal nahi joda gaya hai. Upar diye gaye buttons se shuru karein.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuizzes;