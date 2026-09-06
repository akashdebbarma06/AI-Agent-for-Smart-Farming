/**
 * KrishiMitra AI — Full Frontend Controller
 * 
 * Coordinates:
 *  - Landing View & Dedicated AI Assistant Chat View Navigation
 *  - Interactive 4-Part Diagnostic Engine Simulation (Paddy, Cotton, Tomato, Mustard)
 *  - Real-time API communication with FastAPI backend (/api/v1/chat & /api/v1/health)
 *  - Claude & ChatGPT-style Clean Conversation Stream with Structured RAG Parser
 *  - Multilingual voice recognition (Web Speech API) & synthesized audio playback
 *  - Image attachments & Vision diagnosis simulation
 *  - Indian Mobile OTP Authentication Modal
 */

// Backend Endpoint Configuration
const PRODUCTION_API_URL = "https://krishimitra-api-g5d8.onrender.com";

// Dynamically determine API Base URL (Supports localhost dev & production live API)
const API_BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? (window.location.port === "8000" ? "" : "http://localhost:8000")
  : PRODUCTION_API_URL;

const CHAT_ENDPOINT = `${API_BASE_URL}/api/v1/chat`;
const HEALTH_ENDPOINT = `${API_BASE_URL}/api/v1/health`;

// ── Application State ───────────────────────────────────────────────────────
let currentLanguage = "en"; // "en" | "hi" | "te" | "bn"
let isWaiting = false;
let attachedImageData = null;
let activeFocusIndex = 0;
let recognition = null;
let isRecordingVoice = false;

const focusTools = [
  { icon: "🌱", label: "Crop Advisory", prefix: "Crop guidance: " },
  { icon: "🧪", label: "Soil & Nutrients", prefix: "Soil nutrient analysis: " },
  { icon: "🐛", label: "Pest & Disease", prefix: "Pest diagnosis: " },
  { icon: "⚡", label: "Fertilizer Calculator", prefix: "Calculate split fertilizer dosage for: " },
  { icon: "🌧️", label: "Weather Alert", prefix: "Weather and safe spray forecast for: " },
  { icon: "📊", label: "Mandi Market", prefix: "Mandi modal prices and trend for: " }
];

// ── Interactive Sample Data for Live Preview Section ────────────────────────
const sampleData = {
  paddy: {
    query: "Paddy crop has brown spots and yellowing tips in West Bengal",
    title: "Brown Plant Hopper (BPH) with Early Sheath Blight",
    urgency: "Recommended Action Window: Within 24 to 36 Hours (Hopper burn threat high in alluvial basin)",
    reasoning: "Current high relative humidity (>88%) and standing stagnant water in West Bengal’s lower Gangetic plains create an ideal microclimate for nymph multiplication. The sap-sucking nymphs cause xylem vascular collapse, presenting as yellow-orange discoloration progressing downwards from leaf apices.",
    pest: "Nilaparvata lugens",
    trigger: "Humidity 88% / 29°C",
    etl: "5-10 hoppers / hill",
    protocol: "Pkg Rabi-Rice #4B",
    step1: "Drain Standing Water: Temporarily drain field standing water for 48 hours to expose nymph habitat at the base of tillers.",
    step2: "Targeted Spray Application: Spray Pymetrozine 50% WG @ 120g/acre or Triflumuron 39.35% SC diluted in 200 Litres of clean water.",
    step3: "Nozzle & Delivery Adjustment: Direct hollow-cone nozzle spray towards the lower canopy and stem base, not on top foliage.",
    precaution: "Pre-Harvest Interval (PHI): Maintain a mandatory 19-day buffer before harvesting. Avoid synthetic pyrethroids (e.g., Cypermethrin) which induce secondary pest resurgence. Wear protective mask and gloves."
  },
  cotton: {
    query: "Cotton leaves curling upwards with white flying insects and sticky black mold",
    title: "Cotton Whitefly (Bemisia tabaci) & Associated Sooty Mold",
    urgency: "Recommended Action Window: Immediate (Within 12 Hours before Leaf Curl Virus transmission)",
    reasoning: "Prolonged dry spells followed by intermittent drizzle encourage rapid whitefly vector flare-ups. Excreted honeydew provides substrate for Capnodium sp. (sooty mold), severely impairing photosynthetic surface area on upper foliage.",
    pest: "Bemisia tabaci (Whitefly)",
    trigger: "Dry spell / Temp 32-35°C",
    etl: "6-8 adults / leaf",
    protocol: "ICAR-CICR Cotton #09",
    step1: "Install Yellow Sticky Traps: Place 8-10 bright yellow sticky traps per acre at crop canopy height to monitor adult swarm density.",
    step2: "Systemic Foliar Spray: Apply Afidopyropen 50 g/L DC @ 400 ml/acre or Diafenthiuron 50% WP @ 240g/acre mixed in 200L water.",
    step3: "Neem Bio-barrier: Follow up with 5ml/L Cold-Pressed Neem Oil (10,000 ppm azadirachtin) after 5 days as a natural oviposition deterrent.",
    precaution: "Never spray during peak pollination hours (9 AM - 11 AM) to safeguard honeybees. Observe 30-day PHI before boll picking."
  },
  tomato: {
    query: "Tomato plants flowering stage: calculate balanced NPK and Zinc booster ratio",
    title: "Stage-Specific Nutrient Plan: Flowering to Fruit Set (Tomato)",
    urgency: "Recommended Action Window: Scheduled Split-Application (Next Irrigation Turn)",
    reasoning: "Excessive Nitrogen at the pre-bloom stage induces vegetative hypertrophy, leading to flower abscission and poor fruit set. Shifting the ratio toward high Potassium with chelated Zinc and Boron accelerates flower retention and cell wall elasticity.",
    pest: "Nutrient Partitioning Deficit",
    trigger: "Early flowering flush",
    etl: "Target: 45-50 T/Ha",
    protocol: "IIHR Precision Tomato Spec",
    step1: "Fertigation Split: Apply water-soluble N:P:K 13:0:45 (Potassium Nitrate) @ 3.5 kg/acre per fertigation cycle twice a week.",
    step2: "Micronutrient Foliar Spray: Spray Boron (20% Solubor) @ 1g/L and Chelated Zinc (EDTA Zn 12%) @ 1g/L during cool evening hours.",
    step3: "Calcium Fortification: Apply Calcium Nitrate @ 2.5 kg/acre to soil to prevent future Blossom End Rot (BER) in developing fruits.",
    precaution: "Do not mix Calcium Nitrate with Phosphatic fertilizers (e.g., 0:52:34) in the same tank to prevent insoluble precipitation."
  },
  mustard: {
    query: "Mustard pods and tender shoots covered with dense green-black aphids",
    title: "Mustard Aphid (Lipaphis erysimi) Colony Arrest",
    urgency: "Recommended Action Window: Within 24 Hours (Flowering stage vulnerability)",
    reasoning: "Overcast conditions and cold morning fog create peak multiplication conditions for mustard aphids. Both nymphs and adults desap the inflorescence and siliquae, causing pod curling, stunted seed filling, and up to 40% oil loss.",
    pest: "Lipaphis erysimi (Aphid)",
    trigger: "Overcast / High Fog Index",
    etl: "1.5-2 cm colony / twig",
    protocol: "DRMR Bharatpur Protocol",
    step1: "Selective Perimeter Spray: If infestation is confined to field margins, treat border rows first to preserve predatory Ladybird beetles.",
    step2: "Targeted Chemistry: Spray Dimethoate 30% EC @ 1.7 ml/L or Thiamethoxam 25% WG @ 0.2g/L using a fine mist knapsack sprayer.",
    step3: "Irrigation Scheduling: Provide light furrow irrigation 24 hours after spray to restore root turgor without washing away chemical.",
    precaution: "Avoid spraying during active bee foraging hours (mid-day). Strictly adhere to a 15-day pre-harvest waiting period."
  }
};

