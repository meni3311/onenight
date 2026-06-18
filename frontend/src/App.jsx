/* ============================================================
   Root App — onenight dress rental marketplace (Hebrew RTL).
   Owns routing + shared state; delegates rendering to pages.
   ============================================================ */
import { useState, useEffect, useMemo } from "react";
import { api } from "./lib/api.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useToast } from "./hooks/useToast.js";
import { EMPTY_FILTERS } from "./components/filters/filterConstants.js";
import { SiteHeader } from "./components/layout/SiteHeader.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import { Toast } from "./components/ui/Toast.jsx";
import { DetailModal } from "./components/product/DetailModal.jsx";
import HomePage from "./pages/HomePage.jsx";
import FavoritesPage from "./pages/FavoritesPage.jsx";
import PublishPage from "./pages/PublishPage.jsx";
import ThankYou from "./pages/ThankYou.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

const routeFromHash = () => (location.hash.replace("#", "") === "admin" ? "admin" : "home");

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useLocalStorage("onenight_user", null);
  const [favIds, setFavIds] = useLocalStorage("onenight_favs", []);
  const [selected, setSelected] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [toastMsg, toast] = useToast();

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

  useEffect(() => { reloadDresses(); }, []);
  useEffect(() => {
    const h = () => { if (routeFromHash() === "admin") setRoute("admin"); };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

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
        if (filters.q) {
          const q = filters.q.toLowerCase();
          const hay = (d.title + d.desc + d.color + d.region).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (filters.color && !d.color.includes(filters.color.trim())) return false;
        if (d.price > filters.maxPrice) return false;
        if (d.price < filters.minPrice) return false;
        if (filters.regions.length && !filters.regions.includes(d.region)) return false;
        if (filters.sizes.length && !filters.sizes.includes(d.size)) return false;
        if (filters.conditions.length && !filters.conditions.includes(d.condition)) return false;
        if (filters.source !== "all" && d.source !== filters.source) return false;
        return true;
      });
  }, [dresses, filters]);

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

      {/* Navbar is fixed; home hero sits behind it, other routes need top clearance */}
      {route !== "home" && <div aria-hidden className="h-[72px]" />}

      {route === "home" && (
        <HomePage
          go={go}
          filters={filters}
          setFilters={setFilters}
          loading={loading}
          dresses={visible}
          favIds={favIds}
          onFav={toggleFav}
          onOpen={setSelected}
        />
      )}

      {route === "publish" && <PublishPage onSubmit={publish} goHome={() => go("home")} />}
      {route === "thankyou" && <ThankYou goHome={() => go("home")} />}

      {route === "favorites" && (
        <FavoritesPage dresses={favDresses} favIds={favIds} onFav={toggleFav} onOpen={setSelected} go={go} />
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
        <div className="container page pt-[50px]">
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

      <Footer go={go} toast={toast} />

      <Toast message={toastMsg} />
    </div>
  );
}
