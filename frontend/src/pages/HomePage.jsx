import { Hero } from "../components/hero/Hero.jsx";
import { AboutSection } from "../components/sections/AboutSection.jsx";
import { HowItWorks } from "../components/sections/HowItWorks.jsx";
import { FilterSidebar } from "../components/filters/FilterSidebar.jsx";
import { SortMenu } from "../components/filters/SortMenu.jsx";
import { ProductGrid } from "../components/gallery/ProductGrid.jsx";
import { PublishPromoPopup } from "../components/ui/PublishPromoPopup.jsx";

/* Landing page: hero, brand sections, then the filterable dress gallery.
   `allDresses` is the full, unfiltered listings array (as opposed to
   `dresses`, which is already search/filter/sort-narrowed) — the promo
   popup's "does this account already have a listing" check needs the
   complete set, not whatever the visitor currently has filtered. */
export default function HomePage({ go, filters, setFilters, sort, setSort, loading, dresses, allDresses, favIds, onFav, onOpen }) {
  const scrollToBrowse = () =>
    document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <PublishPromoPopup dresses={allDresses} />

      <Hero onPublish={() => go("publish")} onBrowse={scrollToBrowse} />

      <AboutSection />

      <HowItWorks />

      <section id="browse" className="mx-auto max-w-[1280px] px-3 pb-28 pt-14">
        <div className="flex gap-10">
          <FilterSidebar f={filters} setF={setFilters} resultCount={dresses.length}>
            <SortMenu sort={sort} setSort={setSort} />
          </FilterSidebar>

          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="flex min-h-[40vh] items-center justify-center font-display text-2xl text-muted">
                טוען שמלות…
              </div>
            ) : (
              <ProductGrid
                dresses={dresses}
                favIds={favIds}
                onFav={onFav}
                onOpen={onOpen}
                emptyAction={() => go("publish")}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