// ── Pre-stored consultation history data for AI Chat ────────────────────────
const consultationPresets = {
  "tomato-leaf-curl": {
    query: "My tomato plant leaves are curling upwards and showing yellow veins. Some flowers are dropping. What should I do?",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKvkSRT0gDaNwWtciIk9XRgRLeqV_QaRYBB4z9ofrqu5xSI_x6rQwow5uLpPdBPPOhNVAKmhQ4E1gMZMnhQTbj4_WjmKR13qY66aJca_ayIZ-iC3-2Cl9jWhRodNpRKL9LVwHNT6wJIDlQTFk7PdMdABRSoxol0Xb9KAlNq4RTTn2elWyu94PKPjH4QtmqVrkJMr7o3gPvwOgGrLtBzX5n4QQVj5M-V3FteZPPfMsyq5BIPFubUPDq",
    title: "Tomato Yellow Leaf Curl Virus (TYLCV) Vector Suppression",
    directAnswer: "Immediately deploy bright yellow sticky traps (6–8/acre) and spray cold-pressed Neem Seed Oil (10,000 ppm) @ 3 ml/L with 1 ml khadi soap to arrest the Whitefly (Bemisia tabaci) vector before floral abortion worsens.",
    reasoning: "TYLCV is a systemic geminivirus. Chemical sprays cannot cure infected leaves directly; intervention is entirely focused on suppressing the sap-sucking whitefly vector to safeguard undamaged lateral shoots and fruit set.",
    metrics: [
      { label: "Yield Loss Risk", val: "40–70%", sub: "if untreated" },
      { label: "Vector Cycle", val: "14 Days", sub: "multiplication" },
      { label: "Action Window", val: "48 Hours", sub: "critical" }
    ],
    steps: [
      { num: 1, title: "Install Yellow Sticky Traps:", desc: "Mount 6 to 8 traps/acre at canopy height to capture reproducing adults." },
      { num: 2, title: "Rogue Diseased Reservoirs:", desc: "Uproot severely stunted plants showing dense yellow vein mosaic and seal in disposal bags away from field borders." },
      { num: 3, title: "Targeted Bio/Chemical Spray:", desc: "Apply cold-pressed Neem Oil (10,000 ppm) @ 3 ml/L or Diafenthiuron 50% WP @ 240g/acre in 200L clean water targeting leaf undersides." }
    ],
    caution: "Adhere strictly to CIBRC registered dosages and mandatory Pre-Harvest Intervals (PHI). Never spray systemic insecticides during peak morning pollinator flight hours."
  },
  "urea-dosage-paddy": {
    query: "What is the recommended split dosage of Urea for Basmati Paddy during panicle initiation?",
    title: "Basmati Paddy Nitrogen Partitioning & Urea Top-Dressing",
    directAnswer: "Apply 25 kg/acre Urea blended with 5 kg Zinc Sulphate (21%) as the final top-dress at 45–50 days after transplanting (DAT) under moist, shallow-drained soil conditions.",
    reasoning: "Basmati cultivars require 25-30% lower nitrogen than semi-dwarf varieties. Indiscriminate excess promotes vegetative lodging and increases susceptibility to sheath blight and blast.",
    metrics: [
      { label: "Split Dose", val: "25 kg/Acre", sub: "Urea" },
      { label: "LCC Threshold", val: "Score < 4", sub: "Leaf Colour" },
      { label: "Aroma Lock", val: "+18%", sub: "Grain quality" }
    ],
    steps: [
      { num: 1, title: "Check Leaf Colour Chart (LCC):", desc: "Compare upper fully expanded leaves with the standard ICAR LCC. Apply only if greenness is below shade 4." },
      { num: 2, title: "Broadcast Neem-Coated Urea:", desc: "Broadcast evenly after morning dew has completely evaporated to prevent foliar scorch." },
      { num: 3, title: "Irrigation Scheduling:", desc: "Re-introduce a 2–3 cm shallow water layer 24 hours after application to minimize leaching." }
    ],
    caution: "Do not apply nitrogen fertilizers immediately preceding heavy rainfall forecasts to prevent nutrient runoff into drainage channels."
  },
  "black-soil-moisture": {
    query: "How can I improve soil moisture retention and prevent deep cracks in black cotton soil?",
    title: "Vertisol Black Cotton Soil Moisture Conservation",
    directAnswer: "Implement shallow dust mulching (inter-cultivation with a blade harrow) and spread 2 tonnes/acre of organic crop residue to break capillary pores and lock deep root-zone moisture.",
    reasoning: "High smectite clay content in Vertisols expands when wet and shrinks dramatically when dry. Deep structural fissures accelerate subsoil convective evaporation.",
    metrics: [
      { label: "Moisture Saved", val: "35–40%", sub: "Capillary lock" },
      { label: "Crack Mitigation", val: "65%", sub: "Physical barrier" },
      { label: "Operating Cost", val: "Minimal", sub: "Farm biomass" }
    ],
    steps: [
      { num: 1, title: "Shallow Inter-Cultivation:", desc: "Run a blade harrow (Danti/Kolpa) across crop rows to create a 2-inch pulverized soil mulch." },
      { num: 2, title: "Biomass Mulch Blanket:", desc: "Spread dry straw or sugarcane bagasse across beds to moderate soil surface temperatures." },
      { num: 3, title: "Broad Bed & Furrow Layout:", desc: "Adopt BBF layout for subsequent sowing cycles for optimal drainage and moisture capture." }
    ],
    caution: "Avoid machinery movement when soil moisture is near field capacity to prevent severe subsoil compaction."
  }
};

