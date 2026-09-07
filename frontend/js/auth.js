/**
 * KrishiMitra AI — Authentication & Onboarding Controller
 * 
 * Handles:
 *  - Google Sign-In (Gmail authentication via Firebase Auth GoogleAuthProvider)
 *  - Email & Password authentication (Sign In & Account Creation)
 *  - Password reset via email
 *  - New user onboarding (name, age, state, district, language, T&C)
 *  - Session persistence via Firebase onAuthStateChanged
 *  - User profile storage in Firestore (`users/{uid}`)
 *  - Auth guards for AI chat access
 *  - Logout functionality
 * 
 * Dependencies: firebase-config.js must be loaded first (provides ensureFirebaseInitialized, firebaseAuth, firebaseDB)
 */

// ── Auth State ──────────────────────────────────────────────────────────────
let currentUser = null;        // Firebase user object
let currentUserProfile = null; // Firestore profile doc { name, age, state, district, language, email }
let authMode = "login";        // "login" | "signup"

// Indian states and their districts (subset — covers major agricultural states)
const INDIAN_STATES_DISTRICTS = {
  "Andhra Pradesh": ["Anantapur","Chittoor","East Godavari","Guntur","Krishna","Kurnool","Nellore","Prakasam","Srikakulam","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa"],
  "Assam": ["Baksa","Barpeta","Cachar","Darrang","Dhubri","Dibrugarh","Goalpara","Golaghat","Jorhat","Kamrup","Karbi Anglong","Karimganj","Kokrajhar","Lakhimpur","Nagaon","Nalbari","Sivasagar","Sonitpur","Tinsukia"],
  "Bihar": ["Araria","Aurangabad","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sitamarhi","Siwan","Supaul","Vaishali"],
  "Chhattisgarh": ["Bastar","Bilaspur","Dhamtari","Durg","Janjgir-Champa","Jashpur","Korba","Koriya","Mahasamund","Raigarh","Raipur","Rajnandgaon","Surguja"],
  "Gujarat": ["Ahmedabad","Amreli","Anand","Banaskantha","Bharuch","Bhavnagar","Dahod","Gandhinagar","Jamnagar","Junagadh","Kutch","Mehsana","Narmada","Navsari","Panchmahal","Patan","Porbandar","Rajkot","Sabarkantha","Surat","Surendranagar","Vadodara","Valsad"],
  "Haryana": ["Ambala","Bhiwani","Faridabad","Fatehabad","Gurugram","Hisar","Jhajjar","Jind","Kaithal","Karnal","Kurukshetra","Mahendragarh","Nuh","Palwal","Panchkula","Panipat","Rewari","Rohtak","Sirsa","Sonipat","Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur","Chamba","Hamirpur","Kangra","Kinnaur","Kullu","Lahaul and Spiti","Mandi","Shimla","Sirmaur","Solan","Una"],
  "Jharkhand": ["Bokaro","Chatra","Deoghar","Dhanbad","Dumka","East Singhbhum","Garhwa","Giridih","Godda","Gumla","Hazaribagh","Jamtara","Koderma","Latehar","Lohardaga","Pakur","Palamu","Ramgarh","Ranchi","Sahebganj","Seraikela-Kharsawan","Simdega","West Singhbhum"],
  "Karnataka": ["Bagalkot","Bangalore Rural","Bangalore Urban","Belgaum","Bellary","Bidar","Chamarajanagar","Chikballapur","Chikmagalur","Chitradurga","Dakshina Kannada","Davangere","Dharwad","Gadag","Gulbarga","Hassan","Haveri","Kodagu","Kolar","Koppal","Mandya","Mysore","Raichur","Ramanagara","Shimoga","Tumkur","Udupi","Uttara Kannada","Yadgir"],
  "Kerala": ["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"],
  "Madhya Pradesh": ["Agar Malwa","Alirajpur","Anuppur","Ashoknagar","Balaghat","Barwani","Betul","Bhind","Bhopal","Burhanpur","Chhatarpur","Chhindwara","Damoh","Datia","Dewas","Dhar","Dindori","Guna","Gwalior","Harda","Hoshangabad","Indore","Jabalpur","Jhabua","Katni","Khandwa","Khargone","Mandla","Mandsaur","Morena","Narsinghpur","Neemuch","Panna","Raisen","Rajgarh","Ratlam","Rewa","Sagar","Satna","Sehore","Seoni","Shahdol","Shajapur","Sheopur","Shivpuri","Sidhi","Singrauli","Tikamgarh","Ujjain","Umaria","Vidisha"],
  "Maharashtra": ["Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"],
  "Odisha": ["Angul","Balangir","Balasore","Bargarh","Bhadrak","Boudh","Cuttack","Deogarh","Dhenkanal","Gajapati","Ganjam","Jagatsinghpur","Jajpur","Jharsuguda","Kalahandi","Kandhamal","Kendrapara","Kendujhar","Khordha","Koraput","Malkangiri","Mayurbhanj","Nabarangpur","Nayagarh","Nuapada","Puri","Rayagada","Sambalpur","Sonepur","Sundargarh"],
  "Punjab": ["Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Mansa","Moga","Mohali","Muktsar","Nawanshahr","Pathankot","Patiala","Rupnagar","Sangrur","Tarn Taran"],
  "Rajasthan": ["Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara","Bikaner","Bundi","Chittorgarh","Churu","Dausa","Dholpur","Dungarpur","Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh","Rajsamand","Sawai Madhopur","Sikar","Sirohi","Sri Ganganagar","Tonk","Udaipur"],
  "Tamil Nadu": ["Ariyalur","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Salem","Sivaganga","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar"],
  "Telangana": ["Adilabad","Hyderabad","Karimnagar","Khammam","Mahbubnagar","Medak","Nalgonda","Nizamabad","Rangareddy","Warangal"],
  "Tripura": ["Dhalai","Gomati","Khowai","North Tripura","Sepahijala","South Tripura","Unakoti","West Tripura"],
  "Uttar Pradesh": ["Agra","Aligarh","Allahabad","Ambedkar Nagar","Amethi","Amroha","Auraiya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Faizabad","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kushinagar","Lakhimpur Kheri","Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Rae Bareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar","Shahjahanpur","Shamli","Shravasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"],
  "Uttarakhand": ["Almora","Bageshwar","Chamoli","Champawat","Dehradun","Haridwar","Nainital","Pauri Garhwal","Pithoragarh","Rudraprayag","Tehri Garhwal","Udham Singh Nagar","Uttarkashi"],
  "West Bengal": ["Bankura","Birbhum","Burdwan","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas","Paschim Medinipur","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"]
};

