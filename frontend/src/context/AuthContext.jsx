import { createContext, useContext, useState, useRef, useEffect } from "react";
import { Icon } from "../components/ui/Icon.jsx";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { withBase } from "../lib/api.js";

const BORDEAUX = "#6B2D2D";
const OTP_LENGTH = 6;
const OTP_RE = new RegExp(`^\\d{${OTP_LENGTH}}$`);
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

const normalizePhone = (s) => (s || "").replace(/\D/g, "");

const AuthContext = createContext(null);

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(196, 160, 160, 0.3)",
  borderRadius: "10px",
  padding: "12px 16px",
  color: "inherit",
  fontFamily: "Assistant, sans-serif",
  textAlign: "right",
};

async function postJson(path, body) {
  const res = await fetch(withBase(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (_) {  }
  if (!res.ok) {
    const msg = data && (Array.isArray(data.message) ? data.message[0] : data.message || data.error);
    throw new Error(msg || "אירעה שגיאה, נסי שוב");
  }
  return data;
}

export function useAuth() {
  return useContext(AuthContext);
}

function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);
  const cells = Array.from({ length: OTP_LENGTH }, (_, i) => i);

  const setDigit = (i, raw) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    const arr = cells.map((k) => value[k] || "");
    arr[i] = char;
    onChange(arr.join(""));
    if (char && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      const arr = cells.map((k) => value[k] || "");
      if (arr[i]) {
        arr[i] = "";
        onChange(arr.join(""));
      } else if (i > 0) {
        arr[i - 1] = "";
        onChange(arr.join(""));
        refs.current[i - 1]?.focus();
      }
    }
  };

  return (
    <div dir="ltr" className="flex justify-center" style={{ gap: "8px" }}>
      {cells.map((i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="auth-otp text-white"
          style={{
            ...inputStyle,
            flex: "1 1 0",
            minWidth: 0,
            maxWidth: "48px",
            height: "56px",
            padding: 0,
            textAlign: "center",
            fontSize: "1.5rem",
          }}
        />
      ))}
    </div>
  );
}

function FilledButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full py-3 font-body transition-colors duration-200"
      style={{ background: BORDEAUX, color: "#fff", opacity: disabled ? 0.6 : 1 }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#5A2424"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = BORDEAUX; }}
    >
      {children}
    </button>
  );
}

