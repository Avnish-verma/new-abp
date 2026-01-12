import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sheetService } from '../../services/sheetService';
import { db } from '../../firebase'; // Make sure path is correct based on your folder structure
import { collection, getDocs } from 'firebase/firestore'; 
import { Save, FileText, Video } from 'lucide-react';

const AdminUpload = () => {
  // Dropdown States
  const [batches, setBatches] = useState([]);
  const [videosList, setVideosList] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

  // AI & Upload States
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  // 1. Fetch Batches
  useEffect(() => {
    const fetchBatches = async () => {
      const snapshot = await getDocs(collection(db, "batches"));
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBatches();
  }, []);

  // 2. Fetch Videos when Batch Selected
  useEffect(() => {
    if (!selectedBatchId) return;
    const batch = batches.find(b => b.id === selectedBatchId);
    if (batch?.syllabus) {
      let vids = [];
      // Traverse nested syllabus object
      Object.values(batch.syllabus).forEach(chapters => {
        Object.values(chapters).forEach(contents => {
          contents.forEach(item => {
            if (item.type === 'video') vids.push(item);
          });
        });
      });
      setVideosList(vids);
    }
  }, [selectedBatchId, batches]);

  // 3. Handle File Selection
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setImagePreview(URL.createObjectURL(selected));
    }
  };

  // 4. Generate AI Notes
  const generateNotes = async () => {
    if (!file) return alert("Please upload an image first.");
    setLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Convert Image to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        
        const prompt = "Analyze this educational image. Create detailed study notes in Markdown format. Use headings (#), bullets (-), and bold text (**text**) for important terms. Keep it structured like a student's notebook.";
        
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: file.type } }
        ]);
        
        setGeneratedNotes(result.response.text());
        setLoading(false);
      };
    } catch (error) {
      console.error(error);
      alert("AI Generation Failed");
      setLoading(false);
    }
  };

  // 5. Save to Google Sheet
  const handleSaveToSheet = async () => {
    if (!selectedVideo || !generatedNotes) return alert("Select a video and generate notes first.");
    
    setSaving(true);
    const success = await sheetService.saveNote({
      videoId: selectedVideo.id,
      videoTitle: selectedVideo.title,
      text: generatedNotes
    });

    if (success) {
      alert("Notes Saved to Google Sheet! Students can now see this in the App.");
      setGeneratedNotes("");
      setFile(null);
      setImagePreview(null);
    } else {
      alert("Failed to save to Sheet.");
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">AI Note Generator & Upload</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Step 1: Select Context */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-3 text-gray-700">1. Select Target Video</h3>
            <select 
              className="w-full border p-2 rounded mb-3"
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="">-- Select Batch --</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            
            <select 
              className="w-full border p-2 rounded disabled:bg-gray-100"
              disabled={!selectedBatchId}
              onChange={(e) => {
                const vid = videosList.find(v => v.id === e.target.value);
                setSelectedVideo(vid);
              }}
            >
              <option value="">-- Select Video --</option>
              {videosList.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
            </select>

            {selectedVideo && (
              <div className="mt-2 p-2 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200 flex items-center gap-2">
                <Video size={14}/> Linked to: <b>{selectedVideo.title}</b>
              </div>
            )}
          </div>

          {/* Step 2: Upload Image */}
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <h3 className="font-bold mb-3 text-gray-700">2. Upload Board/Note Image</h3>
            <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-3"/>
            
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border"/>
            )}
            
            <button 
              onClick={generateNotes} 
              disabled={loading || !file}
              className="w-full mt-3 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "AI is Thinking... 🧠" : "Generate Notes"}
            </button>
          </div>
        </div>

        {/* Step 3: Preview & Save */}
        <div className="bg-white p-4 rounded-xl border shadow-sm h-full flex flex-col">
          <h3 className="font-bold mb-3 text-gray-700">3. Preview & Save</h3>
          <textarea 
            value={generatedNotes}
            onChange={(e) => setGeneratedNotes(e.target.value)}
            placeholder="Generated notes will appear here..."
            className="flex-1 w-full p-3 bg-gray-50 border rounded-lg font-mono text-sm resize-none focus:ring-2 ring-blue-500 outline-none mb-3"
          />
          
          <button 
            onClick={handleSaveToSheet} 
            disabled={!generatedNotes || saving}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? "Saving to Sheet..." : <><Save size={18}/> Save to App</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUpload;