/**
 * KrishiMitra AI — Authentication & Onboarding Controller
 * 
 * Handles:
 *  - Firebase Phone OTP authentication (send, verify, resend)
 *  - New user onboarding (name, age, state, district, language, T&C)
 *  - Session persistence via Firebase Auth state
 *  - User profile storage in Firestore
 *  - Auth guards for chat access
 *  - Logout functionality
 * 
 * Dependencies: firebase-config.js must be loaded first (provides firebaseAuth, firebaseDB)
 */

// ── Auth State ──────────────────────────────────────────────────────────────
let currentUser = null;        // Firebase user object
let currentUserProfile = null; // Firestore profile doc { name, age, state, district, language }
let confirmationResult = null; // Firebase OTP confirmation handle
let recaptchaVerifier = null;  // Invisible reCAPTCHA
let otpResendTimer = null;     // Interval handle for countdown
let otpResendSeconds = 0;      // Countdown seconds remaining

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
document.addEventListener("DOMContentLoaded", () => {
  initRecaptcha();
  populateStateDropdown();
  setupAuthStateListener();
});

/**
 * Set up invisible reCAPTCHA verifier for Firebase Phone Auth.
 */
function initRecaptcha() {
  try {
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
      size: "invisible",
      callback: () => { /* reCAPTCHA solved — will proceed with sendOTP */ },
      "expired-callback": () => {
        showAuthError("Security check expired. Please try again.");
        recaptchaVerifier.render().then(widgetId => {
          grecaptcha.reset(widgetId);
        });
      }
    });
    recaptchaVerifier.render();
  } catch (e) {
    console.error("[Auth] reCAPTCHA init error:", e);
  }
}

/**
 * Firebase auth state listener — runs on every page load and auth change.
 * This is the SINGLE source of truth for routing decisions.
 */
