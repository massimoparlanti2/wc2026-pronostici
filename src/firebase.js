import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Make absolutely sure this line is exactly here at the bottom:
export const db = getDatabase(app);