// ── DOM Initialization ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initComposerAutoGrow();
  initVoiceRecognition();
  checkBackendHealth();
  
  // Shortcut key for new consultation (Cmd+K / Ctrl+K)
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      showChatView();
      startNewConsultation();
    }
  });
});

// ── View Switching (Landing vs. Chat Workspace) ──────────────────────────────
function showLandingView() {
  document.getElementById("chat-view").classList.add("hidden");
  document.getElementById("landing-view").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showChatView() {
  document.getElementById("landing-view").classList.add("hidden");
  document.getElementById("chat-view").classList.remove("hidden");
  const heroInp = document.getElementById("agroQueryInput");
  if (heroInp) heroInp.focus();
}

// ── Live Preview Sample Loader ───────────────────────────────────────────────
function loadSample(key) {
  const data = sampleData[key];
  if (!data) return;

  // Update button visual styles
  ['paddy', 'cotton', 'tomato', 'mustard'].forEach(k => {
    const btn = document.getElementById('btn-' + k);
    if (btn) {
      if (k === key) {
        btn.className = "px-4 py-2 rounded-full bg-primary text-on-primary text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer";
      } else {
        btn.className = "px-4 py-2 rounded-full bg-surface-container-highest text-on-surface text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer";
      }
    }
  });

  const box = document.getElementById('ai-response-box');
  if (!box) return;
  box.classList.add('opacity-40');

  setTimeout(() => {
    const titleEl = document.getElementById('diag-title');
    const urgencyEl = document.getElementById('diag-urgency');
    const reasoningEl = document.getElementById('diag-reasoning');
    const pestEl = document.getElementById('meta-pest');
    const triggerEl = document.getElementById('meta-trigger');
    const etlEl = document.getElementById('meta-etl');
    const protocolEl = document.getElementById('meta-protocol');
    const part3 = document.getElementById('diag-part-3');
    const precautionEl = document.getElementById('diag-precaution');

    if (titleEl) titleEl.textContent = data.title;
    if (urgencyEl) urgencyEl.textContent = data.urgency;
    if (reasoningEl) reasoningEl.textContent = data.reasoning;
    if (pestEl) pestEl.textContent = data.pest;
    if (triggerEl) triggerEl.textContent = data.trigger;
    if (etlEl) etlEl.textContent = data.etl;
    if (protocolEl) protocolEl.textContent = data.protocol;

    if (part3) {
      const steps = part3.querySelectorAll('.step-text');
      if (steps[0]) steps[0].innerHTML = `<strong>Step 1:</strong> ${data.step1}`;
      if (steps[1]) steps[1].innerHTML = `<strong>Step 2:</strong> ${data.step2}`;
      if (steps[2]) steps[2].innerHTML = `<strong>Step 3:</strong> ${data.step3}`;
    }

    if (precautionEl) precautionEl.textContent = data.precaution;

    box.classList.remove('opacity-40');
  }, 150);
}

function playMockAudio() {
  const lbl = document.getElementById('audio-lbl');
  if (!lbl || lbl.textContent.includes('Playing')) return;
  const original = lbl.textContent;
  lbl.textContent = 'Playing synthesized voice note...';
  
  if ('speechSynthesis' in window) {
    const reasonText = document.getElementById('diag-reasoning')?.textContent || "KrishiMitra agronomic voice advisory.";
    const utterance = new SpeechSynthesisUtterance(reasonText);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    utterance.onend = () => { lbl.textContent = original; };
  } else {
    setTimeout(() => {
      lbl.textContent = original;
    }, 3000);
  }
}

// ── Auth Modal (Indian Mobile OTP) ───────────────────────────────────────────
function openAuthModal() {
  document.getElementById("auth-modal").classList.remove("hidden");
  const phoneInp = document.getElementById("farmer-phone-input");
  if (phoneInp) phoneInp.focus();
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.add("hidden");
}

function handleSendOTP() {
  const phoneInp = document.getElementById("farmer-phone-input");
  const btn = document.getElementById("btn-send-otp");
  const val = phoneInp ? phoneInp.value.trim() : "";
  
  if (val.length < 10) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }

  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>Sending OTP...</span>`;
  setTimeout(() => {
    btn.innerHTML = `<span class="material-symbols-outlined text-base">check_circle</span><span>OTP Sent! Verifying...</span>`;
    setTimeout(() => {
      closeAuthModal();
      showChatView();
      btn.innerHTML = `<span>Continue with OTP</span><span class="material-symbols-outlined text-base">arrow_forward</span>`;
    }, 1000);
  }, 900);
}

// ── Composer Auto-Expand ─────────────────────────────────────────────────────
function initComposerAutoGrow() {
  const heroInp = document.getElementById("agroQueryInput");
  const dockInp = document.getElementById("dockQueryInput");

  [heroInp, dockInp].forEach(tx => {
    if (!tx) return;
    tx.addEventListener("input", function() {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 180) + "px";
    });

    tx.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (tx.id === "agroQueryInput") {
          submitUserQuery();
        } else {
          submitDockQuery();
        }
      }
    });
  });
}

// ── Focus Tool Cycle ─────────────────────────────────────────────────────────
function cycleFocusTool() {
  activeFocusIndex = (activeFocusIndex + 1) % focusTools.length;
  const tool = focusTools[activeFocusIndex];
  const iconEl = document.getElementById("focus-icon");
  const labelEl = document.getElementById("focus-label");
  if (iconEl) iconEl.textContent = tool.icon;
  if (labelEl) labelEl.textContent = tool.label;
}

// ── Navigation & Sidebar Toggle (Responsive Mobile & Desktop) ───────────────
function toggleMobileNav() {
  const menu = document.getElementById("mobile-nav-menu");
  if (menu) {
    menu.classList.toggle("hidden");
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (!sidebar) return;

  const isMobile = window.innerWidth < 1024;
  if (isMobile) {
    if (sidebar.classList.contains("-translate-x-full")) {
      sidebar.classList.remove("-translate-x-full");
      sidebar.classList.add("translate-x-0");
      if (backdrop) backdrop.classList.remove("hidden");
    } else {
      sidebar.classList.add("-translate-x-full");
      sidebar.classList.remove("translate-x-0");
      if (backdrop) backdrop.classList.add("hidden");
    }
  } else {
    sidebar.classList.toggle("lg:hidden");
  }
}

// ── Language Selector ────────────────────────────────────────────────────────
function changeLanguage(lang) {
  currentLanguage = lang;
  
  // Sync dropdowns
  const landSelect = document.getElementById("landing-lang-select");
  const chatSelect = document.getElementById("chat-lang-select");
  if (landSelect) landSelect.value = lang;
  if (chatSelect) chatSelect.value = lang;

  const placeholders = {
    en: "Ask about crop diagnostics, soil health, fertilizer dosages, or mandi rates...",
    hi: "फसल रोग, मिट्टी की सेहत, खाद की मात्रा या मंडी भाव के बारे में पूछें...",
    te: "పంటల తెగుళ్లు, నేల ఆరోగ్యం, ఎరువుల మోతాదు లేదా మార్కెట్ ధరల గురించి అడగండి...",
    bn: "ফসলের রোগ, মাটির স্বাস্থ্য, সারের মাত্রা বা বাজার দর সম্পর্কে জিজ্ঞাসা করুন..."
  };

  const inp = document.getElementById("agroQueryInput");
  const dock = document.getElementById("dockQueryInput");
  if (inp) inp.placeholder = placeholders[lang] || placeholders.en;
  if (dock) dock.placeholder = placeholders[lang] || placeholders.en;
}

// ── Image Attachment Handling ────────────────────────────────────────────────
function handleImageSelection(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    attachedImageData = {
      name: file.name,
      url: event.target.result,
      file: file
    };

    const preview = document.getElementById("hero-img-preview");
    if (preview) {
      document.getElementById("hero-img-thumb").src = event.target.result;
      document.getElementById("hero-img-name").textContent = file.name;
      preview.classList.remove("hidden");
      preview.classList.add("flex");
    }
  };
  reader.readAsDataURL(file);
}

function removeAttachedImage() {
  attachedImageData = null;
  const preview = document.getElementById("hero-img-preview");
  if (preview) {
    preview.classList.add("hidden");
    preview.classList.remove("flex");
  }
  const fileInput = document.getElementById("file-input-photo");
  if (fileInput) fileInput.value = "";
}

// ── Voice Input (Web Speech API) ─────────────────────────────────────────────
function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Web Speech API not supported on this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecordingVoice = true;
    updateMicButtonUI(true);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const heroInp = document.getElementById("agroQueryInput");
    const dockInp = document.getElementById("dockQueryInput");

    const activeView = document.getElementById("welcome-view").classList.contains("hidden") ? "dock" : "hero";
    if (activeView === "hero" && heroInp) {
      heroInp.value = (heroInp.value ? heroInp.value + " " : "") + transcript;
      heroInp.dispatchEvent(new Event("input"));
    } else if (dockInp) {
      dockInp.value = (dockInp.value ? dockInp.value + " " : "") + transcript;
      dockInp.dispatchEvent(new Event("input"));
    }
  };

  recognition.onerror = () => {
    isRecordingVoice = false;
    updateMicButtonUI(false);
  };

  recognition.onend = () => {
    isRecordingVoice = false;
    updateMicButtonUI(false);
  };
}

function toggleVoiceInput() {
  if (!recognition) {
    alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    return;
  }

  if (isRecordingVoice) {
    recognition.stop();
  } else {
    const langMap = { en: "en-IN", hi: "hi-IN", te: "te-IN", bn: "bn-IN" };
    recognition.lang = langMap[currentLanguage] || "en-IN";
    recognition.start();
  }
}

function updateMicButtonUI(recording) {
  const heroMic = document.getElementById("hero-mic-icon");
  const dockMic = document.getElementById("dock-mic-icon");

  [heroMic, dockMic].forEach(icon => {
    if (!icon) return;
    if (recording) {
      icon.textContent = "graphic_eq";
      icon.parentElement.classList.add("text-red-500", "bg-red-500/10", "animate-pulse");
    } else {
      icon.textContent = "mic";
      icon.parentElement.classList.remove("text-red-500", "bg-red-500/10", "animate-pulse");
    }
  });
}

// ── Check Backend Health ─────────────────────────────────────────────────────
async function checkBackendHealth() {
  try {
    const res = await fetch(HEALTH_ENDPOINT);
    if (res.ok) {
      const statusText = document.getElementById("sidebar-status-text");
      if (statusText) statusText.textContent = "Granite AI 3.2 Connected";
    }
  } catch {
    const statusText = document.getElementById("sidebar-status-text");
    if (statusText) statusText.textContent = "Granite AI (Offline Mode)";
  }
}

// ── Consultation Session Management ──────────────────────────────────────────
function startNewConsultation() {
  showChatView();
  document.getElementById("chat-stream").classList.add("hidden");
  document.getElementById("chat-stream").innerHTML = "";
  document.getElementById("floating-dock").classList.add("hidden");
  document.getElementById("welcome-view").classList.remove("hidden");
  removeAttachedImage();

  const heroInp = document.getElementById("agroQueryInput");
  if (heroInp) {
    heroInp.value = "";
    heroInp.style.height = "auto";
    heroInp.focus();
  }

  document.querySelectorAll(".history-item").forEach(item => {
    item.classList.remove("bg-emerald-950/30", "text-neutral-200", "border-emerald-900/30");
    item.classList.add("text-neutral-300");
  });
}

function loadHistoryItem(key, element) {
  showChatView();
  const preset = consultationPresets[key];
  if (!preset) return;

  if (element) {
    document.querySelectorAll(".history-item").forEach(item => {
      item.classList.remove("bg-emerald-950/30", "text-neutral-200", "border-emerald-900/30");
      item.classList.add("text-neutral-300");
    });
    element.classList.add("bg-emerald-950/30", "text-neutral-200", "border-emerald-900/30");
    element.classList.remove("text-neutral-300");
  }

  // Switch to active stream
  document.getElementById("welcome-view").classList.add("hidden");
  document.getElementById("chat-stream").classList.remove("hidden");
  document.getElementById("chat-stream").innerHTML = "";
  document.getElementById("floating-dock").classList.remove("hidden");

  // Render User Message
  appendUserMessage(preset.query, preset.image);

  // Render Preset AI Response Card
  appendPresetAIMessage(preset);

  // Scroll to top
  const scrollArea = document.getElementById("chat-scroll-area");
  if (scrollArea) scrollArea.scrollTop = 0;
}

function useSuggestedQuery(queryText) {
  showChatView();
  const heroInp = document.getElementById("agroQueryInput");
  if (heroInp) {
    heroInp.value = queryText;
    heroInp.style.height = "auto";
    heroInp.style.height = Math.min(heroInp.scrollHeight, 180) + "px";
    submitUserQuery();
  }
}

// ── Query Submission ─────────────────────────────────────────────────────────
function submitUserQuery() {
  const heroInp = document.getElementById("agroQueryInput");
  const query = heroInp ? heroInp.value.trim() : "";
  if (!query && !attachedImageData) return;

  const toolPrefix = focusTools[activeFocusIndex].prefix;
  const fullQuery = (activeFocusIndex > 0 && !query.startsWith(toolPrefix)) ? toolPrefix + query : query;
  const imageToPass = attachedImageData ? attachedImageData.url : null;

  // Transition UI
  document.getElementById("welcome-view").classList.add("hidden");
  document.getElementById("chat-stream").classList.remove("hidden");
  document.getElementById("floating-dock").classList.remove("hidden");

  // Append user bubble
  appendUserMessage(query, imageToPass);
  removeAttachedImage();

  if (heroInp) {
    heroInp.value = "";
    heroInp.style.height = "auto";
  }

  // Request AI response
  processAIQuery(fullQuery);
}

function submitDockQuery() {
  const dockInp = document.getElementById("dockQueryInput");
  const query = dockInp ? dockInp.value.trim() : "";
  if (!query && !attachedImageData) return;

  const imageToPass = attachedImageData ? attachedImageData.url : null;
  appendUserMessage(query, imageToPass);
  removeAttachedImage();

  if (dockInp) {
    dockInp.value = "";
    dockInp.style.height = "auto";
  }

  processAIQuery(query);
}

// ── Backend Communication & Structured Parsing ──────────────────────────────
async function processAIQuery(query) {
  if (isWaiting) return;
  isWaiting = true;

  const stream = document.getElementById("chat-stream");
  const loadingId = "loading-" + Date.now();

  // Loading animation card
  const loadingCard = document.createElement("div");
  loadingCard.id = loadingId;
  loadingCard.className = "flex items-start gap-3.5 py-2";
  loadingCard.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-secondary-container/60 text-secondary border border-secondary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
      <span class="material-symbols-outlined text-[18px]">psychology</span>
    </div>
    <div class="flex-1 bg-surface-card rounded-2xl border border-outline-subtle/80 p-4 shadow-subtle-elevated">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-semibold text-primary">KrishiMitra 3.2</span>
        <span class="text-[10px] text-secondary font-medium bg-secondary-container/50 px-1.5 py-0.5 rounded border border-secondary/20">Synthesizing ICAR Corpus</span>
      </div>
      <div class="flex items-center gap-1.5 py-1">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  stream.appendChild(loadingCard);
  scrollToBottom();

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: query, language: currentLanguage })
    });

    if (!res.ok) throw new Error("Backend returned status " + res.status);

    const data = await res.json();
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();

    appendParsedAIMessage(data.answer, data.sources || []);
  } catch {
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();

    // Fallback Mock Knowledge Response
    appendParsedAIMessage(
      `### Direct Answer\nBased on ICAR agronomy guidelines for your agro-climatic zone, apply integrated nutrient and pest management protocols to safeguard harvest yield.\n\n### Why This Matters / Agro Reasoning\nSoil moisture, balanced NPK split application, and vector suppression prevent irreversible root rot or leaf curl flare-ups during critical vegetative and flowering flushes.\n\n### What To Do (Protocol Steps)\n1. **Soil & Moisture Check:** Ensure field drainage is optimal and test soil electrical conductivity.\n2. **Targeted Application:** Apply bio-fertilizers or recommended ICAR-registered micronutrient blends during early morning or evening hours.\n3. **Monitoring:** Install pheromone or sticky traps across field margins.\n\n### Important Caution\nAlways verify exact chemical active ingredients with your local Krishi Vigyan Kendra (KVK) officer and adhere strictly to CIBRC Pre-Harvest Intervals (PHI).`,
      ["ICAR Package of Practices", "CIBRC Guidelines 2024", "National Agronomy Portal"]
    );
  } finally {
    isWaiting = false;
    scrollToBottom();
  }
}

