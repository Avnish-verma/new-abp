import { doc, getDoc, updateDoc, arrayUnion, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export const courseService = {
  // 1. Get Course Content (Admin & Student)
  getCourseContent: async (batchId) => {
    try {
      const docRef = doc(db, "batches", batchId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().syllabus || {}; // Returns entire syllabus object
      }
      return {};
    } catch (error) {
      console.error("Error fetching course:", error);
      return {};
    }
  },

  // 2. Add Content (Video/Note) to Specific Subject & Chapter
  addContent: async (batchId, data) => {
    const { subject, chapter, ...contentData } = data;
    const batchRef = doc(db, "batches", batchId);

    // Create a unique ID for the content
    const newContent = {
      id: crypto.randomUUID(),
      ...contentData,
      createdAt: new Date().toISOString()
    };

    // Firestore Path: syllabus -> Subject -> Chapter -> Array of Content
    // Note: We use "dot notation" to update nested fields efficiently
    const fieldPath = `syllabus.${subject}.${chapter}`;

    try {
      // Try to update existing array
      await updateDoc(batchRef, {
        [fieldPath]: arrayUnion(newContent)
      });
    } catch (error) {
      // If the map/path doesn't exist yet, we might need to set it properly
      // Note: Firestore 'updateDoc' with dot notation creates intermediate maps automatically 
      // ONLY IF the parent document exists. 
      console.error("Error adding content:", error);
      alert("Failed to add content. Check console.");
    }
  },

  // 3. Delete Content (Complex because it's inside an array)
  deleteContent: async (batchId, subject, chapter, contentItem) => {
    const batchRef = doc(db, "batches", batchId);
    const fieldPath = `syllabus.${subject}.${chapter}`;
    
    // arrayRemove requires the EXACT object match. 
    // In production, it's safer to read-modify-write, but for now:
    await updateDoc(batchRef, {
      [fieldPath]: arrayRemove(contentItem)
    });
  }
};