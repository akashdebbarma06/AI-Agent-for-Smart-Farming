/**
 * KrishiMitra AI — Dynamic Firebase Configuration Loader
 * 
 * Secure Architecture:
 * - NO API keys or credentials are hardcoded in this git repository.
 * - Local development: Reads window.__FIREBASE_CONFIG__ from the gitignored
 *   `frontend/js/firebase-config.local.js` if present.
 * - Production: Dynamically fetches public web credentials from the backend
 *   `/api/v1/auth/config` endpoint (backed by server environment variables).
 */

let firebaseAuth = null;
let firebaseDB = null;
let _firebaseInitPromise = null;

/**
 * Ensures Firebase is properly initialized with valid credentials.
 * Returns true if initialization succeeded, false otherwise.
 */
async function ensureFirebaseInitialized() {
  if (firebase.apps && firebase.apps.length > 0) {
    firebaseAuth = firebase.auth();
    firebaseDB = firebase.firestore();
    return true;
  }

  if (_firebaseInitPromise) {
    return _firebaseInitPromise;
  }

  _firebaseInitPromise = (async () => {
    let config = window.__FIREBASE_CONFIG__ || null;

    // If local config is not provided or is a placeholder, fetch from backend
    if (!config || !config.apiKey || config.apiKey.includes("DummyKey") || config.projectId.includes("your-project-id")) {
      try {
        const prodApiUrl = "https://krishimitra-api-g5d8.onrender.com";
        const apiUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
          ? (window.location.port === "8000" ? "" : "http://localhost:8000")
          : prodApiUrl;

        const res = await fetch(`${apiUrl}/api/v1/auth/config`);
        if (res.ok) {
          const remoteConfig = await res.json();
          if (remoteConfig && remoteConfig.apiKey && remoteConfig.apiKey.trim().length > 0) {
            config = remoteConfig;
          }
        }
      } catch (err) {
        console.warn("[KrishiMitra] Unable to fetch Firebase config from backend:", err);
      }
    }

    // Initialize if we have a valid configuration
    if (config && config.apiKey && !config.apiKey.includes("DummyKey")) {
      try {
        firebase.initializeApp(config);
        firebaseAuth = firebase.auth();
        firebaseDB = firebase.firestore();
        firebaseAuth.useDeviceLanguage();
        console.log("[KrishiMitra] Firebase initialized securely.");
        window.dispatchEvent(new CustomEvent("krishimitra:firebase-ready"));
        return true;
      } catch (err) {
        console.error("[KrishiMitra] Firebase initialization error:", err);
        return false;
      }
    }

    console.warn("[KrishiMitra] Firebase credentials not configured.");
    return false;
  })();

  return _firebaseInitPromise;
}

// Start resolving config immediately
ensureFirebaseInitialized();