// ── DOM Message Builders ─────────────────────────────────────────────────────
function appendUserMessage(text, imageUrl) {
  const stream = document.getElementById("chat-stream");
  const userCard = document.createElement("div");
  userCard.className = "flex justify-end gap-3 py-1";

  let imageHtml = "";
  if (imageUrl) {
    imageHtml = `
      <div class="mb-2 rounded-xl overflow-hidden border border-emerald-900/40 max-w-xs shadow-sm">
        <img src="${imageUrl}" alt="Uploaded crop leaf" class="w-full h-auto object-cover max-h-48" />
      </div>
    `;
  }

  userCard.innerHTML = `
    <div class="max-w-xl lg:max-w-2xl bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm text-[14px] sm:text-[15px] leading-relaxed">
      ${imageHtml}
      <div class="font-sans whitespace-pre-wrap">${escapeHtml(text)}</div>
    </div>
    <div class="w-7 h-7 rounded-full bg-primary-container text-emerald-300 border border-emerald-700/40 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
      RP
    </div>
  `;
  stream.appendChild(userCard);
  scrollToBottom();
}

function appendPresetAIMessage(preset) {
  const stream = document.getElementById("chat-stream");
  const card = document.createElement("div");
  card.className = "flex items-start gap-3.5 py-2";

  let stepsHtml = "";
  preset.steps.forEach(step => {
    stepsHtml += `
      <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle border border-outline-subtle/60 text-xs sm:text-sm">
        <span class="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center text-[11px] shrink-0 mt-0.5 font-bold">${step.num}</span>
        <div>
          <span class="font-semibold text-primary">${escapeHtml(step.title)}</span>
          <span class="text-on-surface-variant ml-1">${escapeHtml(step.desc)}</span>
        </div>
      </div>
    `;
  });

  let metricsHtml = "";
  preset.metrics.forEach(m => {
    metricsHtml += `
      <div class="p-2.5 rounded-xl bg-surface-subtle border border-outline-subtle/60 text-center">
        <div class="text-[11px] text-on-surface-variant font-medium">${escapeHtml(m.label)}</div>
        <div class="text-sm font-bold text-primary mt-0.5">${escapeHtml(m.val)}</div>
        <div class="text-[10px] text-secondary font-medium">${escapeHtml(m.sub)}</div>
      </div>
    `;
  });

  card.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-secondary-container/60 text-secondary border border-secondary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
      <span class="material-symbols-outlined text-[18px]">psychology</span>
    </div>

    <div class="flex-1 bg-surface-card rounded-2xl border border-outline-subtle/80 p-4 sm:p-5 shadow-claude-card space-y-4">
      
      <div class="flex items-center justify-between pb-3 border-b border-outline-subtle/50">
        <div>
          <span class="text-[11px] font-bold text-secondary uppercase tracking-wider">Agronomic Diagnosis</span>
          <h2 class="text-base sm:text-lg font-bold text-primary">${escapeHtml(preset.title)}</h2>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="speakText('${escapeQuotes(preset.directAnswer)}')" class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle rounded-lg" title="Listen">
            <span class="material-symbols-outlined text-[18px]">volume_up</span>
          </button>
          <button onclick="copyResponseText(this)" class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle rounded-lg" title="Copy text">
            <span class="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-xs font-bold text-primary flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
          Direct Recommendation
        </div>
        <p class="text-sm sm:text-[15px] text-on-surface leading-relaxed font-sans bg-secondary-container/20 p-3 rounded-xl border border-secondary/20">
          ${escapeHtml(preset.directAnswer)}
        </p>
      </div>

      <div class="space-y-1">
        <div class="text-xs font-bold text-primary flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px] text-secondary">psychology</span>
          Why This Matters / Agronomic Reasoning
        </div>
        <p class="text-xs sm:text-sm text-on-surface-variant leading-relaxed pl-1">
          ${escapeHtml(preset.reasoning)}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 pt-1">
        ${metricsHtml}
      </div>

      <div class="space-y-2 pt-1">
        <div class="text-xs font-bold text-primary flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px] text-secondary">format_list_numbered</span>
          Field Protocol Steps
        </div>
        <div class="space-y-2">
          ${stepsHtml}
        </div>
      </div>

      <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-600/20 text-xs text-amber-950 flex items-start gap-2">
        <span class="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">warning</span>
        <div>
          <span class="font-bold text-amber-900">Safety & Compliance: </span>
          <span>${escapeHtml(preset.caution)}</span>
        </div>
      </div>

    </div>
  `;
  stream.appendChild(card);
  scrollToBottom();
}

function appendParsedAIMessage(markdownText, sources) {
  const stream = document.getElementById("chat-stream");
  const card = document.createElement("div");
  card.className = "flex items-start gap-3.5 py-2";

  const formattedHtml = parseMarkdownAgronomy(markdownText);
  let sourcesHtml = "";
  if (sources && sources.length > 0) {
    sourcesHtml = `
      <div class="pt-2 border-t border-outline-subtle/50 flex items-center gap-2 flex-wrap text-[11px] text-on-surface-variant">
        <span class="font-semibold text-primary">Sources:</span>
        ${sources.map(s => `<span class="bg-surface-subtle px-2 py-0.5 rounded border border-outline-subtle text-secondary font-medium">${escapeHtml(s)}</span>`).join("")}
      </div>
    `;
  }

  card.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-secondary-container/60 text-secondary border border-secondary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
      <span class="material-symbols-outlined text-[18px]">psychology</span>
    </div>

    <div class="flex-1 bg-surface-card rounded-2xl border border-outline-subtle/80 p-4 sm:p-5 shadow-claude-card space-y-4">
      
      <div class="flex items-center justify-between pb-2 border-b border-outline-subtle/50">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-primary">KrishiMitra 3.2</span>
          <span class="text-[10px] text-secondary font-medium bg-secondary-container/50 px-1.5 py-0.5 rounded border border-secondary/20">ICAR Grounded</span>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="speakText('${escapeQuotes(cleanRawForSpeech(markdownText))}')" class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle rounded-lg" title="Listen">
            <span class="material-symbols-outlined text-[18px]">volume_up</span>
          </button>
          <button onclick="copyResponseText(this)" class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle rounded-lg" title="Copy text">
            <span class="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
        </div>
      </div>

      <div class="prose-container space-y-3 text-[14px] sm:text-[15px] text-on-surface leading-relaxed">
        ${formattedHtml}
      </div>

      ${sourcesHtml}
    </div>
  `;
  stream.appendChild(card);
  scrollToBottom();
}