// ── Initialize Auth on Page Load ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  populateStateDropdown();
  const ready = await ensureFirebaseInitialized();
  if (ready && firebaseAuth) {
    setupAuthStateListener();
  } else {
    showAuthLoading(false);
    showLandingView();
  }
});

/**
 * Firebase auth state listener — runs on page load and auth changes.
 * Single source of truth for routing decisions.
 */
function setupAuthStateListener() {
  // Safe timeout: never leave loading overlay visible for more than 2 seconds
  const safetyTimer = setTimeout(() => {
    showAuthLoading(false);
    if (!currentUser) showLandingView();
  }, 2000);

  firebaseAuth.onAuthStateChanged(async (user) => {
    clearTimeout(safetyTimer);

    if (user) {
      currentUser = user;
      console.log("[Auth] User signed in:", user.email || user.uid);

      // Check localStorage first for instant loading
      const cached = localStorage.getItem(`km_profile_${user.uid}`) || localStorage.getItem("krishimitra_user_profile");
      if (cached) {
        try {
          currentUserProfile = JSON.parse(cached);
          applyUserProfileToUI();
          showAuthLoading(false);
          showChatView();
          return;
        } catch (_) {}
      }

      // Check if profile exists in Firestore with a 3s timeout
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        const profilePromise = firebaseDB.collection("users").doc(user.uid).get();
        const profileDoc = await Promise.race([profilePromise, timeoutPromise]);

        if (profileDoc && profileDoc.exists) {
          currentUserProfile = profileDoc.data();
          localStorage.setItem(`km_profile_${user.uid}`, JSON.stringify(currentUserProfile));
          applyUserProfileToUI();
          showAuthLoading(false);
          showChatView();
        } else {
          // New user without profile
          showAuthLoading(false);
          showOnboardingStep();
        }
      } catch (err) {
        console.warn("[Auth] Firestore profile fetch:", err);
        showAuthLoading(false);
        showOnboardingStep();
      }
    } else {
      currentUser = null;
      currentUserProfile = null;
      showAuthLoading(false);
      showLandingView();
    }
  });
}

