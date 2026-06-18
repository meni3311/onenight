import { useState } from "react";
import { api } from "../lib/api.js";

/* Demo SMS verification code. Replace with a real Twilio flow in production. */
const DEMO_VERIFY_CODE = "1234";

/* Login / register flow. Registration includes a (demo) SMS verification step. */
export default function AuthPage({ mode: initMode, onAuth, goHome, toast }) {
  const [mode, setMode] = useState(initMode || "login");
  const [v, setV] = useState({ name: "", email: "", city: "", phone: "", password: "" });
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("form");
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));

  const startRegister = () => {
    if (!v.name || !v.phone || !v.password) { toast("נא למלא שם, טלפון וסיסמה"); return; }
    setStage("verify");
    toast("נשלח קוד אימות (לצורך הדגמה: " + DEMO_VERIFY_CODE + ")");
  };
  const verify = async () => {
    if (code !== DEMO_VERIFY_CODE) { toast("קוד שגוי — נסי " + DEMO_VERIFY_CODE + " להדגמה"); return; }
    try {
      const user = await api("/api/auth/register", { method: "POST", body: {
        name: v.name, email: v.email, city: v.city, phone: v.phone, password: v.password,
      } });
      onAuth(user);
    } catch (e) { toast(e.message); }
  };
  const login = async () => {
    if (!v.phone || !v.password) { toast("נא להזין טלפון וסיסמה"); return; }
    try {
      const user = await api("/api/auth/login", { method: "POST", body: { phone: v.phone, password: v.password } });
      onAuth(user);
    } catch (e) { toast(e.message); }
  };

  return (
    <div className="container page pt-[50px]">
      <div className="form-card max-w-[440px]">
        <h2>{mode === "login" ? "כניסה" : "הרשמה"}</h2>
        <p className="form-sub">{mode === "login" ? "שמחות לראות אותך שוב" : "הצטרפי לקהילת onenight"}</p>

        {stage === "form" && <div className="flex flex-col gap-4">
          {mode === "register" && <>
            <div className="field"><label>שם מלא</label><input type="text" value={v.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="field"><label>מייל</label><input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="field"><label>מקום מגורים</label><input type="text" value={v.city} onChange={(e) => set("city", e.target.value)} /></div>
          </>}
          <div className="field"><label>טלפון</label><input type="tel" placeholder="05X-XXXXXXX" value={v.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="field"><label>סיסמה</label><input type="password" value={v.password} onChange={(e) => set("password", e.target.value)} /></div>
          <button className="btn btn-rose btn-block" onClick={mode === "login" ? login : startRegister}>
            {mode === "login" ? "כניסה" : "המשך לאימות"}
          </button>
          <div className="text-center text-[14px] text-[var(--muted)]">
            {mode === "login" ? <>אין לך חשבון? <span className="link-rose" onClick={() => setMode("register")}>להרשמה</span></>
              : <>כבר רשומה? <span className="link-rose" onClick={() => setMode("login")}>לכניסה</span></>}
          </div>
        </div>}

        {stage === "verify" && <div className="flex flex-col gap-4">
          <p className="text-center text-[14px] text-[var(--muted)]">הזיני את קוד האימות שנשלח ל-{v.phone}</p>
          <div className="field"><label>קוד אימות (SMS)</label><input type="text" placeholder="1234" value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <button className="btn btn-rose btn-block" onClick={verify}>אימות והרשמה</button>
        </div>}
      </div>
    </div>
  );
}
