/* ===================================================================
   HAZE STORE — auth.js
   Adds: username/password register+login, Google Sign-In, Discord OAuth2.
   Loaded AFTER app.js — does not modify any of app.js's code, it only
   wraps navigate() and reads/writes its own DOM elements.
   Backend: Google Apps Script Web App + Google Sheet (see google-apps-script.gs)
   =================================================================== */

const CFG = window.HAZE_CONFIG || {};
const SESSION_KEY = "haze_session_token";

let currentUser = null; // { username, email, name, avatar, provider }

/* -------------------------------- Backend -------------------------------- */
async function api(action, payload = {}) {
  if (!CFG.BACKEND_URL || CFG.BACKEND_URL.includes("YOUR_DEPLOYMENT_ID")) {
    throw new Error("Backend not configured yet — set BACKEND_URL in index.html (see README.md).");
  }
  const res = await fetch(CFG.BACKEND_URL, {
    method: "POST",
    // Plain-text body avoids a CORS preflight, which Apps Script Web Apps don't handle.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token: localStorage.getItem(SESSION_KEY) || null, ...payload }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

/* --------------------------- Wrap navigate() ------------------------------ */
/* app.js defines a global navigate(page). We wrap it (without editing app.js)
   so the profile page reflects login state and the login page wires up its
   buttons whenever they're shown. */
const _originalNavigate = window.navigate;
window.navigate = function (page) {
  _originalNavigate(page);
  if (page === "profile") updateProfileUI();
  if (page === "login") { setAuthTab("login"); showAuthError(""); setTimeout(initGoogleSignIn, 50); }
};

function handleAuthMenuClick() {
  if (currentUser) logout();
  else navigate("login");
}

/* --------------------------------- Auth UI --------------------------------- */
function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function setAuthTab(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
  document.getElementById("form-login").style.display = tab === "login" ? "flex" : "none";
  document.getElementById("form-register").style.display = tab === "register" ? "flex" : "none";
}

function updateProfileUI() {
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const avatarEl = document.getElementById("profile-avatar");
  const providerEl = document.getElementById("profile-provider");
  const menuIcon = document.getElementById("menu-auth-icon");
  const menuLabel = document.getElementById("menu-auth-label");

  if (currentUser) {
    nameEl.textContent = currentUser.name || currentUser.username;
    emailEl.textContent = currentUser.email || "";
    avatarEl.innerHTML = currentUser.avatar ? `<img src="${currentUser.avatar}" class="avatar-img">` : "👤";
    if (currentUser.provider && currentUser.provider !== "password") {
      providerEl.textContent = currentUser.provider;
      providerEl.style.display = "inline-block";
    } else {
      providerEl.style.display = "none";
    }
    menuIcon.textContent = "🚪";
    menuLabel.textContent = "Log Out";
  } else {
    nameEl.textContent = "Guest";
    emailEl.textContent = "Log in to sync your orders & wishlist";
    avatarEl.innerHTML = '<div class="profile-icon"><img src="assets/icons/profile.png" alt="Profile"></div>';
    providerEl.style.display = "none";
    menuIcon.textContent = "🔑";
    menuLabel.textContent = "Log In / Register";
  }
}

/* ------------------------------ Username/password --------------------------- */
async function handleLogin(e) {
  e.preventDefault();
  showAuthError("");
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    const data = await api("login", { username, password });
    onAuthSuccess(data.user, data.token);
  } catch (err) {
    showAuthError(err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  showAuthError("");
  const username = document.getElementById("register-username").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  try {
    const data = await api("register", { username, email, password });
    onAuthSuccess(data.user, data.token);
    showToast("Account created — welcome!");
  } catch (err) {
    showAuthError(err.message);
  }
}

function onAuthSuccess(user, token) {
  currentUser = user;
  localStorage.setItem(SESSION_KEY, token);
  showToast(`Welcome, ${user.name || user.username}!`);
  navigate("profile");
}

function logout() {
  api("logout", {}).catch(() => {}); // best-effort server-side session delete
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  updateProfileUI();
  showToast("Logged out");
}

/* ------------------------------ Google Sign-In ------------------------------- */
function initGoogleSignIn() {
  if (!window.google || !CFG.GOOGLE_CLIENT_ID || CFG.GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID")) return;
  google.accounts.id.initialize({
    client_id: CFG.GOOGLE_CLIENT_ID,
    callback: onGoogleCredential,
  });
  const slot = document.getElementById("g_id_signin_container");
  if (slot) {
    slot.innerHTML = "";
    google.accounts.id.renderButton(slot, { theme: "outline", size: "large", width: 320, shape: "pill" });
  }
}

async function onGoogleCredential(response) {
  showAuthError("");
  try {
    const data = await api("googleAuth", { idToken: response.credential });
    onAuthSuccess(data.user, data.token);
  } catch (err) {
    showAuthError(err.message);
  }
}

/* -------------------- Discord OAuth2 (real login, full redirect flow) --------------------
   1. Browser is sent to Discord's real /authorize endpoint.
   2. User approves on Discord's own page.
   3. Discord redirects to our Apps Script /exec URL with ?code=...
   4. Apps Script exchanges the code for an access token (server-side, using the
      client secret — this step CANNOT be done safely from the browser, which is
      why it goes through the backend) and fetches the real Discord profile.
   5. Apps Script creates a session and bounces the browser back to this site
      with the session token in the URL hash.
   This is a full, real OAuth2 Authorization Code flow — not a mock/demo login.
-------------------------------------------------------------------------------------------- */
function loginWithDiscord() {
  if (!CFG.DISCORD_CLIENT_ID || CFG.DISCORD_CLIENT_ID.includes("YOUR_DISCORD_CLIENT_ID")) {
    showAuthError("Discord login isn't configured yet — see README.md.");
    return;
  }
  const params = new URLSearchParams({
    client_id: CFG.DISCORD_CLIENT_ID,
    redirect_uri: CFG.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    prompt: "consent",
  });
  window.location.href = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

function consumeSessionFromHash() {
  const m = location.hash.match(/session=([^&]+)/);
  if (m) {
    localStorage.setItem(SESSION_KEY, decodeURIComponent(m[1]));
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }
  return false;
}

/* ---------------------------------- Init ------------------------------------ */
async function initAuth() {
  const cameFromRedirect = consumeSessionFromHash();
  const token = localStorage.getItem(SESSION_KEY);
  if (token) {
    try {
      const data = await api("getProfile", {});
      currentUser = data.user;
    } catch (err) {
      localStorage.removeItem(SESSION_KEY);
      currentUser = null;
    }
  }
  updateProfileUI();
  // If we just landed back from Discord/Google, jump straight to the profile tab.
  if (cameFromRedirect && currentUser) navigate("profile");
}

document.addEventListener("DOMContentLoaded", initAuth);
