import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
apiKey: "AIzaSyB-sB2q13cHInUMmEIuGUT2Uz6srvJDv_M",
authDomain: "ligaformativa-3db31.firebaseapp.com",
projectId: "ligaformativa-3db31",
storageBucket: "ligaformativa-3db31.firebasestorage.app",
messagingSenderId: "1033762885243",
appId: "1:1033762885243:web:a02b5c2b19e7ba666a5cde"
};

// Initialize Firebase only if config is provided
const isConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = isConfigured ? getFirestore(app!) : null;

// Enable offline persistence
if (db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: Browser not supported');
    }
  });
}

export { isConfigured };