// ── View Routing ────────────────────────────────────────────────────────────

function showAuthLoading(show) {
  const el = document.getElementById("auth-loading-overlay");
  if (el) el.classList.toggle("hidden", !show);
}

/** Show the credentials login/signup modal */
function showLoginStep() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.remove("hidden");
  const creds = document.getElementById("auth-step-credentials");
  if (creds) creds.classList.remove("hidden");
  const onboard = document.getElementById("auth-step-onboarding");
  if (onboard) onboard.classList.add("hidden");

  clearAuthError();
  const emailInput = document.getElementById("auth-email");
  if (emailInput) emailInput.focus();
}

/** Close the auth modal and return to landing view */
function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.add("hidden");
  if (!currentUser || !currentUserProfile) {
    showLandingView();
  }
}

/** Show the onboarding form step */
function showOnboardingStep() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.remove("hidden");
  const creds = document.getElementById("auth-step-credentials");
  if (creds) creds.classList.add("hidden");
  const onboard = document.getElementById("auth-step-onboarding");
  if (onboard) onboard.classList.remove("hidden");
  clearAuthError();

  // Pre-fill name if available from Google or Email
  const nameInput = document.getElementById("onboard-name");
  if (nameInput && !nameInput.value) {
    if (currentUser && currentUser.displayName) {
      nameInput.value = currentUser.displayName;
    } else if (currentUser && currentUser.email) {
      const emailPrefix = currentUser.email.split("@")[0].replace(/[._-]/g, " ");
      nameInput.value = emailPrefix.replace(/\b\w/g, l => l.toUpperCase());
    }
  }
}

/** Auth guard — called by "Get Started" / chat buttons */
function authGuardShowChat() {
  if (currentUser && currentUserProfile) {
    showChatView();
  } else if (currentUser && !currentUserProfile) {
    showOnboardingStep();
  } else {
    showLoginStep();
  }
}

function showLandingView() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.add("hidden");
  const landing = document.getElementById("landing-view");
  if (landing) landing.classList.remove("hidden");
  const chat = document.getElementById("chat-view");
  if (chat) chat.classList.add("hidden");
}

function showChatView() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.add("hidden");
  const landing = document.getElementById("landing-view");
  if (landing) landing.classList.add("hidden");
  const chat = document.getElementById("chat-view");
  if (chat) chat.classList.remove("hidden");
}

// ── Google Authentication (Gmail) ──────────────────────────────────────────

async function handleGoogleAuth() {
  clearAuthError();
  const btn = document.getElementById("btn-google-auth");
  setBtnLoading(btn, true, "Connecting to Google...");

  const isReady = await ensureFirebaseInitialized();
  if (!isReady || !firebaseAuth) {
    showAuthError("Firebase authentication is not configured yet. Please check server configuration.");
    setBtnLoading(btn, false, "Continue with Google");
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");

    // Attempt popup login
    await firebaseAuth.signInWithPopup(provider);
    // onAuthStateChanged will handle routing to chat or onboarding
  } catch (err) {
    console.error("[Auth] Google Sign-In error:", err);
    let msg = "Google Sign-In failed: " + (err.message || "Please try again.");
    if (err.code === "auth/popup-blocked") {
      msg = "Popup was blocked by your browser. Please allow popups for this site or use email login.";
    } else if (err.code === "auth/popup-closed-by-user") {
      msg = "Sign-in cancelled. Please try again.";
    } else if (err.code === "auth/unauthorized-domain") {
      msg = "This domain is not authorized in Firebase Console. Add '" + window.location.hostname + "' under Firebase Auth → Settings → Authorized Domains.";
    }
    showAuthError(msg);
  } finally {
    setBtnLoading(btn, false, "Continue with Google");
  }
}

