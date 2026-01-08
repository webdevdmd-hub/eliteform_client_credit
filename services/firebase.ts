import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import "firebase/compat/storage";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (Compat) to support db.collection
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Export Modular Auth
// We cast app to any because Compat App type overlaps but isn't identical to Modular App type
export const auth = getAuth(app as any);

// Export Compat Firestore (Preserves db.collection syntax)
export const db = app.firestore();

// Export Modular Storage
export const storage = getStorage(app as any);

// Export Modular Functions
export const functions = getFunctions(app as any);

// Helper for secondary app
export const createSecondaryApp = () => {
  return initializeApp(firebaseConfig, "Secondary");
};
