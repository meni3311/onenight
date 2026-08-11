/* Full-bleed homepage hero: editorial headline, glassmorphism CTAs and an
   animated scroll cue. Sits behind the fixed navbar (starts at pixel 0).
   The glass/gradient treatments stay inline as they're computed visual
   washes rather than static utilities. */
import { useAuth } from "../../context/AuthContext.jsx";

export function Hero({ onBrowse }) {
  const { requestPublish } = useAuth();
  return (
    <section
      className="relative overflow-hidden"
      style={{ height: "100vh", width: "100%", top: 0 }}
    >
      <img
        src="/dress.png"
        alt=""
        className="absolute inset-0 block h-full w-full"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
      {/* legibility wash on the left where the text & buttons sit */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

      {/* Headline — upper-left, large editorial; clears the navbar */}
      <div
        dir="ltr"
        className="absolute left-0 top-0 px-6 md:px-12"
        style={{ paddingTop: "200px", textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}
      >
        <h1 className="text-left font-playfair text-[3rem] font-normal italic leading-[1.02] text-white md:text-[4.25rem]">
          Don’t buy it.<br /><span className="font-normal text-[#6B2D2D] text-[4rem] md:text-[5.75rem]">Rent it.</span>
        </h1>
      </div>

      {/* Glassmorphism CTAs.

          Vertical placement, by breakpoint:
            < 768px  — anchored at a fixed 380px from the top. vh-based
                       centering is unreliable on phones: browser chrome makes
                       100vh taller than the visible viewport, so a "centered"
                       box drifts up into the headline. The headline starts at
                       200px and its two lines run ~114px (48 + 64 at
                       leading-1.02), ending ~314px — so 380px leaves a ~66px
                       gap.
            768–1023 — the original vh-centered layout, untouched.
            >= 1024  — anchored at 430px, same fixed-offset reasoning as
                       mobile. Here the headline's lines are 68px and 92px,
                       running ~163px from 200px and ending ~363px, so 430px
                       leaves a matching ~67px gap. Centering was pushing the
                       buttons far below the text on tall desktop viewports.

          Layout: stacked everywhere except >= 1024px, where the two buttons
          sit side by side. They're wrapped in their own flex row rather than
          flipping this container to flex-row — the scroll cue below is a
          sibling, and it would otherwise line up beside the buttons instead
          of under them. */}
      <div
        dir="ltr"
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 md:pt-[100px] lg:top-[430px] lg:translate-y-0 lg:pt-0 [@media(max-width:767px)]:top-[380px] [@media(max-width:767px)]:translate-y-0"
      >
        <div className="flex flex-col items-center gap-3 lg:flex-row lg:gap-5">
          <button
            type="button"
            onClick={onBrowse}
            style={{
              background: "rgba(110,44,44,0.40)",
              backdropFilter: "blur(12px) saturate(1.4)",
              WebkitBackdropFilter: "blur(12px) saturate(1.4)",
              border: "1px solid rgba(230,190,180,0.45)",
              boxShadow: "0 8px 24px rgba(35,15,14,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
              width: "200px",
            }}
            className="rounded-full px-8 py-3 text-center text-[14px] font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 ease-lux hover:-translate-y-0.5 focus:outline-none"
          >
            מצאי שמלה
          </button>
          <button
            type="button"
            onClick={requestPublish}
            style={{
              background: "transparent",
              border: "1.5px solid #6B2D2D",
              color: "#6B2D2D",
              width: "200px",
            }}
            className="rounded-full px-8 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.18em] transition-all duration-300 ease-lux hover:-translate-y-0.5 focus:outline-none"
          >
            פרסמי שמלה
          </button>
        </div>

        {/* Animated scroll indicator — icon only, ~24px below the bottom button */}
        <style>{`@keyframes hero-scroll-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}`}</style>
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginTop: "12px", opacity: 0.7, animation: "hero-scroll-bounce 1.5s ease-in-out infinite" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Bottom gradient — blends the hero image into the site background below */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{ height: "120px", background: "linear-gradient(to bottom, transparent, rgba(110, 44, 44, 0.08))" }}
      />
    </section>
  );
}