// ── Email & Password Authentication ────────────────────────────────────────

function toggleAuthMode() {
  clearAuthError();
  authMode = (authMode === "login") ? "signup" : "login";

  const titleEl = document.getElementById("auth-modal-title");
  const subTitleEl = document.getElementById("auth-modal-subtitle");
  const submitTextEl = document.getElementById("btn-email-auth-text");
  const promptEl = document.getElementById("auth-toggle-prompt");
  const toggleBtnEl = document.getElementById("auth-toggle-btn");
  const forgotRowEl = document.getElementById("auth-forgot-link");

  if (authMode === "signup") {
    if (titleEl) titleEl.textContent = "Create Account";
    if (subTitleEl) subTitleEl.textContent = "Join KrishiMitra to get personalized farm guidance";
    if (submitTextEl) submitTextEl.textContent = "Create Account";
    if (promptEl) promptEl.textContent = "Already have an account?";
    if (toggleBtnEl) toggleBtnEl.textContent = "Sign In";
    if (forgotRowEl) forgotRowEl.classList.add("hidden");
  } else {
    if (titleEl) titleEl.textContent = "Welcome to KrishiMitra";
    if (subTitleEl) subTitleEl.textContent = "Sign in with your Google account or email";
    if (submitTextEl) submitTextEl.textContent = "Sign In";
    if (promptEl) promptEl.textContent = "Don't have an account?";
    if (toggleBtnEl) toggleBtnEl.textContent = "Sign Up";
    if (forgotRowEl) forgotRowEl.classList.remove("hidden");
  }
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById("auth-password");
  const icon = document.getElementById("password-toggle-icon");
  if (!pwdInput) return;

  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    if (icon) icon.textContent = "visibility_off";
  } else {
    pwdInput.type = "password";
    if (icon) icon.textContent = "visibility";
  }
}

async function handleEmailPasswordAuth() {
  clearAuthError();

  const emailInput = document.getElementById("auth-email");
  const pwdInput = document.getElementById("auth-password");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = pwdInput ? pwdInput.value : "";

  // Basic validation
  if (!email || !email.includes("@") || !email.includes(".")) {
    showAuthError("Please enter a valid email address.");
    if (emailInput) emailInput.focus();
    return;
  }

  if (!password || password.length < 6) {
    showAuthError("Password must be at least 6 characters long.");
    if (pwdInput) pwdInput.focus();
    return;
  }

  const btn = document.getElementById("btn-email-auth");
  const actionText = (authMode === "signup") ? "Creating account..." : "Signing in...";
  setBtnLoading(btn, true, actionText);

  const isReady = await ensureFirebaseInitialized();
  if (!isReady || !firebaseAuth) {
    showAuthError("Firebase authentication is not configured yet. Please configure Firebase credentials in your server environment variables.");
    setBtnLoading(btn, false, authMode === "signup" ? "Create Account" : "Sign In");
    return;
  }

  try {
    if (authMode === "signup") {
      await firebaseAuth.createUserWithEmailAndPassword(email, password);
      // onAuthStateChanged will detect new user and route to onboarding
    } else {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged will verify profile and route to chat
    }
  } catch (err) {
    console.error("[Auth] Email auth error:", err);
    let msg = err.message || "Authentication failed. Please try again.";
    if (err.code === "auth/invalid-email") msg = "Invalid email format. Please check your email.";
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      msg = "Incorrect email or password. Please try again.";
    }
    if (err.code === "auth/email-already-in-use") {
      msg = "An account with this email already exists. Please switch to Sign In.";
    }
    if (err.code === "auth/weak-password") {
      msg = "Password is too weak. Please use at least 6 characters.";
    }
    showAuthError(msg);
  } finally {
    setBtnLoading(btn, false, authMode === "signup" ? "Create Account" : "Sign In");
  }
}

