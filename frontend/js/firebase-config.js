/**
 * KrishiMitra AI — Firebase Configuration
 * 
 * Initializes Firebase App, Auth, and Firestore.
 * Firebase config is loaded from a non-secret public config object.
 * (Firebase web config keys are safe to expose in frontend code —
 *  security is enforced by Firebase Security Rules, not by hiding config.)
 * 
 * SETUP: Replace the placeholder values below with your actual Firebase project config.
 * Get these from: Firebase Console → Project Settings → General → Your Apps → Web App
 */

// Firebase config — replace with your project's actual config
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyReplaceMeWithYourActualKey",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services for use by auth.js
const firebaseAuth = firebase.auth();
const firebaseDB = firebase.firestore();

// Use the phone auth provider's language setting
firebaseAuth.useDeviceLanguage();

console.log("[KrishiMitra] Firebase initialized.");
