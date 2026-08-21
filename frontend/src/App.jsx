import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { api, browseDresses, getDress, getDressesByIds } from "./lib/api.js";
import { purgeLegacyDressStorage } from "./lib/data.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useToast } from "./hooks/useToast.js";
import { EMPTY_FILTERS, filtersToQuery } from "./components/filters/filterConstants.js";
import { SiteHeader } from "./components/layout/SiteHeader.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import { Toast } from "./components/ui/Toast.jsx";
import HomePage from "./pages/HomePage.jsx";

const ProductPage = lazy(() => import("./pages/ProductPage.jsx"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage.jsx"));
const PublishPage = lazy(() => import("./pages/PublishPage.jsx"));
const ThankYou = lazy(() => import("./pages/ThankYou.jsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));

function RouteFallback() {
  return (
    <div className="container page pt-[50px]">
      <div className="empty">טוען…</div>
    </div>
  );
}

const HASH_ROUTES = new Set(["admin", "terms", "contact"]);
const routeFromHash = () => {
  const h = location.hash.replace("#", "");
  return HASH_ROUTES.has(h) ? h : "home";
};

const DRESS_HASH_RE = /^#dress=(.+)$/;

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

const FILTER_DEBOUNCE_MS = 250;

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [dresses, setDresses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useLocalStorage("onenight_user", null);
  const [favIds, setFavIds] = useLocalStorage("onenight_favs", []);
  const [selected, setSelected] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [accountTab, setAccountTab] = useState("ads");
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState(null);
  const [toastMsg, toast] = useToast();

  useEffect(() => {
    purgeLegacyDressStorage();
  }, []);

  const browseQuery = useMemo(() => filtersToQuery(filters, sort, 1), [filters, sort]);

  const firstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const delay = firstLoad.current ? 0 : FILTER_DEBOUNCE_MS;
    firstLoad.current = false;

    const t = setTimeout(async () => {
      try {
        const res = await browseDresses(browseQuery);
        if (cancelled) return;
        setDresses(res?.items || []);
        setTotal(res?.total || 0);
        setPage(1);
      } catch (e) {
        if (!cancelled) console.error("טעינת שמלות נכשלה", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);

    return () => { cancelled = true; clearTimeout(t); };
  }, [browseQuery]);

  const hasMore = dresses.length < total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await browseDresses(filtersToQuery(filters, sort, next));
      setDresses((p) => [...p, ...(res?.items || [])]);
      if (typeof res?.total === "number") setTotal(res.total);
      setPage(next);
    } catch (e) {
      toast("טעינת שמלות נוספות נכשלה");
    } finally {
      setLoadingMore(false);
    }
  }, [filters, sort, page, hasMore, loadingMore, toast]);

  useEffect(() => {
    const warm = () => import("./pages/ProductPage.jsx");
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(warm);
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 2000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const h = () => { const hr = routeFromHash(); if (HASH_ROUTES.has(hr)) setRoute(hr); };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  useEffect(() => {
    const openFromHash = () => {
      const m = DRESS_HASH_RE.exec(location.hash);
      if (!m) return;
      const id = decodeURIComponent(m[1]);
      getDress(id)
        .then((full) => { if (full) setSelected(full); })
        .catch(() => toast("השמלה המבוקשת לא נמצאה"));
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("hide-viewport-scrollbar", route === "home");
    return () => el.classList.remove("hide-viewport-scrollbar");
  }, [route]);

  const toggleFav = useCallback(
    (id) => setFavIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    [setFavIds],
  );
  const go = useCallback((r) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
    if (HASH_ROUTES.has(r)) {
      if (location.hash !== `#${r}`) history.replaceState(null, "", `#${r}`);
    } else if (location.hash) {
      history.replaceState(null, "", location.pathname);
    }
  }, []);

  const onAuth = (u) => { setUser(u); setRoute("account"); toast("ברוכה הבאה, " + u.name + " 🌸"); };
  const logout = () => { setUser(null); go("home"); toast("התנתקת בהצלחה"); };

  const publish = async (data) => {
    try {
      await api("/api/dresses", { method: "POST", body: data });
      setRoute("thankyou");
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast("פרסום נכשל: " + e.message);
      throw e;
    }
  };

  const [favDresses, setFavDresses] = useState([]);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (route !== "favorites") return;
    let cancelled = false;
    setFavLoading(true);
    getDressesByIds(favIds)
      .then((rows) => { if (!cancelled) setFavDresses(rows || []); })
      .catch(() => { if (!cancelled) toast("טעינת המועדפים נכשלה"); })
      .finally(() => { if (!cancelled) setFavLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  return (
    <AuthProvider go={go}>
    <div className="min-h-screen bg-canvas font-body text-ink">
      <SiteHeader
        go={go}
        goAccount={(tab) => { setAccountTab(tab); go("account"); }}
      />

      {}
      {route !== "home" && <div aria-hidden className="h-[72px]" />}

      {route === "home" && (
        <HomePage
          go={go}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          loading={loading}
          dresses={dresses}
          total={total}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          favIds={favIds}
          onFav={toggleFav}
          onOpen={setSelected}
        />
      )}

      <Suspense fallback={<RouteFallback />}>
        {route === "publish" && <PublishRoute onSubmit={publish} goHome={() => go("home")} />}
        {route === "thankyou" && <ThankYou goHome={() => go("home")} />}
        {route === "terms" && <TermsPage goHome={() => go("home")} />}
        {route === "contact" && <ContactPage goHome={() => go("home")} />}

        {route === "favorites" && (
          <FavoritesPage
            dresses={favDresses}
            loading={favLoading}
            favIds={favIds}
            onFav={toggleFav}
            onOpen={setSelected}
            go={go}
          />
        )}

        {route === "login" && (
          <AuthPage mode={authMode} onAuth={onAuth} goHome={() => go("home")} toast={toast} />
        )}

        {}
        {route === "account" && (
          <AccountRoute
            user={user}
            setUser={setUser}
            favIds={favIds}
            onOpen={setSelected}
            onFav={toggleFav}
            toast={toast}
            initialTab={accountTab}
          />
        )}

        {route === "admin" && (
          <AdminPage toast={toast} onOpen={setSelected} />
        )}
      </Suspense>

      {}
      <Suspense fallback={null}>
      {}
      {selected && (
        <ProductPage
          d={selected}
          fav={favIds.includes(selected.id)}
          onFav={toggleFav}
          onClose={() => setSelected(null)}
          toast={toast}
          onOpenSimilar={(dr) => { setSelected(dr); window.scrollTo({ top: 0 }); }}
        />
      )}
      </Suspense>

      <Footer go={go} toast={toast} />

      <Toast message={toastMsg} />
    </div>
    </AuthProvider>
  );
}