async function handleForgotPassword() {
  clearAuthError();
  const emailInput = document.getElementById("auth-email");
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email || !email.includes("@")) {
    showAuthError("Please enter your email address in the field above to reset your password.");
    if (emailInput) emailInput.focus();
    return;
  }

  const isReady = await ensureFirebaseInitialized();
  if (!isReady || !firebaseAuth) {
    showAuthError("Firebase authentication is not configured yet.");
    return;
  }

  try {
    await firebaseAuth.sendPasswordResetEmail(email);
    showAuthSuccess(`Password reset email sent to ${email}. Please check your inbox.`);
  } catch (err) {
    console.error("[Auth] Password reset error:", err);
    let msg = "Could not send reset email: " + err.message;
    if (err.code === "auth/user-not-found") msg = "No account found with this email address.";
    showAuthError(msg);
  }
}

// ── Onboarding Form ─────────────────────────────────────────────────────────

function populateStateDropdown() {
  const stateSelect = document.getElementById("onboard-state");
  if (!stateSelect) return;

  stateSelect.innerHTML = '<option value="">Select your state</option>';
  Object.keys(INDIAN_STATES_DISTRICTS).sort().forEach(state => {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    stateSelect.appendChild(opt);
  });
}

function onStateChange() {
  const stateSelect = document.getElementById("onboard-state");
  const districtSelect = document.getElementById("onboard-district");
  if (!stateSelect || !districtSelect) return;

  const selectedState = stateSelect.value;
  districtSelect.innerHTML = '<option value="">Select your district</option>';

  if (selectedState && INDIAN_STATES_DISTRICTS[selectedState]) {
    districtSelect.disabled = false;
    INDIAN_STATES_DISTRICTS[selectedState].forEach(dist => {
      const opt = document.createElement("option");
      opt.value = dist;
      opt.textContent = dist;
      districtSelect.appendChild(opt);
    });
  } else {
    districtSelect.disabled = true;
  }
}

async function handleOnboardingSubmit() {
  clearAuthError();

  const name = document.getElementById("onboard-name")?.value.trim();
  const ageStr = document.getElementById("onboard-age")?.value.trim();
  const state = document.getElementById("onboard-state")?.value;
  const district = document.getElementById("onboard-district")?.value;
  const language = document.getElementById("onboard-language")?.value || "en";
  const termsChecked = document.getElementById("onboard-terms")?.checked;

  // Validation
  if (!name || name.length < 2) {
    showAuthError("Please enter your full name (at least 2 characters).");
    return;
  }
  const age = parseInt(ageStr, 10);
  if (isNaN(age) || age < 13 || age > 120) {
    showAuthError("Please enter a valid age between 13 and 120.");
    return;
  }
  if (!state) {
    showAuthError("Please select your state.");
    return;
  }
  if (!district) {
    showAuthError("Please select your district.");
    return;
  }
  if (!termsChecked) {
    showAuthError("You must accept the Terms & Conditions to continue.");
    return;
  }

  // If user is not authenticated with Firebase yet, create a local session
  if (!currentUser) {
    currentUser = {
      uid: "farmer_" + Math.random().toString(36).substring(2, 9),
      displayName: name,
      email: ""
    };
  }

  const btn = document.getElementById("btn-complete-onboarding");
  setBtnLoading(btn, true, "Saving profile...");

  const profileData = {
    name: name,
    age: age,
    state: state,
    district: district,
    language: language,
    email: currentUser.email || "",
    authProvider: currentUser.providerData && currentUser.providerData[0] ? currentUser.providerData[0].providerId : "email",
    updatedAt: new Date().toISOString()
  };

  // 1. Always save to localStorage so the user is NEVER blocked
  try {
    localStorage.setItem("krishimitra_user_profile", JSON.stringify(profileData));
    if (currentUser && currentUser.uid) {
      localStorage.setItem(`km_profile_${currentUser.uid}`, JSON.stringify(profileData));
    }
  } catch (e) {
    console.warn("[Auth] LocalStorage save error:", e);
  }

  currentUserProfile = profileData;

  // 2. Best-effort Firestore sync in background
  if (firebaseDB && currentUser && currentUser.uid && !currentUser.uid.startsWith("farmer_")) {
    try {
      firebaseDB.collection("users").doc(currentUser.uid).set(profileData).catch(err => {
        console.warn("[Auth] Cloud Firestore sync note:", err);
      });
    } catch (err) {
      console.warn("[Auth] Firestore sync skipped:", err);
    }
  }

  // 3. Immediately apply to UI and enter chat!
  applyUserProfileToUI();
  setBtnLoading(btn, false, "Start Using KrishiMitra AI");
  
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.add("hidden");
  showChatView();
}

