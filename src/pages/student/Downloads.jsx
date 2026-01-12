import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotebookView from '../../components/NotebookView';

const Downloads = () => {
  const [downloads, setDownloads] = useState([]);
  const [viewingNote, setViewingNote] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('offline_note_')) {
        items.push(JSON.parse(localStorage.getItem(key)));
      }
    }
    setDownloads(items);
  }, []);

  const handleDelete = (videoId) => {
    localStorage.removeItem(`offline_note_${videoId}`);
    setDownloads(prev => prev.filter(item => item.id !== videoId)); // Assuming saved object has ID logic
    // Re-fetch to be safe
    window.location.reload(); 
  };

  if (viewingNote) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <button onClick={() => setViewingNote(null)} className="flex items-center gap-2 text-blue-600 font-bold mb-4">
          <ArrowLeft size={20}/> Back
        </button>
        <NotebookView notesContent={viewingNote.content} title={viewingNote.title} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Offline Downloads</h1>
      {downloads.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>No notes saved yet.</p>
          <p className="text-xs">Save notes from the video player.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {downloads.map((note, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
              <div onClick={() => setViewingNote(note)} className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{note.title}</h3>
                  <p className="text-xs text-gray-500">{new Date(note.date).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(note.videoId)} className="p-2 text-gray-400 hover:text-red-600">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Downloads;