// ── Markdown & Structure Agronomy Parser ─────────────────────────────────────
function parseMarkdownAgronomy(md) {
  if (!md) return "";

  let out = md;

  // Highlight 4 standard ICAR sections
  out = out.replace(/###\s*(Direct Answer|Immediate Action|Answer)/gi, 
    `<div class="text-xs font-bold text-primary flex items-center gap-1.5 mt-3 mb-1"><span class="material-symbols-outlined text-[16px] text-secondary">check_circle</span>Direct Recommendation</div>`);

  out = out.replace(/###\s*(Why This Matters|Agro Reasoning|Reasoning|Scientific Context)/gi, 
    `<div class="text-xs font-bold text-primary flex items-center gap-1.5 mt-3 mb-1"><span class="material-symbols-outlined text-[16px] text-secondary">psychology</span>Why This Matters / Agronomic Reasoning</div>`);

  out = out.replace(/###\s*(What To Do|Protocol Steps|Action Protocol|Steps)/gi, 
    `<div class="text-xs font-bold text-primary flex items-center gap-1.5 mt-3 mb-1"><span class="material-symbols-outlined text-[16px] text-secondary">format_list_numbered</span>Field Protocol Steps</div>`);

  out = out.replace(/###\s*(Important Caution|Caution|Precaution|Safety & Compliance)/gi, 
    `<div class="text-xs font-bold text-amber-900 flex items-center gap-1.5 mt-3 mb-1"><span class="material-symbols-outlined text-[16px] text-amber-700">warning</span>Mandatory Caution & Safety</div>`);

  // Bold headings
  out = out.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-primary">$1</strong>');
  
  // Bullet lists
  out = out.replace(/^\s*-\s+(.*)$/gim, '<li class="ml-4 list-disc text-on-surface-variant">$1</li>');
  
  // Numbered lists
  out = out.replace(/^\s*(\d+)\.\s+(.*)$/gim, `
    <div class="flex items-start gap-2.5 p-2.5 my-1.5 rounded-xl bg-surface-subtle border border-outline-subtle/60 text-xs sm:text-sm">
      <span class="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">$1</span>
      <div class="text-on-surface">$2</div>
    </div>
  `);

  // Paragraph splits
  out = out.replace(/\n\n+/g, '<br/>');

  return out;
}

