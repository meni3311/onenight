import { createContext, useContext, useState, useRef } from "react";
import { Icon } from "../components/ui/Icon.jsx";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock.js";

const BORDEAUX = "#6B2D2D";
const OTP_LENGTH = 6;
const OTP_RE = new RegExp(`^\\d{${OTP_LENGTH}}$`);

const AuthContext = createContext(null);

/* Shared glass styling for every text input in the modal. */
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

/* POST JSON to the backend; throws Error(message) on non-2xx. */
async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* ignore */ }
  if (!res.ok) {
    const msg = data && (Array.isArray(data.message) ? data.message[0] : data.message || data.error);
    throw new Error(msg || "אירעה שגיאה, נסי שוב");
  }
  return data;
}

export function useAuth() {
  return useContext(AuthContext);
}

/* OTP boxes (count = OTP_LENGTH) with auto-advance + backspace-back behaviour.
   Boxes flex to fit the modal width while keeping the glass style. */
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

/* Filled (primary) pill button. */
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

/* Back arrow (lucide ArrowRight equivalent) — top-right, returns to prev view. */
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

/* Small inline error line. */
function ErrorLine({ message }) {
  if (!message) return null;
  return (
    <p className="font-body" style={{ fontSize: "0.78rem", color: "#E3A9A9" }}>
      {message}
    </p>
  );
}

export function AuthProvider({ go, children }) {
  /* Simulated session — flips to true once an OTP is verified. */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  /* Internal modal flow. view ∈ choice | loginEmail | loginOtp | regForm | regOtp */
  const [view, setView] = useState("choice");
  const [slideDir, setSlideDir] = useState("fwd");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useBodyScrollLock(authOpen);

  const resetFlow = () => {
    setView("choice");
    setSlideDir("fwd");
    setEmail("");
    setName("");
    setOtp("");
    setBusy(false);
    setError("");
  };

  const openAuth = () => { resetFlow(); setAuthOpen(true); };
  const closeAuth = () => setAuthOpen(false);

  /* Transition to another view; clears OTP entry + errors between screens. */
  const goView = (next, direction = "fwd") => {
    setSlideDir(direction);
    setOtp("");
    setError("");
    setView(next);
  };

  const requestPublish = () => {
    if (isLoggedIn) {
      go("publish");
    } else {
      openAuth();
    }
  };

  /* "שלחי קוד" — request an OTP email, then advance to the OTP view. */
  const sendCode = async (nextView) => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await postJson("/api/auth/send-otp", { email });
      goView(nextView, "fwd");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  /* "אמתי" / "סיימתי" — verify the code, then run the success handler. */
  const verifyCode = async (onSuccess) => {
    if (busy) return;
    if (!OTP_RE.test(otp)) {
      setError(`יש להזין קוד בן ${OTP_LENGTH} ספרות`);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await postJson("/api/auth/verify-otp", { email, code: otp });
      if (r && r.success) {
        setIsLoggedIn(true);
        onSuccess();
      } else {
        setError("קוד שגוי");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finishLogin = () => { closeAuth(); };
  const finishRegister = () => { closeAuth(); go("publish"); };

  /* ── View renderers ── */
  const renderView = () => {
    switch (view) {
      case "loginEmail":
        return (
          <>
            <BackArrow onClick={() => goView("choice", "back")} />
            <div className="flex flex-col" style={{ gap: "20px" }}>
              <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                התחברות
              </h3>
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
              <FilledButton onClick={() => sendCode("loginOtp")} disabled={busy}>שלחי קוד</FilledButton>
            </div>
          </>
        );

      case "loginOtp":
        return (
          <>
            <BackArrow onClick={() => goView("loginEmail", "back")} />
            <div className="flex flex-col" style={{ gap: "18px" }}>
              <div>
                <h3 className="font-body" style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>
                  הזיני את הקוד
                </h3>
                <p className="font-body" style={{ marginTop: "6px", fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
                  שלחנו קוד לטלפון שלך
                </p>
              </div>
              <OtpBoxes value={otp} onChange={setOtp} />
              <ErrorLine message={error} />
              <FilledButton onClick={() => verifyCode(finishLogin)} disabled={busy}>אמתי</FilledButton>
              <button
                type="button"
                onClick={() => sendCode("loginOtp")}
                className="bg-transparent font-body"
                style={{ fontSize: "0.8rem", textDecoration: "underline", color: "#C4A0A0" }}
              >
                לא קיבלתי קוד — שלחי שוב
              </button>
            </div>
          </>
        );

      case "regForm":
        return (
          <>
            <BackArrow onClick={() => goView("choice", "back")} />
            <div className="flex flex-col" style={{ gap: "16px" }}>
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
              <ErrorLine message={error} />
              <FilledButton onClick={() => sendCode("regOtp")} disabled={busy}>שלחי קוד</FilledButton>
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
                  שלחנו קוד לטלפון שלך
                </p>
              </div>
              <OtpBoxes value={otp} onChange={setOtp} />
              <ErrorLine message={error} />
              <FilledButton onClick={() => verifyCode(finishRegister)} disabled={busy}>סיימתי — קחי אותי לשם</FilledButton>
            </div>
          </>
        );

      case "choice":
      default:
        return (
          <div className="flex flex-col items-center" style={{ gap: "20px" }}>
            {/* Lock icon */}
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
              <FilledButton onClick={() => goView("loginEmail", "fwd")}>התחברי</FilledButton>
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
    <AuthContext.Provider value={{ isLoggedIn, requestPublish, closeAuth }}>
      {children}

      {/* ── Auth modal (glassmorphism) — internal multi-view flow ── */}
      <div
        onClick={closeAuth}
        aria-hidden={!authOpen}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
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
          {/* Close (X) — top-left corner */}
          <button
            type="button"
            onClick={closeAuth}
            aria-label="סגירה"
            className="absolute bg-transparent"
            style={{ top: "16px", left: "16px", padding: "2px", color: "rgba(255,255,255,0.5)", zIndex: 1 }}
          >
            <Icon.close width="18" height="18" className="block" />
          </button>

          {/* Animated view container — re-mounts per view to replay the slide */}
          <div key={view} style={{ animation: `${slideDir === "fwd" ? "authFwd" : "authBack"} 0.25s ease-out` }}>
            {renderView()}
          </div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
