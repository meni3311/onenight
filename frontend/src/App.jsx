/* ============================================================
   Root App — onenight dress rental marketplace (Hebrew RTL)
   Luxury redesign · Tailwind components
   ============================================================ */
import { useState, useEffect, useMemo } from "react";
import { LS } from "./data.js";
import { api } from "./api.js";
import {
  SiteHeader,
  Hero,
  FilterSidebar,
  ProductGrid,
  DetailModal,
  EMPTY_FILTERS,
} from "./components.jsx";
import { PublishPage, ThankYou, AuthPage, AccountPage, AdminPage } from "./pages.jsx";

export default function App() {
  const [route, setRoute] = useState(() =>
    location.hash.replace("#", "") === "admin" ? "admin" : "home"
  );
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const reloadDresses = async () => {
    try {
      const data = await api("/api/dresses?status=all");
      setDresses(data || []);
    } catch (e) {
      console.error("טעינת שמלות נכשלה", e);
    } finally {
      setLoading(false);
    }
  };
  const [user, setUser] = useState(() => LS.get("onenight_user", null));
  const [favIds, setFavIds] = useState(() => LS.get("onenight_favs", []));
  const [selected, setSelected] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [f, setF] = useState({ ...EMPTY_FILTERS });

  useEffect(() => { reloadDresses(); }, []);
  useEffect(() => LS.set("onenight_favs", favIds), [favIds]);
  useEffect(() => LS.set("onenight_user", user), [user]);
  useEffect(() => {
    const h = () => { if (location.hash.replace("#", "") === "admin") setRoute("admin"); };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const toast = (m) => {
    setToastMsg(m);
    clearTimeout(window.__t);
    window.__t = setTimeout(() => setToastMsg(null), 2600);
  };
  const dressById = (id) => dresses.find((d) => d.id === id);
  const toggleFav = (id) =>
    setFavIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const go = (r) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
    if (r !== "admin" && location.hash) history.replaceState(null, "", location.pathname);
  };

  const onAuth = (u) => { setUser(u); setRoute("account"); toast("ברוכה הבאה, " + u.name + " 🌸"); };
  const logout = () => { setUser(null); go("home"); toast("התנתקת בהצלחה"); };

  const publish = async (data) => {
    try {
      const created = await api("/api/dresses", { method: "POST", body: data });
      setDresses((p) => [created, ...p]);
      setRoute("thankyou");
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast("פרסום נכשל: " + e.message);
    }
  };

  const visible = useMemo(() => {
    return dresses
      .filter((d) => d.status === "approved")
      .filter((d) => {
        if (f.q) {
          const q = f.q.toLowerCase();
          const hay = (d.title + d.desc + d.color + d.region).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (f.color && !d.color.includes(f.color.trim())) return false;
        if (d.price > f.maxPrice) return false;
        if (d.price < f.minPrice) return false;
        if (f.regions.length && !f.regions.includes(d.region)) return false;
        if (f.sizes.length && !f.sizes.includes(d.size)) return false;
        if (f.conditions.length && !f.conditions.includes(d.condition)) return false;
        if (f.source !== "all" && d.source !== f.source) return false;
        return true;
      });
  }, [dresses, f]);

  const favDresses = favIds.map(dressById).filter(Boolean);

  return (
    <div className="min-h-screen bg-canvas font-body text-ink">
      <SiteHeader
        route={route}
        go={go}
        user={user}
        favCount={favIds.length}
        onLogin={() => { setAuthMode("login"); go("login"); }}
        onLogout={logout}
      />

      {route === "home" && (
        <>
          <Hero
            onPublish={() => go("publish")}
            onBrowse={() =>
              document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" })
            }
          />

          <section id="browse" className="mx-auto max-w-[1280px] px-6 pb-28 pt-14 lg:px-10">
            <div className="flex gap-10">
              <FilterSidebar f={f} setF={setF} resultCount={visible.length} />

              <div className="min-w-0 flex-1">
                {loading ? (
                  <div className="flex min-h-[40vh] items-center justify-center font-display text-2xl text-muted">
                    טוען שמלות…
                  </div>
                ) : (
                  <ProductGrid
                    dresses={visible}
                    favIds={favIds}
                    onFav={toggleFav}
                    onOpen={setSelected}
                    emptyAction={() => go("publish")}
                  />
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {route === "publish" && <PublishPage onSubmit={publish} goHome={() => go("home")} />}
      {route === "thankyou" && <ThankYou goHome={() => go("home")} />}

      {route === "favorites" && (
        <div className="mx-auto max-w-[1280px] px-6 pb-28 pt-12 lg:px-10">
          <h2 className="mb-8 font-display text-4xl text-ink">המועדפים שלי</h2>
          {favDresses.length ? (
            <ProductGrid
              dresses={favDresses}
              favIds={favIds}
              onFav={toggleFav}
              onOpen={setSelected}
            />
          ) : (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-line py-16 text-center">
              <p className="font-display text-2xl text-ink">עדיין לא שמרת שמלות</p>
              <p className="max-w-xs text-sm text-muted">
                לחצי על הלב בשמלות שאהבת והן יופיעו כאן.
              </p>
              <button
                type="button"
                onClick={() => go("home")}
                className="mt-1 rounded-sm bg-brand px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-brand-dark"
              >
                גלי שמלות
              </button>
            </div>
          )}
        </div>
      )}

      {route === "login" && (
        <AuthPage mode={authMode} onAuth={onAuth} goHome={() => go("home")} toast={toast} />
      )}

      {route === "account" && user && (
        <AccountPage
          user={user}
          dresses={dresses}
          setDresses={setDresses}
          favIds={favIds}
          dressById={dressById}
          onOpen={setSelected}
          onFav={toggleFav}
          setUser={setUser}
          toast={toast}
        />
      )}
      {route === "account" && !user && (
        <div className="container page" style={{ paddingTop: 50 }}>
          <div className="empty">נא להתחבר תחילה.</div>
        </div>
      )}

      {route === "admin" && <AdminPage dresses={dresses} setDresses={setDresses} toast={toast} />}

      {selected && (
        <DetailModal
          d={selected}
          fav={favIds.includes(selected.id)}
          onFav={toggleFav}
          onClose={() => setSelected(null)}
          toast={toast}
        />
      )}

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <h4>onenight</h4>
            <p style={{ margin: 0 }}>
              השכרת שמלות ערב · קהילה של נשים<br />
              שמלה אחת, ערב אחד, זיכרון לכל החיים.
            </p>
          </div>
          <div>
            <h4>ניווט</h4>
            <p style={{ margin: 0, lineHeight: 2 }}>
              <a onClick={() => go("home")}>בית</a><br />
              <a onClick={() => go("publish")}>פרסום שמלה</a><br />
              <a onClick={() => go("favorites")}>מועדפים</a>
            </p>
          </div>
          <div>
            <h4>יצירת קשר</h4>
            <p style={{ margin: 0, lineHeight: 2 }}>
              מייל: hello@onenight.co.il<br />
              וואטסאפ: 03-0000000<br />
              <a onClick={() => toast("תקנון האתר")}>תקנון ותנאי שימוש</a>
            </p>
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--muted)",
          }}
        >
          © {new Date().getFullYear()} onenight · כל הזכויות שמורות
        </div>
      </footer>

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
