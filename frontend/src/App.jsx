/* ============================================================
   Root App — onenight dress rental marketplace (Hebrew RTL).
   Owns routing + shared state; delegates rendering to pages.
   ============================================================ */
import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { api, browseDresses, getDressesByIds } from "./lib/api.js";
import { purgeLegacyDressStorage } from "./lib/data.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useToast } from "./hooks/useToast.js";
import { EMPTY_FILTERS, filtersToQuery } from "./components/filters/filterConstants.js";
import { SiteHeader } from "./components/layout/SiteHeader.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Footer } from "./components/layout/Footer.jsx";
import { Toast } from "./components/ui/Toast.jsx";
import HomePage from "./pages/HomePage.jsx";

/* Route-level code splitting. HomePage stays in the initial chunk because
   it *is* the first paint; every other route is fetched on demand.
   The two that matter most for bundle size pull heavy transitive deps
   along with them: AccountPage owns DressAvailabilityCalendar, which drags
   in react-day-picker + date-fns, and AdminPage owns AdminPhotosPanel.
   Neither is reachable without a deliberate click, so neither belongs in
   the bundle every first-time visitor downloads. */
const ProductPage = lazy(() => import("./pages/ProductPage.jsx"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage.jsx"));
const PublishPage = lazy(() => import("./pages/PublishPage.jsx"));
const ThankYou = lazy(() => import("./pages/ThankYou.jsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.jsx"));

/* Reuses the existing .empty / .page styling rather than introducing a new
   loading treatment, so a chunk fetch looks like the rest of the app. */
function RouteFallback() {
  return (
    <div className="container page pt-[50px]">
      <div className="empty">טוען…</div>
    </div>
  );
}

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

/* How long to wait after the last filter change before asking the server.

   Filtering is a request now, not an array pass, and the price control is a
   range input that fires on every pixel of a drag — without this, one drag is
   dozens of queries. Chip clicks pay the same 250ms, which is under the
   threshold where a control feels unresponsive. The very first load skips it
   entirely (see the ref below): that request is the homepage's first paint and
   has nothing to debounce against. */
const FILTER_DEBOUNCE_MS = 250;

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  /* One page of approved listings — NOT the catalogue. This used to be every
     dress in the database at every status, fetched once with `?status=all`
     and narrowed in the browser; anything that needs a different slice
     (the owner's own listings, the moderation queue, favourites) now asks
     for that slice itself rather than filtering this array. */
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
  /* null = no sort applied (default) — there's no enforced sort today either;
     the array order is just insertion order (SEED order, with newly
     published dresses prepended), so this doesn't change existing behavior. */
  const [sort, setSort] = useState(null);
  const [toastMsg, toast] = useToast();

  /* Clear the pre-Postgres mock listings out of this browser before the
     first load, so a stale cache can never be mistaken for API data during
     that first render. The browse fetch itself is the effect below. */
  useEffect(() => {
    purgeLegacyDressStorage();
  }, []);

  /* The filters and sort, as the query string the server will answer.
     Memoized so the fetch effect keys on the string rather than on `filters`
     object identity — setFilters replaces the object on every keystroke of a
     slider drag, but most of those produce the same query. */
  const browseQuery = useMemo(() => filtersToQuery(filters, sort, 1), [filters, sort]);

  /* Skips the debounce for the first request only — see FILTER_DEBOUNCE_MS. */
  const firstLoad = useRef(true);

  /* Page 1 whenever the filters or the sort change. Both are server-side now,
     so a filter change is a refetch, and it resets paging: page 3 of "red
     dresses under ₪300" has nothing to do with page 3 of the unfiltered list. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const delay = firstLoad.current ? 0 : FILTER_DEBOUNCE_MS;
    firstLoad.current = false;

    const t = setTimeout(async () => {
      try {
        const res = await browseDresses(browseQuery);
        /* A slower earlier request must not overwrite a newer one's results.
           Clearing the flag in cleanup means only the latest effect run can
           still write to state. */
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

  /* Append the next page. The grid grows rather than replacing itself — the
     cards have a staggered reveal animation and a page-number pager would
     replay it from the top on every click. */
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

  /* Warm the ProductPage chunk once the browser is idle. It's lazy so it
     stays off the critical path, but opening a dress is the single most
     likely next action from the homepage — without this, the first card
     click would pay a network round-trip before the modal appears. */
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

  /* These are passed down through the whole tree, so a fresh identity
     on every render defeats React.memo on anything below them (notably
     ProductCard, which is on screen once per listing). setFavIds/setRoute
     are useState setters and stable, so the dependency lists are honest. */
  const toggleFav = useCallback(
    (id) => setFavIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    [setFavIds],
  );
  const go = useCallback((r) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
    if (!HASH_ROUTES.has(r) && location.hash) history.replaceState(null, "", location.pathname);
  }, []);

  const onAuth = (u) => { setUser(u); setRoute("account"); toast("ברוכה הבאה, " + u.name + " 🌸"); };
  const logout = () => { setUser(null); go("home"); toast("התנתקת בהצלחה"); };

  /* Rethrows after toasting. The toast is this function's job (it owns the
     app-level error surface), but PublishPage needs to know the call failed
     so it can clear its submit-button spinner and let the user retry —
     swallowing the error here left the button stuck spinning forever. */
  /* A new listing starts as "pending" (see the schema default), so it does
     NOT belong in the browse list — that list is approved-only now, and
     prepending here would have shown the author an unapproved dress sitting
     in the public gallery. It appears under "השמלות שלי" on the account
     screen, which fetches the owner's listings at every status. */
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

  /* Favourites are ids in localStorage, and they used to be resolved against
     the in-memory catalogue. With only one page of listings in the browser
     that lookup would silently drop every favourite that wasn't on it, so the
     ids are sent to the server instead. Fetched on entering the page rather
     than on every heart click: `favIds` changes as the user toggles hearts in
     the grid, and refetching there would be a request per click for a list
     nothing is currently showing. */
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
    /* Deliberately not keyed on favIds — see above. Un-hearting from within
       the favourites page still removes the card, because FavoritesPage
       filters what it renders by the live favIds. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

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

        {/* Neither of these is handed the browse list any more. Both need
            listings the public list deliberately no longer contains — the
            owner's pending/rejected ones, and the whole moderation queue —
            so each fetches its own from an endpoint scoped to it. */}
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

      {/* Separate boundary, and deliberately `null`: this is a full-screen
          overlay, so a centred "loading" card behind it would flash in the
          page body. The idle prefetch above means the chunk is normally
          already warm by the time a card is clicked. */}
      <Suspense fallback={null}>
      {/* `d` is the card that was clicked — enough to paint the page
          immediately. ProductPage fetches the rest itself: the owner's phone
          (stripped from the public list, and needed by the WhatsApp CTA) and
          the "you may also like" rail, which used to be filtered out of the
          full catalogue here and now comes from /api/dresses/:id/similar. */}
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