// ── Logout ──────────────────────────────────────────────────────────────────

async function handleLogout() {
  try {
    await firebaseAuth.signOut();
    currentUser = null;
    currentUserProfile = null;
    showLandingView();
  } catch (err) {
    console.error("[Auth] Logout error:", err);
  }
}

// ── UI Helpers ──────────────────────────────────────────────────────────────

function applyUserProfileToUI() {
  if (!currentUserProfile) return;

  const firstName = currentUserProfile.name ? currentUserProfile.name.split(" ")[0] : "Farmer";

  // Chat welcome heading
  const welcomeH1 = document.querySelector("#welcome-view h1");
  if (welcomeH1) {
    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17) greeting = "Good evening";
    welcomeH1.textContent = `${greeting}, ${firstName}`;
  }

  // Sidebar user info
  const sidebarInitials = document.getElementById("sidebar-user-initials");
  const sidebarName = document.getElementById("sidebar-user-name");
  const sidebarLocation = document.getElementById("sidebar-user-location");

  if (sidebarInitials) {
    const parts = currentUserProfile.name.split(" ");
    const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
    sidebarInitials.textContent = initials;
  }
  if (sidebarName) sidebarName.textContent = currentUserProfile.name;
  if (sidebarLocation) sidebarLocation.textContent = `${currentUserProfile.district}, ${currentUserProfile.state}`;

  // Set app language
  if (currentUserProfile.language && typeof changeLanguage === "function") {
    changeLanguage(currentUserProfile.language);
  }
}

function showAuthError(message) {
  const errBox = document.getElementById("auth-error-message");
  if (!errBox) return;
  errBox.innerHTML = `<span class="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5">error</span><span>${escapeHtml(message)}</span>`;
  errBox.classList.remove("hidden");
  const successBox = document.getElementById("auth-success-message");
  if (successBox) successBox.classList.add("hidden");
}

function clearAuthError() {
  const errBox = document.getElementById("auth-error-message");
  if (errBox) {
    errBox.innerHTML = "";
    errBox.classList.add("hidden");
  }
  const successBox = document.getElementById("auth-success-message");
  if (successBox) {
    successBox.innerHTML = "";
    successBox.classList.add("hidden");
  }
}

function showAuthSuccess(message) {
  const successBox = document.getElementById("auth-success-message");
  if (!successBox) return;
  successBox.innerHTML = `<span class="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5">check_circle</span><span>${escapeHtml(message)}</span>`;
  successBox.classList.remove("hidden");
  const errBox = document.getElementById("auth-error-message");
  if (errBox) errBox.classList.add("hidden");
}

function setBtnLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.origHtml = btn.innerHTML;
    btn.innerHTML = `<div class="auth-spinner !w-4 !h-4 !border-2"></div><span>${text}</span>`;
    btn.classList.add("opacity-80", "cursor-not-allowed");
  } else {
    if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
    }
    btn.classList.remove("opacity-80", "cursor-not-allowed");
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