function BackArrow({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="חזרה"
      className="absolute bg-transparent"
      style={{ top: "16px", right: "16px", padding: "2px", color: "rgba(255,255,255,0.7)" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="block">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function ErrorLine({ message }) {
  if (!message) return null;
  return (
    <p className="font-body" style={{ fontSize: "0.78rem", color: "#E3A9A9" }}>
      {message}
    </p>
  );
}

function NoticeLine({ message }) {
  if (!message) return null;
  return (
    <p className="font-body" style={{ fontSize: "0.78rem", color: "#C4A0A0" }}>
      {message}
    </p>
  );
}

function LoginStatusCard({ stage }) {
  const loading = stage === "loading";
  return (
    <div
      className="flex flex-col items-center font-body"
      style={{ gap: "14px", padding: "26px 0" }}
    >
      {loading ? (
        <>
          <span className="auth-spinner" aria-hidden="true" />
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>מתחברת…</p>
        </>
      ) : (
        <>
          <div style={{ fontSize: "1.8rem" }}>🌸</div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            ברוכה הבאה!
          </h3>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>התחברת בהצלחה</p>
        </>
      )}
    </div>
  );
}

function TextLink({ onClick, children, center }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-transparent font-body"
      style={{ fontSize: "0.8rem", textDecoration: "underline", color: "#C4A0A0", alignSelf: center ? "center" : undefined }}
    >
      {children}
    </button>
  );
}

function Checkbox({ checked, onChange, error, children }) {
  return (
    <label
      className="flex items-start font-body"
      style={{ gap: "10px", fontSize: "0.78rem", lineHeight: 1.6, color: "rgba(255,255,255,0.75)", cursor: "pointer" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          marginTop: "2px",
          width: "16px",
          height: "16px",
          minWidth: "16px",
          accentColor: BORDEAUX,
          cursor: "pointer",
          outline: error ? "2px solid #E3A9A9" : "none",
          outlineOffset: "2px",
          borderRadius: "3px",
        }}
      />
      <span>{children}</span>
    </label>
  );
}

export function AuthProvider({ go, children }) {
  const [isLoggedIn, setIsLoggedIn] = useLocalStorage("onenight_logged_in", false);
  const [account, setAccount] = useLocalStorage("onenight_account", null);
  const [authOpen, setAuthOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);

  const [view, setView] = useState("choice");
  const [slideDir, setSlideDir] = useState("fwd");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetCode, setResetCode] = useState("");

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [termsError, setTermsError] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginStage, setLoginStage] = useState("form");

  useBodyScrollLock(authOpen || welcomeOpen);

  useEffect(() => {
    if (!welcomeOpen) return;
    const t = setTimeout(() => setWelcomeOpen(false), 3500);
    return () => clearTimeout(t);
  }, [welcomeOpen]);

  const resetFlow = () => {
    setView("choice");
    setSlideDir("fwd");
    setEmail("");
    setName("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setOtp("");
    setResetCode("");
    setAgreedTerms(false);
    setMarketingConsent(true);
    setTermsError(false);
    setBusy(false);
    setError("");
    setNotice("");
    setLoginStage("form");
  };

  const openAuth = (intent = null) => { resetFlow(); setAuthIntent(intent); setAuthOpen(true); };
  const closeAuth = () => setAuthOpen(false);

  const goView = (next, direction = "fwd") => {
    setSlideDir(direction);
    setOtp("");
    setError("");
    setNotice("");
    setTermsError(false);
    setLoginStage("form");
    setView(next);
  };

  const requestPublish = () => {
    if (isLoggedIn) {
      go("publish");
    } else {
      openAuth("publish");
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setAccount(null);
  };

  const sendCode = async (nextView) => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await postJson("/api/auth/send-otp", { email: email.trim() });
      goView(nextView, "fwd");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async () => {
    if (busy) return;
    if (!name.trim()) { setError("נא להזין שם מלא"); return; }
    if (!EMAIL_RE.test(email.trim())) { setError("כתובת מייל לא תקינה"); return; }
    const phoneDigits = normalizePhone(phone);
    if (!/^0\d{8,9}$/.test(phoneDigits)) { setError("מספר טלפון לא תקין"); return; }
    if (password.length < MIN_PASSWORD_LENGTH) { setError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`); return; }
    if (password !== confirmPassword) { setError("הסיסמאות אינן תואמות"); return; }
    if (!agreedTerms) { setTermsError(true); return; }

    setError("");
    setTermsError(false);
    setBusy(true);
    try {
      await postJson("/api/auth/register", {
        name: name.trim(),
        email: email.trim(),
        phone: phoneDigits,
        password,
        marketingConsent,
      });
      await postJson("/api/auth/send-otp", { email: email.trim() });
      goView("regOtp", "fwd");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finishRegisterVerify = async () => {
    if (busy) return;
    if (!OTP_RE.test(otp)) { setError(`יש להזין קוד בן ${OTP_LENGTH} ספרות`); return; }
    setError("");
    setBusy(true);
    try {
      const user = await postJson("/api/auth/verify-registration", { email: email.trim(), code: otp });
      setAccount({ name: user.name, email: user.email, id: user.id, phone: user.phone });
      setIsLoggedIn(true);
      closeAuth();
      if (authIntent === "publish") go("publish");
      setWelcomeOpen(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async () => {
    if (busy) return;
    if (!EMAIL_RE.test(email.trim())) { setError("כתובת מייל לא תקינה"); return; }
    if (!password) { setError("נא להזין סיסמה"); return; }
    setError("");
    setBusy(true);
    setLoginStage("loading");
    try {
      const user = await postJson("/api/auth/login", { email: email.trim(), password });
      setAccount({ name: user.name, email: user.email, id: user.id, phone: user.phone });
      setIsLoggedIn(true);
      setLoginStage("success");
      setTimeout(() => {
        closeAuth();
        if (authIntent === "publish") go("publish");
      }, 1400);
    } catch (e) {
      setError(e.message);
      setLoginStage("form");
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async () => {
    if (busy) return;
    if (!EMAIL_RE.test(email.trim())) { setError("כתובת מייל לא תקינה"); return; }
    setError("");
    setBusy(true);
    try {
      await postJson("/api/auth/send-otp", { email: email.trim() });
      goView("forgotOtp", "fwd");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const continueToReset = () => {
    if (!OTP_RE.test(otp)) { setError(`יש להזין קוד בן ${OTP_LENGTH} ספרות`); return; }
    setResetCode(otp);
    goView("resetForm", "fwd");
  };

  const submitReset = async () => {
    if (busy) return;
    if (newPassword.length < MIN_PASSWORD_LENGTH) { setError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`); return; }
    if (newPassword !== confirmNewPassword) { setError("הסיסמאות אינן תואמות"); return; }
    setError("");
    setBusy(true);
    try {
      await postJson("/api/auth/reset-password", { email: email.trim(), code: resetCode, newPassword });
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      goView("loginForm", "back");
      setNotice("הסיסמה עודכנה בהצלחה — אפשר להתחבר");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case "loginForm":
        if (loginStage === "loading" || loginStage === "success") {
          return <LoginStatusCard stage={loginStage} />;
        }
        return (
          <>
            <BackArrow onClick={() => goView("choice", "back")} />
            <div className="flex flex-col" style={{ gap: "16px" }}>
              <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                התחברות
              </h3>
              <NoticeLine message={notice} />
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="הכניסי את המייל שלך"
                className="auth-input"
                style={inputStyle}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה"
                className="auth-input"
                style={inputStyle}
              />
              <ErrorLine message={error} />
              <FilledButton onClick={submitLogin} disabled={busy}>התחברי</FilledButton>
              <TextLink center onClick={() => goView("forgotForm", "fwd")}>שכחתי סיסמה</TextLink>
            </div>
          </>
        );

      case "forgotForm":
        return (
          <>
            <BackArrow onClick={() => goView("loginForm", "back")} />
            <div className="flex flex-col" style={{ gap: "18px" }}>
              <div>
                <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                  שחזור סיסמה
                </h3>
                <p className="font-body" style={{ marginTop: "6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
                  נשלח לך קוד לכתובת המייל שלך
                </p>
              </div>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="הכניסי את המייל שלך"
                className="auth-input"
                style={inputStyle}
              />
              <ErrorLine message={error} />
              <FilledButton onClick={submitForgot} disabled={busy}>שלחי קוד</FilledButton>
            </div>
          </>
        );

      case "forgotOtp":
        return (
          <>
            <BackArrow onClick={() => goView("forgotForm", "back")} />
            <div className="flex flex-col" style={{ gap: "18px" }}>
              <div>
                <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                  הזיני את הקוד
                </h3>
                <p className="font-body" style={{ marginTop: "6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
                  שלחנו קוד למייל שלך
                </p>
              </div>
              <OtpBoxes value={otp} onChange={setOtp} />
              <ErrorLine message={error} />
              <FilledButton onClick={continueToReset} disabled={busy}>המשך</FilledButton>
              <TextLink center onClick={() => sendCode("forgotOtp")}>לא קיבלתי קוד — שלחי שוב</TextLink>
            </div>
          </>
        );

      case "resetForm":
        return (
          <>
            <BackArrow onClick={() => goView("forgotOtp", "back")} />
            <div className="flex flex-col" style={{ gap: "16px" }}>
              <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                קביעת סיסמה חדשה
              </h3>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`סיסמה חדשה (לפחות ${MIN_PASSWORD_LENGTH} תווים)`}
                className="auth-input"
                style={inputStyle}
              />
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="אימות סיסמה חדשה"
                className="auth-input"
                style={inputStyle}
              />
              <ErrorLine message={error} />
              <FilledButton onClick={submitReset} disabled={busy}>עדכני סיסמה</FilledButton>
            </div>
          </>
        );

      case "regForm":
        return (
          <>
            <BackArrow onClick={() => goView("choice", "back")} />
            <div className="flex flex-col" style={{ gap: "14px" }}>
              <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                הרשמה
              </h3>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="השם שלך"
                className="auth-input"
                style={inputStyle}
              />
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="הכניסי את המייל שלך"
                className="auth-input"
                style={inputStyle}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05X-XXXXXXX"
                className="auth-input"
                style={inputStyle}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`סיסמה (לפחות ${MIN_PASSWORD_LENGTH} תווים)`}
                className="auth-input"
                style={inputStyle}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="אימות סיסמה"
                className="auth-input"
                style={inputStyle}
              />

              <div className="flex flex-col" style={{ gap: "8px" }}>
                <Checkbox
                  checked={agreedTerms}
                  error={termsError}
                  onChange={(v) => { setAgreedTerms(v); if (v) setTermsError(false); }}
                >
                  אני מאשר/ת את{" "}
                  <a
                    href="/#terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#C4A0A0", textDecoration: "underline" }}
                  >
                    תנאי השימוש ומדיניות הפרטיות
                  </a>
                </Checkbox>
                {termsError && (
                  <p className="font-body" style={{ fontSize: "0.72rem", color: "#E3A9A9", marginRight: "26px" }}>
                    יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך
                  </p>
                )}

                <Checkbox checked={marketingConsent} onChange={setMarketingConsent}>
                  אני מאשר/ת קבלת תוכן פרסומי והטבות
                </Checkbox>
              </div>

              <ErrorLine message={error} />
              <FilledButton onClick={submitRegister} disabled={busy}>שלחי קוד</FilledButton>
            </div>
          </>
        );

      case "regOtp":
        return (
          <>
            <BackArrow onClick={() => goView("regForm", "back")} />
            <div className="flex flex-col" style={{ gap: "18px" }}>
              <div>
                <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                  הזיני את הקוד
                </h3>
                <p className="font-body" style={{ marginTop: "6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
                  שלחנו קוד למייל שלך
                </p>
              </div>
              <OtpBoxes value={otp} onChange={setOtp} />
              <ErrorLine message={error} />
              <FilledButton onClick={finishRegisterVerify} disabled={busy}>סיימתי, בואו נתחיל!</FilledButton>
              <TextLink center onClick={() => sendCode("regOtp")}>לא קיבלתי קוד — שלחי שוב</TextLink>
            </div>
          </>
        );

      case "choice":
      default:
        return (
          <div className="flex flex-col items-center" style={{ gap: "20px" }}>
            {}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4A0A0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="block">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>

            <div>
              <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                כמעט שם
              </h3>
              <p
                className="font-body"
                style={{ marginTop: "8px", fontSize: "0.85rem", lineHeight: 1.6, color: "rgba(255,255,255,0.65)" }}
              >
                כדי לפרסם שמלה, יש להתחבר או להירשם לאתר
              </p>
            </div>

            <div className="flex w-full flex-col" style={{ gap: "12px" }}>
              <FilledButton onClick={() => goView("loginForm", "fwd")}>התחברי</FilledButton>
              <button
                type="button"
                onClick={() => goView("regForm", "fwd")}
                className="w-full rounded-full bg-transparent py-3 font-body transition-colors duration-200"
                style={{ border: "1px solid #C4A0A0", color: "#C4A0A0" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(196,160,160,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                הרשמי
              </button>
            </div>

            <p className="font-body" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
              ההרשמה חינמית ולוקחת דקה
            </p>
          </div>
        );
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, account, setAccount, openAuth, requestPublish, closeAuth, logout }}>
      {children}

      {}
      <div
        onClick={closeAuth}
        aria-hidden={!authOpen}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: authOpen ? 1 : 0,
          transition: "opacity 0.25s",
          pointerEvents: authOpen ? "auto" : "none",
        }}
      >
        <style>{`
          @keyframes authFwd { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes authBack { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
          .auth-input:focus, .auth-otp:focus { border-color: #C4A0A0 !important; outline: none; }
          .auth-input::placeholder { color: rgba(255,255,255,0.4); }
          @keyframes authSpin { to { transform: rotate(360deg); } }
          .auth-spinner {
            display: block;
            width: 34px;
            height: 34px;
            border: 3px solid rgba(107, 45, 45, 0.2);
            border-top-color: #6B2D2D;
            border-radius: 50%;
            animation: authSpin 0.7s linear infinite;
          }
        `}</style>

        <div
          role="dialog"
          aria-modal="true"
          aria-label="נדרשת התחברות"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "320px",
            maxHeight: "calc(100vh - 40px)",
            overflowY: "auto",
            padding: "36px 28px",
            textAlign: "center",
            color: "#fff",
            background: "rgba(42, 31, 31, 0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(196, 160, 160, 0.2)",
            borderRadius: "20px",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
            opacity: authOpen ? 1 : 0,
            transform: authOpen ? "scale(1)" : "scale(0.95)",
            transition: authOpen
              ? "opacity 0.25s ease-out, transform 0.25s ease-out"
              : "opacity 0.2s ease-in, transform 0.2s ease-in",
          }}
        >
          {}
          <button
            type="button"
            onClick={closeAuth}
            aria-label="סגירה"
            className="absolute bg-transparent"
            style={{ top: "16px", left: "16px", padding: "2px", color: "rgba(255,255,255,0.5)", zIndex: 1 }}
          >
            <Icon.close width="18" height="18" className="block" />
          </button>

          {}
          <div key={view} style={{ animation: `${slideDir === "fwd" ? "authFwd" : "authBack"} 0.25s ease-out` }}>
            {renderView()}
          </div>
        </div>
      </div>

      {}
      <div
        onClick={() => setWelcomeOpen(false)}
        aria-hidden={!welcomeOpen}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          opacity: welcomeOpen ? 1 : 0,
          transition: "opacity 0.25s",
          pointerEvents: welcomeOpen ? "auto" : "none",
        }}
      >
        <div
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "300px",
            padding: "32px 26px",
            textAlign: "center",
            color: "#fff",
            background: "rgba(42, 31, 31, 0.85)",
            backdropFilter: "blur(24px) saturate(1.4)",
            WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            border: "1px solid rgba(196, 160, 160, 0.2)",
            borderRadius: "20px",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
            opacity: welcomeOpen ? 1 : 0,
            transform: welcomeOpen ? "scale(1)" : "scale(0.95)",
            transition: welcomeOpen
              ? "opacity 0.25s ease-out, transform 0.25s ease-out"
              : "opacity 0.2s ease-in, transform 0.2s ease-in",
          }}
        >
          <div style={{ fontSize: "2rem" }}>🌸</div>
          <h3 className="font-body" style={{ marginTop: "10px", fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
            ברוכה הבאה!
          </h3>
          <p className="font-body" style={{ marginTop: "8px", fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
            ההרשמה הושלמה בהצלחה
          </p>
          <div style={{ marginTop: "18px" }}>
            <FilledButton onClick={() => setWelcomeOpen(false)}>מעולה!</FilledButton>
          </div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