// ── Speech Synthesis & Helpers ───────────────────────────────────────────────
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    alert("Speech synthesis is not supported on this device.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  const langMap = { en: "en-IN", hi: "hi-IN", te: "te-IN", bn: "bn-IN" };
  utterance.lang = langMap[currentLanguage] || "en-IN";
  window.speechSynthesis.speak(utterance);
}

function cleanRawForSpeech(md) {
  return md.replace(/###/g, "").replace(/\*\*/g, "").replace(/[-*#]/g, "").slice(0, 300);
}

function copyResponseText(btn) {
  const card = btn.closest(".bg-surface-card");
  if (!card) return;
  const text = card.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector(".material-symbols-outlined");
    if (icon) {
      icon.textContent = "done";
      setTimeout(() => { icon.textContent = "content_copy"; }, 2000);
    }
  });
}

function shareActiveConsultation() {
  if (navigator.share) {
    navigator.share({
      title: "KrishiMitra AI Farm Consultation",
      text: "Science-backed agronomic guidance powered by ICAR research guidelines.",
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert("Consultation link copied to clipboard!");
  }
}

function scrollToBottom() {
  const scrollArea = document.getElementById("chat-scroll-area");
  if (scrollArea) {
    setTimeout(() => {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }, 50);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeQuotes(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, " ");
}