function setupAuthStateListener() {
  showAuthLoading(true);

  firebaseAuth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      console.log("[Auth] User signed in:", user.phoneNumber);

      // Check if profile exists in Firestore
      try {
        const profileDoc = await firebaseDB.collection("users").doc(user.uid).get();
        if (profileDoc.exists) {
          currentUserProfile = profileDoc.data();
          applyUserProfileToUI();
          showAuthLoading(false);
          // Existing user — go to chat
          showChatView();
        } else {
          // New user — needs onboarding
          showAuthLoading(false);
          showOnboardingStep();
        }
      } catch (err) {
        console.error("[Auth] Firestore profile fetch error:", err);
        showAuthLoading(false);
        showOnboardingStep(); // Fallback: show onboarding if Firestore fails
      }
    } else {
      // Not logged in
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

/** Show the phone number input step */
function showLoginStep() {
  document.getElementById("landing-view").classList.add("hidden");
  document.getElementById("chat-view").classList.add("hidden");

  const modal = document.getElementById("auth-modal");
  modal.classList.remove("hidden");
  document.getElementById("auth-step-phone").classList.remove("hidden");
  document.getElementById("auth-step-otp").classList.add("hidden");
  document.getElementById("auth-step-onboarding").classList.add("hidden");

  clearAuthError();
  const phoneInput = document.getElementById("farmer-phone-input");
  if (phoneInput) { phoneInput.value = ""; phoneInput.focus(); }
}

/** Show the OTP verification step */
function showOTPStep() {
  document.getElementById("auth-step-phone").classList.add("hidden");
  document.getElementById("auth-step-otp").classList.remove("hidden");
  document.getElementById("auth-step-onboarding").classList.add("hidden");
  clearAuthError();

  // Focus first OTP digit
  const firstDigit = document.getElementById("otp-digit-1");
  if (firstDigit) firstDigit.focus();

  // Start resend countdown (30 seconds)
  startResendCountdown(30);
}

/** Show the onboarding form step */
function showOnboardingStep() {
  document.getElementById("landing-view").classList.add("hidden");
  document.getElementById("chat-view").classList.add("hidden");

  const modal = document.getElementById("auth-modal");
  modal.classList.remove("hidden");
  document.getElementById("auth-step-phone").classList.add("hidden");
  document.getElementById("auth-step-otp").classList.add("hidden");
  document.getElementById("auth-step-onboarding").classList.remove("hidden");
  clearAuthError();
}

/** Auth guard — called by all "Get Started" / chat buttons */
function authGuardShowChat() {
  if (currentUser && currentUserProfile) {
    showChatView();
  } else if (currentUser && !currentUserProfile) {
    showOnboardingStep();
  } else {
    showLoginStep();
  }
}

// ── Phone Number Submission ─────────────────────────────────────────────────

async function handleSendOTP() {
  const phoneInput = document.getElementById("farmer-phone-input");
  const rawPhone = phoneInput ? phoneInput.value.trim() : "";

  // Validate: must be 10 digits
  const cleaned = rawPhone.replace(/\D/g, "");
  if (cleaned.length !== 10) {
    showAuthError("Please enter a valid 10-digit mobile number.");
    return;
  }

  const fullPhone = "+91" + cleaned;
  const btn = document.getElementById("btn-send-otp");
  setBtnLoading(btn, true, "Sending OTP...");
  clearAuthError();

  // Check if Firebase config is still using placeholders
  if (typeof firebaseConfig !== "undefined" && (firebaseConfig.apiKey.includes("DummyKey") || firebaseConfig.projectId.includes("your-project-id"))) {
    showAuthError("Firebase is not configured yet. Please add your Firebase project credentials to frontend/js/firebase-config.js.");
    setBtnLoading(btn, false, "Continue with OTP");
    return;
  }

  try {
    if (!recaptchaVerifier) {
      initRecaptcha();
    }
    confirmationResult = await firebaseAuth.signInWithPhoneNumber(fullPhone, recaptchaVerifier);
    console.log("[Auth] OTP sent to", fullPhone);

    // Update UI to show which number the OTP was sent to
    const otpPhoneDisplay = document.getElementById("otp-phone-display");
    if (otpPhoneDisplay) otpPhoneDisplay.textContent = "+91 " + cleaned.replace(/(\d{5})(\d{5})/, "$1 $2");

    showOTPStep();
  } catch (err) {
    console.error("[Auth] OTP send error:", err);
    let msg = "Failed to send OTP: " + (err.message || "Please check your network and Firebase configuration.");
    if (err.code === "auth/invalid-phone-number") msg = "Invalid phone number format. Please check and try again.";
    if (err.code === "auth/too-many-requests") msg = "Too many OTP requests. Please wait a few minutes and try again.";
    if (err.code === "auth/captcha-check-failed") msg = "Security verification failed. Please refresh the page and try again.";
    if (err.code === "auth/api-key-not-valid") msg = "Firebase API Key is invalid. Please check your credentials in frontend/js/firebase-config.js.";
    if (err.code === "auth/unauthorized-domain") msg = "This domain is not authorized in Firebase Console. Add '" + window.location.hostname + "' under Firebase Auth → Settings → Authorized Domains.";
    showAuthError(msg);

    // Reset reCAPTCHA on error
    try { recaptchaVerifier.render().then(wid => grecaptcha.reset(wid)); } catch (_) {}
  } finally {
    setBtnLoading(btn, false, "Continue with OTP");
  }
}

// ── OTP Verification ────────────────────────────────────────────────────────

async function handleVerifyOTP() {
  const otp = getOTPValue();
  if (otp.length !== 6) {
    showAuthError("Please enter the complete 6-digit OTP.");
    return;
  }

  if (!confirmationResult) {
    showAuthError("OTP session expired. Please request a new OTP.");
    return;
  }

  const btn = document.getElementById("btn-verify-otp");
  setBtnLoading(btn, true, "Verifying...");
  clearAuthError();

  try {
    await confirmationResult.confirm(otp);
    // Firebase onAuthStateChanged will handle the rest (profile check → chat or onboarding)
  } catch (err) {
    console.error("[Auth] OTP verify error:", err);
    let msg = "Invalid OTP. Please check and try again.";
    if (err.code === "auth/code-expired") msg = "OTP has expired. Please request a new one.";
    if (err.code === "auth/invalid-verification-code") msg = "Incorrect OTP code. Please re-check.";
    showAuthError(msg);
    clearOTPInputs();
  } finally {
    setBtnLoading(btn, false, "Verify & Continue");
  }
}

function getOTPValue() {
  let otp = "";
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById("otp-digit-" + i);
    otp += el ? el.value : "";
  }
  return otp;
}

