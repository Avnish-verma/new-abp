import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, Check } from 'lucide-react';

const NotebookView = ({ notesContent, title, videoId }) => {
  const [saved, setSaved] = useState(false);

  // Check agar pehle se saved hai
  useEffect(() => {
    if (localStorage.getItem(`offline_note_${videoId}`)) {
      setSaved(true);
    }
  }, [videoId]);

  // App ke "Downloads" section ke liye save karna
  const handleSaveOffline = () => {
    const noteData = { title, content: notesContent, date: new Date().toISOString() };
    localStorage.setItem(`offline_note_${videoId}`, JSON.stringify(noteData));
    setSaved(true);
    
    // Real File Download (.txt) karwana
    const element = document.createElement("a");
    const file = new Blob([`# ${title}\n\n${notesContent}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '_')}_Notes.txt`;
    document.body.appendChild(element); 
    element.click();
    
    alert("Note saved offline!");
  };

  return (
    <div className="mt-2 animate-in fade-in slide-in-from-bottom-4">
      
      {/* --- FONT LOADER --- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap');
      `}</style>

      {/* --- HEADER ACTIONS --- */}
      <div className="flex justify-between items-center mb-3 px-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          CLASS NOTES ({new Date().toLocaleDateString()})
        </span>
        
        <button 
          onClick={handleSaveOffline}
          disabled={saved}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-transform active:scale-95 ${
            saved 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saved ? <><Check size={14}/> Saved</> : <><Download size={14}/> Download</>}
        </button>
      </div>

      {/* --- NOTEBOOK PAPER UI (Perfectly Aligned) --- */}
      <div 
        className="notebook-paper relative shadow-md rounded-sm overflow-hidden text-gray-800"
        style={{
          backgroundColor: '#fff',
          // Blue Lines Pattern (24px line height for mobile readability)
          backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, #91d1ff 27px, #91d1ff 28px)`,
          backgroundAttachment: 'local',
          minHeight: '500px',
          fontFamily: "'Kalam', cursive", // Handwritten Font
          fontSize: '1rem', // Smaller font for mobile (approx 16px)
          lineHeight: '28px', // Match gradient size exactly
          paddingTop: '28px' // Start text from first line
        }}
      >
        {/* Red Vertical Margin Line */}
        <div className="absolute top-0 bottom-0 left-8 md:left-16 w-0.5 bg-red-400 h-full z-10 opacity-60"></div>

        {/* Content Area */}
        <div className="relative z-0 pl-12 md:pl-20 pr-4 pb-10">
          
          {/* Handwritten Title */}
          <h1 className="text-xl md:text-2xl font-bold text-blue-700 mb-0 underline decoration-wavy decoration-red-300" style={{ lineHeight: '28px', marginBottom: '28px' }}>
            {title}
          </h1>

          {/* Markdown Content rendered as Handwriting */}
          <div className="prose prose-sm md:prose-lg max-w-none text-gray-900">
            <ReactMarkdown 
               components={{
                 h1: ({node, ...props}) => <h2 className="text-lg font-bold text-purple-800 m-0" style={{ lineHeight: '28px' }} {...props} />,
                 h2: ({node, ...props}) => <h3 className="text-base font-bold text-indigo-700 m-0" style={{ lineHeight: '28px' }} {...props} />,
                 p: ({node, ...props}) => <p className="mb-0" style={{ lineHeight: '28px', marginTop: 0, marginBottom: 0 }} {...props} />,
                 ul: ({node, ...props}) => <ul className="list-disc ml-4 m-0" style={{ lineHeight: '28px' }} {...props} />,
                 li: ({node, ...props}) => <li className="pl-1 m-0" style={{ lineHeight: '28px' }} {...props} />,
                 strong: ({node, ...props}) => <span className="font-bold text-black bg-yellow-100 px-1 rounded-sm" {...props} />,
                 blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-blue-400 pl-3 text-gray-600 italic m-0" style={{ lineHeight: '28px' }} {...props} />
               }}
            >
              {notesContent}
            </ReactMarkdown>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NotebookView;