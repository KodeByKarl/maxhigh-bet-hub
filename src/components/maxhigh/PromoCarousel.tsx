import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const promos = [
  {
    id: "daily",
    badge: "Daily",
    badgeClass: "bg-black/50 text-white",
    title: "Daily Race",
    headline: "Daily Race",
    sub: "Compete for prizes · Coming soon",
    cta: "Join Race",
    image: "/promos/promo-daily-race.png",
  },
  {
    id: "weekly",
    badge: "Weekly",
    badgeClass: "bg-lime text-on-lime",
    title: "Weekly Race",
    headline: "Weekly Race",
    sub: "Climb the rankings · Coming soon",
    cta: "Climb Rankings",
    image: "/promos/promo-weekly-race.png",
  },
  {
    id: "telegram",
    badge: "Announcement",
    badgeClass: "bg-black/50 text-white",
    title: "Telegram Drops",
    headline: "Join & Claim",
    sub: "Community rewards & updates",
    cta: "Open Telegram",
    image: "/promos/promo-telegram.png",
  },
] as const;

export function PromoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const id = window.setInterval(() => emblaApi.scrollNext(), 5500);
    return () => window.clearInterval(id);
  }, [emblaApi]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-panel shadow-xl">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {promos.map((p) => (
            <div key={p.id} className="relative min-w-0 shrink-0 grow-0 basis-full">
              <div className="relative h-56 sm:h-72 lg:h-80">
                <img
                  src={p.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${p.badgeClass}`}
                  >
                    {p.badge}
                  </span>

                  <div className="max-w-xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-sm">
                      {p.title}
                    </div>
                    <div className="mt-2 text-4xl font-black tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                      {p.headline}
                    </div>
                    <p className="mt-2 text-sm text-white/80 sm:text-base">{p.sub}</p>
                    <button className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90">
                      {p.cta}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70 sm:left-4"
        aria-label="Previous promotion"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70 sm:right-4"
        aria-label="Next promotion"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {promos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            className={[
              "h-2 rounded-full transition-all",
              i === index ? "w-7 bg-lime" : "w-2 bg-white/40 hover:bg-white/70",
            ].join(" ")}
            aria-label={`Go to ${p.title}`}
          />
        ))}
      </div>
    </section>
  );
}