function clearOTPInputs() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById("otp-digit-" + i);
    if (el) el.value = "";
  }
  const first = document.getElementById("otp-digit-1");
  if (first) first.focus();
}

/** Auto-advance OTP digits and handle backspace */
function handleOTPInput(el, index) {
  const val = el.value.replace(/\D/g, "");
  el.value = val.slice(-1); // Keep only last digit

  if (val && index < 6) {
    const next = document.getElementById("otp-digit-" + (index + 1));
    if (next) next.focus();
  }

  // Auto-submit when all 6 digits are filled
  if (index === 6 && val) {
    const fullOtp = getOTPValue();
    if (fullOtp.length === 6) handleVerifyOTP();
  }
}

function handleOTPKeydown(e, index) {
  if (e.key === "Backspace" && !e.target.value && index > 1) {
    const prev = document.getElementById("otp-digit-" + (index - 1));
    if (prev) { prev.value = ""; prev.focus(); }
  }
  if (e.key === "Enter") {
    handleVerifyOTP();
  }
}

/** Handle paste of full OTP code */
function handleOTPPaste(e) {
  e.preventDefault();
  const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
  for (let i = 0; i < pasted.length; i++) {
    const el = document.getElementById("otp-digit-" + (i + 1));
    if (el) el.value = pasted[i];
  }
  if (pasted.length === 6) handleVerifyOTP();
}

// ── Resend OTP ──────────────────────────────────────────────────────────────

function startResendCountdown(seconds) {
  otpResendSeconds = seconds;
  const resendBtn = document.getElementById("btn-resend-otp");
  const timerEl = document.getElementById("resend-timer");
  if (resendBtn) resendBtn.disabled = true;
  if (resendBtn) resendBtn.classList.add("opacity-50", "cursor-not-allowed");

  updateResendTimerDisplay();

  if (otpResendTimer) clearInterval(otpResendTimer);
  otpResendTimer = setInterval(() => {
    otpResendSeconds--;
    if (otpResendSeconds <= 0) {
      clearInterval(otpResendTimer);
      if (resendBtn) { resendBtn.disabled = false; resendBtn.classList.remove("opacity-50", "cursor-not-allowed"); }
      if (timerEl) timerEl.textContent = "";
    } else {
      updateResendTimerDisplay();
    }
  }, 1000);
}

function updateResendTimerDisplay() {
  const timerEl = document.getElementById("resend-timer");
  if (timerEl) timerEl.textContent = `(${otpResendSeconds}s)`;
}

async function handleResendOTP() {
  const phoneInput = document.getElementById("farmer-phone-input");
  const rawPhone = phoneInput ? phoneInput.value.trim().replace(/\D/g, "") : "";
  if (rawPhone.length !== 10) {
    showAuthError("Phone number lost. Please go back and re-enter.");
    return;
  }

  clearAuthError();
  clearOTPInputs();

  try {
    if (!recaptchaVerifier) initRecaptcha();
    confirmationResult = await firebaseAuth.signInWithPhoneNumber("+91" + rawPhone, recaptchaVerifier);
    showAuthSuccess("New OTP sent successfully!");
    startResendCountdown(30);
  } catch (err) {
    console.error("[Auth] Resend OTP error:", err);
    if (err.code === "auth/too-many-requests") {
      showAuthError("Too many requests. Please wait a few minutes.");
    } else {
      showAuthError("Failed to resend OTP. Please try again.");
    }
  }
}

