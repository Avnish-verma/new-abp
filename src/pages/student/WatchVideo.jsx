import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Bot, BookOpen, CheckCircle2, Send, Lock, AlertCircle } from 'lucide-react';
import { auth, db } from '../../firebase'; // Fixed path: Relative to src/pages/student
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext'; // Fixed path
import { askDoubts } from '../../services/geminiService'; // Fixed path
import { sheetService } from '../../services/sheetService'; // Fixed path

// Components - Sabhi paths ko project structure ke mutabiq fix kiya gaya hai
import MyVideoPlayer from '../../components/MyVideoPlayer';
import QuizSection from '../../components/QuizSection';
import NotebookView from '../../components/NotebookView';
import DoubtsSection from '../../components/DoubtsSection';

const WatchVideo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { userRole } = useAuth();
  
  const videoState = location.state?.video;
  const [videoTitle, setVideoTitle] = useState(videoState?.title || "Loading...");
  
  const user = auth.currentUser;
  
  const [activeTab, setActiveTab] = useState('notes'); 
  const [secureUrl, setSecureUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [notesData, setNotesData] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const playerRef = useRef(null); 

  // --- 1. 🛡️ SECURITY CHECK & URL FETCH ---
  useEffect(() => {
    if (!videoId || !user) return;

    const verifyAndFetch = async () => {
      setLoadingUrl(true);
      setAccessDenied(false);

      try {
        const videoRef = doc(db, "secure_videos", videoId);
        const videoSnap = await getDoc(videoRef);

        if (!videoSnap.exists()) {
          if (videoState?.url) {
             setSecureUrl(videoState.url);
          } else {
             setAccessDenied(true);
          }
          setLoadingUrl(false);
          return;
        }

        const secureData = videoSnap.data();
        setVideoTitle(secureData.title || videoTitle);
        const requiredBatchId = secureData.batchId;

        if (userRole === 'admin') {
          setSecureUrl(secureData.url);
          setLoadingUrl(false);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const enrolledBatches = userData.enrolledBatches || [];
          if (enrolledBatches.includes(requiredBatchId)) {
            setSecureUrl(secureData.url);
          } else {
            setAccessDenied(true);
          }
        } else {
          setAccessDenied(true);
        }
      } catch (error) {
        console.error("Security Check Failed:", error);
        setAccessDenied(true);
      }
      setLoadingUrl(false);
    };

    verifyAndFetch();
  }, [videoId, user, userRole, videoState?.url, videoTitle]);

  // --- 2. LOAD NOTES ---
  useEffect(() => {
    if (activeTab === 'notes' && !notesData && videoId && !accessDenied) {
      const loadNotes = async () => {
        setLoadingNotes(true);
        try {
          const data = await sheetService.getNotes(videoId);
          if (data && data.content) {
              setNotesData(data.content);
          } else if (videoState?.notesContent) {
              setNotesData(videoState.notesContent);
          }
        } catch (err) {
          console.error("Notes load error:", err);
        }
        setLoadingNotes(false);
      };
      loadNotes();
    }
  }, [activeTab, videoId, accessDenied, notesData, videoState?.notesContent]);

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    const query = aiInput;
    setAiInput('');
    setAiChat(prev => [...prev, { sender: 'user', text: query }]);
    setAiLoading(true);

    try {
      const answer = await askDoubts(query, {
        videoTitle: videoTitle,
        subject: 'General', 
        currentTimestamp: Math.floor(playerRef.current?.currentTime() || 0)
      });
      setAiChat(prev => [...prev, { sender: 'bot', text: answer }]);
    } catch {
      setAiChat(prev => [...prev, { sender: 'bot', text: "AI se sampark nahi ho pa raha hai." }]);
    }
    setAiLoading(false);
  };

  return (
    // ✅ h-[100dvh] ka use kiya gaya hai taaki mobile browser UI ke mutabiq screen size adjust ho sake
    <div className="flex flex-col h-[100dvh] bg-slate-50 overflow-hidden">
      
      {/* 1. STICKY VIDEO SECTION (Fixed Height) */}
      <div className="w-full shrink-0 bg-black relative z-50 shadow-md">
        <div className="absolute top-4 left-4 z-[60]">
            <button onClick={() => navigate(-1)} className="bg-black/40 p-2 rounded-full text-white backdrop-blur-sm active:scale-95 transition">
                <ArrowLeft size={20}/>
            </button>
        </div>

        <div className="w-full aspect-video bg-black flex flex-col justify-center">
          {loadingUrl ? (
            <div className="flex flex-col items-center justify-center text-white gap-3">
               <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
               <span className="text-[10px] animate-pulse">Pusthi ki ja rahi hai...</span>
            </div>
          ) : accessDenied ? (
            <div className="flex flex-col items-center justify-center text-center px-6 bg-zinc-900 h-full">
                <Lock size={32} className="text-red-500 mb-2" />
                <h2 className="text-white text-sm font-bold uppercase tracking-widest">Locked</h2>
                <button onClick={() => navigate('/student/home')} className="mt-3 bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase">Browse Courses</button>
            </div>
          ) : secureUrl ? (
            <MyVideoPlayer videoUrl={secureUrl} ref={playerRef} />
          ) : (
            <div className="text-red-400 text-xs flex flex-col items-center gap-2 h-full justify-center">
                <AlertCircle size={24}/>
                <span>Video uplabdh nahi hai</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA (Tabs + Scrollable Content) */}
      {/* min-h-0 and flex-1 allows independent scroll context inside the flexbox */}
      <div className="flex-1 flex flex-col min-h-0 bg-white relative">
        
        {/* TABS (Sticky top of the content area) */}
        <div className="shrink-0 bg-white shadow-sm border-b z-40">
            <div className="p-3">
                <h1 className="font-bold text-sm text-gray-900 leading-tight line-clamp-1">{videoTitle}</h1>
                <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Session Content</p>
            </div>

            <div className="flex overflow-x-auto no-scrollbar border-t bg-gray-50/50">
                {[
                    { id: 'notes', label: 'Notes', icon: BookOpen },
                    { id: 'ai', label: 'AI Tutor', icon: Bot },
                    { id: 'doubts', label: 'Doubts', icon: MessageCircle },
                    { id: 'quiz', label: 'Quiz', icon: CheckCircle2 },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase whitespace-nowrap transition-all border-b-2 ${
                            activeTab === tab.id 
                            ? 'text-blue-600 border-blue-600 bg-white' 
                            : 'text-gray-400 border-transparent'
                        }`}
                    >
                       <tab.icon size={14}/> {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* SCROLLABLE AREA */}
        {/* pb-32 is used to ensure the BottomNav and AI Input don't overlap the last question/text */}
        <div className="flex-1 overflow-y-auto bg-white p-4 pb-32 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {accessDenied ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                 <Lock size={32} className="mb-2 opacity-20"/>
                 <p className="text-[11px] font-medium">Is video ko dekhne ke liye enroll karein.</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'notes' && (
                  <div className="max-w-none">
                    {loadingNotes ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                            <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-bold">Fetching...</span>
                        </div>
                    ) : notesData ? (
                        <NotebookView notesContent={notesData} title={videoTitle} videoId={videoId} /> 
                    ) : (
                        <div className="text-center py-12 text-gray-400 text-xs border-2 border-dashed rounded-2xl">Notes nahi mile.</div>
                    )}
                  </div>
                )}

                {activeTab === 'doubts' && <DoubtsSection videoId={videoId} videoTitle={videoTitle} />}
                
                {activeTab === 'quiz' && <QuizSection videoId={videoId} videoTitle={videoTitle} user={user} />}

                {activeTab === 'ai' && (
                  <div className="flex flex-col gap-4">
                      {aiChat.length === 0 && (
                         <div className="bg-purple-50 p-5 rounded-2xl text-center border border-purple-100 shadow-sm">
                           <Bot size={28} className="mx-auto text-purple-600 mb-2"/>
                           <p className="text-xs text-purple-800 font-bold">AI Tutor Taiyar Hai!</p>
                           <p className="text-[10px] text-purple-600">Video se juda koi bhi sawal puchein.</p>
                         </div>
                      )}
                      {aiChat.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[11px] shadow-sm leading-relaxed ${
                              msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                          }`}>{msg.text}</div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="text-[10px] text-gray-400 animate-pulse flex items-center gap-2">
                          <Bot size={12} className="animate-bounce" /> AI soch raha hai...
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI INPUT (Fixed at the bottom of the CONTENT AREA context) */}
        {/* Floating above the BottomNav (~70px) */}
        {!accessDenied && activeTab === 'ai' && (
          <div className="absolute bottom-[85px] left-0 w-full px-4 z-[50]">
            <form onSubmit={handleAskAI} className="flex gap-2 items-center bg-white p-1.5 rounded-full border shadow-2xl ring-1 ring-black/5">
              <input 
                className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-gray-800" 
                placeholder="Ask something..." 
                value={aiInput} 
                onChange={e => setAiInput(e.target.value)}
              />
              <button 
                disabled={!aiInput.trim() || aiLoading} 
                className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition shadow-lg disabled:opacity-50"
              >
                <Send size={18}/>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchVideo;