/* ============================================================
   Root App — onenight dress rental marketplace (Hebrew RTL).
   Owns routing + shared state; delegates rendering to pages.
   ============================================================ */
import { useState, useEffect, useMemo } from "react";
import { api } from "./lib/api.js";
import { purgeLegacyDressStorage } from "./lib/data.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useToast } from "./hooks/useToast.js";
import { EMPTY_FILTERS } from "./components/filters/filterConstants.js";
import { SiteHeader } from "./components/layout/SiteHeader.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import { Toast } from "./components/ui/Toast.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import FavoritesPage from "./pages/FavoritesPage.jsx";
import PublishPage from "./pages/PublishPage.jsx";
import ThankYou from "./pages/ThankYou.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import TermsPage from "./pages/TermsPage.jsx";

/* Routes reachable via a real URL hash (bookmarkable / open-in-new-tab),
   same pattern the admin panel already uses (see README: /#admin). The
   registration form's terms link opens /#terms in a new tab this way,
   rather than needing its own modal-on-modal treatment. */
const HASH_ROUTES = new Set(["admin", "terms"]);
const routeFromHash = () => {
  const h = location.hash.replace("#", "");
  return HASH_ROUTES.has(h) ? h : "home";
};

/* Bridges AccountPage (legacy phone/password-shaped `user`) onto the live
   OTP session from AuthContext, since AccountPage is otherwise only ever
   reachable through the old, now-unused phone/password login flow. Must be
   its own component (rendered inside <AuthProvider>) so it can call useAuth() —
   App itself renders the provider and can't consume its own context. */
function AccountRoute({ user, setUser, initialTab, ...pageProps }) {
  const { isLoggedIn, account, setAccount } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="container page pt-[50px]">
        <div className="empty">נא להתחבר תחילה.</div>
      </div>
    );
  }

  const mergedUser = {
    phone: "",
    city: "",
    ...user,
    name: account?.name || user?.name || "משתמשת",
    email: account?.email || user?.email || "",
  };

  const setMergedUser = (updated) => {
    setUser(updated);
    setAccount((prev) => ({ ...(prev || {}), name: updated.name, email: updated.email }));
  };

  return <AccountPage user={mergedUser} setUser={setMergedUser} initialTab={initialTab} {...pageProps} />;
}

/* Route-level guard for /publish. The click-time gate (navbar CTA, Footer
   link) already routes signed-out clicks to the auth modal instead of here,
   but the route itself is otherwise unprotected — this covers anyone who
   still lands on "publish" some other way (back/forward navigation, a
   stale link) by bouncing them to the same auth modal rather than showing
   the form. PublishPage itself is untouched. */
function PublishRoute(props) {
  const { isLoggedIn, openAuth } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) openAuth("publish");
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="container page pt-[50px]">
        <div className="empty">נדרשת התחברות כדי לפרסם שמלה.</div>
      </div>
    );
  }

  return <PublishPage {...props} />;
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useLocalStorage("onenight_user", null);
  const [favIds, setFavIds] = useLocalStorage("onenight_favs", []);
  const [selected, setSelected] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [accountTab, setAccountTab] = useState("ads");
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  /* null = no sort applied (default) — there's no enforced sort today either;
     the array order is just insertion order (SEED order, with newly
     published dresses prepended), so this doesn't change existing behavior. */
  const [sort, setSort] = useState(null);
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

  /* Clear the pre-Postgres mock listings out of this browser before the
     first load. Runs ahead of reloadDresses so a stale cache can never be
     mistaken for API data during that first render. */
  useEffect(() => {
    purgeLegacyDressStorage();
    reloadDresses();
  }, []);
  useEffect(() => {
    const h = () => { const hr = routeFromHash(); if (HASH_ROUTES.has(hr)) setRoute(hr); };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  /* Hide the viewport scrollbar on the homepage only (see the
     .hide-viewport-scrollbar rules in styles.css). The class goes on
     <html> rather than a wrapper div because the homepage has no scroll
     container of its own — the document scrolls, so the scrollbar belongs
     to the viewport. Other routes share that same scrollbar and keep it,
     hence the toggle. Cleanup on unmount so the class can't outlive the
     app during hot reloads. */
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("hide-viewport-scrollbar", route === "home");
    return () => el.classList.remove("hide-viewport-scrollbar");
  }, [route]);

  const dressById = (id) => dresses.find((d) => d.id === id);
  const toggleFav = (id) =>
    setFavIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const go = (r) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
    if (!HASH_ROUTES.has(r) && location.hash) history.replaceState(null, "", location.pathname);
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
        if (filters.colors.length && !filters.colors.includes(d.color)) return false;
        if (d.price > filters.maxPrice) return false;
        if (d.price < filters.minPrice) return false;
        if (filters.regions.length && !filters.regions.includes(d.region)) return false;
        if (filters.sizes.length && !filters.sizes.includes(d.size)) return false;
        if (filters.dressLengths.length && !filters.dressLengths.includes(d.dressLength)) return false;
        if (filters.sleeveLengths.length && !filters.sleeveLengths.includes(d.sleeveLength)) return false;
        if (filters.source !== "all" && d.source !== filters.source) return false;
        return true;
      });
  }, [dresses, filters]);

  const sorted = useMemo(() => {
    if (!sort) return visible;
    const arr = [...visible];
    if (sort === "price_asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") arr.sort((a, b) => b.price - a.price);
    else if (sort === "newest") arr.sort((a, b) => b.createdAt - a.createdAt);
    else if (sort === "oldest") arr.sort((a, b) => a.createdAt - b.createdAt);
    return arr;
  }, [visible, sort]);

  const favDresses = favIds.map(dressById).filter(Boolean);

  return (
    <AuthProvider go={go}>
    <div className="min-h-screen bg-canvas font-body text-ink">
      <SiteHeader
        go={go}
        goAccount={(tab) => { setAccountTab(tab); go("account"); }}
      />

      {/* Navbar is fixed; home hero sits behind it, other routes need top clearance */}
      {route !== "home" && <div aria-hidden className="h-[72px]" />}

      {route === "home" && (
        <HomePage
          go={go}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          loading={loading}
          dresses={sorted}
          allDresses={dresses}
          favIds={favIds}
          onFav={toggleFav}
          onOpen={setSelected}
        />
      )}

      {route === "publish" && <PublishRoute onSubmit={publish} goHome={() => go("home")} />}
      {route === "thankyou" && <ThankYou goHome={() => go("home")} />}
      {route === "terms" && <TermsPage goHome={() => go("home")} />}

      {route === "favorites" && (
        <FavoritesPage dresses={favDresses} favIds={favIds} onFav={toggleFav} onOpen={setSelected} go={go} />
      )}

      {route === "login" && (
        <AuthPage mode={authMode} onAuth={onAuth} goHome={() => go("home")} toast={toast} />
      )}

      {route === "account" && (
        <AccountRoute
          user={user}
          setUser={setUser}
          dresses={dresses}
          setDresses={setDresses}
          favIds={favIds}
          dressById={dressById}
          onOpen={setSelected}
          onFav={toggleFav}
          toast={toast}
          initialTab={accountTab}
        />
      )}

      {route === "admin" && (
        <AdminPage dresses={dresses} setDresses={setDresses} toast={toast} dressById={dressById} onOpen={setSelected} />
      )}

      {selected && (
        <ProductPage
          d={selected}
          fav={favIds.includes(selected.id)}
          onFav={toggleFav}
          onClose={() => setSelected(null)}
          toast={toast}
          similar={dresses.filter((x) => x.status === "approved" && x.id !== selected.id)}
          onOpenSimilar={(dr) => { setSelected(dr); window.scrollTo({ top: 0 }); }}
        />
      )}

      <Footer go={go} toast={toast} />

      <Toast message={toastMsg} />
    </div>
    </AuthProvider>
  );
}
