import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';

// 1. Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgEVs-WWtxjlmF9AeWVk9ypMrEssEQL4I",
  authDomain: "mondiali2026-90ad8.firebaseapp.com",
  databaseURL: "https://mondiali2026-90ad8-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mondiali2026-90ad8",
  storageBucket: "mondiali2026-90ad8.firebasestorage.app",
  messagingSenderId: "195314478440",
  appId: "1:195314478440:web:4f3c04aa9df99e5e6fbadd",
  measurementId: "G-249DHG490H"
};

// 2. Initialize Firebase First
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 3. Now initialize and EXPORT the database so App.jsx can see it
export const db = getDatabase(app);