function handleChangeNumber() {
  if (otpResendTimer) clearInterval(otpResendTimer);
  confirmationResult = null;
  showLoginStep();
}

// ── Onboarding Form ─────────────────────────────────────────────────────────

function populateStateDropdown() {
  const select = document.getElementById("onboard-state");
  if (!select) return;

  select.innerHTML = '<option value="">Select your state</option>';
  Object.keys(INDIAN_STATES_DISTRICTS).sort().forEach(state => {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    select.appendChild(opt);
  });
}

function onStateChange() {
  const stateVal = document.getElementById("onboard-state").value;
  const districtSelect = document.getElementById("onboard-district");
  districtSelect.innerHTML = '<option value="">Select your district</option>';

  if (stateVal && INDIAN_STATES_DISTRICTS[stateVal]) {
    INDIAN_STATES_DISTRICTS[stateVal].forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });
    districtSelect.disabled = false;
  } else {
    districtSelect.disabled = true;
  }
}

async function handleOnboardingSubmit() {
  clearAuthError();

  const name = document.getElementById("onboard-name").value.trim();
  const ageStr = document.getElementById("onboard-age").value.trim();
  const state = document.getElementById("onboard-state").value;
  const district = document.getElementById("onboard-district").value;
  const language = document.getElementById("onboard-language").value || "en";
  const termsChecked = document.getElementById("onboard-terms").checked;

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

  if (!currentUser) {
    showAuthError("Authentication session lost. Please log in again.");
    setTimeout(() => showLoginStep(), 2000);
    return;
  }

  const btn = document.getElementById("btn-complete-onboarding");
  setBtnLoading(btn, true, "Saving profile...");

  const profileData = {
    name: name,
    age: age,
    state: state,
    district: district,
    language: language,
    phone: currentUser.phoneNumber || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await firebaseDB.collection("users").doc(currentUser.uid).set(profileData);
    currentUserProfile = profileData;
    applyUserProfileToUI();
    
    // Close auth modal and go to chat
    document.getElementById("auth-modal").classList.add("hidden");
    showChatView();
  } catch (err) {
    console.error("[Auth] Profile save error:", err);
    showAuthError("Failed to save your profile. Please try again.");
  } finally {
    setBtnLoading(btn, false, "Start Using KrishiMitra AI");
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────

async function handleLogout() {
  try {
    await firebaseAuth.signOut();
    currentUser = null;
    currentUserProfile = null;
    // onAuthStateChanged listener will handle the routing to landing view
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

function showAuthError(msg) {
  const el = document.getElementById("auth-error-message");
  if (el) { el.textContent = msg; el.classList.remove("hidden"); }
}

function showAuthSuccess(msg) {
  const el = document.getElementById("auth-success-message");
  if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  setTimeout(() => { if (el) el.classList.add("hidden"); }, 3000);
}

function clearAuthError() {
  const errEl = document.getElementById("auth-error-message");
  const sucEl = document.getElementById("auth-success-message");
  if (errEl) errEl.classList.add("hidden");
  if (sucEl) sucEl.classList.add("hidden");
}

function setBtnLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  const span = btn.querySelector("span:first-child") || btn;
  if (loading) {
    btn.classList.add("opacity-70", "cursor-not-allowed");
    span.textContent = text || "Loading...";
  } else {
    btn.classList.remove("opacity-70", "cursor-not-allowed");
    span.textContent = text || "Continue";
  }
}

/**
 * Get the Firebase ID token to send with API requests.
 * Returns null if the user is not authenticated.
 */
async function getAuthToken() {
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(/* forceRefresh */ false);
  } catch (err) {
    console.error("[Auth] Token fetch error:", err);
    return null;
  }
}
