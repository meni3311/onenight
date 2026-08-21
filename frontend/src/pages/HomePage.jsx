import { Hero } from "../components/hero/Hero.jsx";
import { AboutSection } from "../components/sections/AboutSection.jsx";
import { HowItWorks } from "../components/sections/HowItWorks.jsx";
import { FilterSidebar } from "../components/filters/FilterSidebar.jsx";
import { SortMenu } from "../components/filters/SortMenu.jsx";
import { ProductGrid } from "../components/gallery/ProductGrid.jsx";
import { PublishPromoPopup } from "../components/ui/PublishPromoPopup.jsx";

export default function HomePage({
  go, filters, setFilters, sort, setSort, loading,
  dresses, total, hasMore, loadingMore, onLoadMore,
  favIds, onFav, onOpen,
}) {
  const scrollToBrowse = () =>
    document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <PublishPromoPopup />

      <Hero onPublish={() => go("publish")} onBrowse={scrollToBrowse} />

      <AboutSection />

      <HowItWorks />

      <section id="browse" className="mx-auto max-w-[1280px] px-3 pb-28 pt-14">
        <div className="flex gap-10">
          {}
          <FilterSidebar f={filters} setF={setFilters} resultCount={total}>
            <SortMenu sort={sort} setSort={setSort} />
          </FilterSidebar>

          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="flex min-h-[40vh] items-center justify-center font-display text-2xl text-muted">
                טוען שמלות…
              </div>
            ) : (
              <>
                <ProductGrid
                  dresses={dresses}
                  favIds={favIds}
                  onFav={onFav}
                  onOpen={onOpen}
                  emptyAction={() => go("publish")}
                />

                {hasMore && (
                  <div className="mt-10 flex justify-center">
                    <button
                      type="button"
                      onClick={onLoadMore}
                      disabled={loadingMore}
                      className="rounded-sm border border-line px-9 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-brand hover:text-white disabled:opacity-60"
                    >
                      {loadingMore ? "טוען…" : `עוד שמלות (${total - dresses.length})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
