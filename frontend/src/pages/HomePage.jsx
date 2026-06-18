import { Hero } from "../components/hero/Hero.jsx";
import { AboutSection } from "../components/sections/AboutSection.jsx";
import { HowItWorks } from "../components/sections/HowItWorks.jsx";
import { FilterSidebar } from "../components/filters/FilterSidebar.jsx";
import { ProductGrid } from "../components/gallery/ProductGrid.jsx";

/* Landing page: hero, brand sections, then the filterable dress gallery. */
export default function HomePage({ go, filters, setFilters, loading, dresses, favIds, onFav, onOpen }) {
  const scrollToBrowse = () =>
    document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <Hero onPublish={() => go("publish")} onBrowse={scrollToBrowse} />

      <AboutSection />

      <HowItWorks />

      <section id="browse" className="mx-auto max-w-[1280px] px-3 pb-28 pt-14">
        <div className="flex gap-10">
          <FilterSidebar f={filters} setF={setFilters} resultCount={dresses.length} />

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
