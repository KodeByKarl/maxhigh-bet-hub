import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listCarouselSlidesFn } from "@/functions/superadmin";
import type { CarouselSlideRow } from "@/lib/superadmin-types";

const defaultPromos: CarouselSlideRow[] = [
  {
    id: "daily",
    badge: "Daily",
    title: "Daily Race",
    headline: "Daily Race",
    sub: "Compete for prizes · Coming soon",
    cta: "Join Race",
    linkUrl: null,
    imageUrl: "/promos/promo-daily-race.webp",
    sortOrder: 0,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "weekly",
    badge: "Weekly",
    title: "Weekly Race",
    headline: "Weekly Race",
    sub: "Climb the rankings · Coming soon",
    cta: "Climb Rankings",
    linkUrl: null,
    imageUrl: "/promos/promo-weekly-race.png",
    sortOrder: 1,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "telegram",
    badge: "Announcement",
    title: "Telegram Drops",
    headline: "Join & Claim",
    sub: "Community rewards & updates",
    cta: "Open Telegram",
    linkUrl: null,
    imageUrl: "/promos/promo-telegram.png",
    sortOrder: 2,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

export function PromoCarousel() {
  const [slides, setSlides] = useState<CarouselSlideRow[]>(defaultPromos);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void listCarouselSlidesFn()
      .then((res) => {
        const active = res.filter((s) => s.enabled);
        if (active.length > 0) setSlides(active);
      })
      .catch(() => {});
  }, []);

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
    const id = window.setInterval(() => {
      if (!emblaApi) return;
      emblaApi.scrollNext();
    }, 3500);
    return () => window.clearInterval(id);
  }, [emblaApi]);

  return (
    <section className="relative w-full min-w-0 overflow-hidden rounded-3xl border border-border bg-panel shadow-xl">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((p) => (
            <div key={p.id} className="relative min-w-0 shrink-0 grow-0 basis-full">
              <div className="relative h-56 sm:h-72 lg:h-80">
                <img
                  src={p.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                  <span
                    className="w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-black/50 text-white border border-white/20"
                  >
                    {p.badge}
                  </span>

                  <div className="max-w-xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-sm">
                      {p.title}
                    </div>
                    <div className="mt-2 text-3xl font-black tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
                      {p.headline}
                    </div>
                    <p className="mt-2 text-sm text-white/80 sm:text-base">{p.sub}</p>
                    {p.linkUrl ? (
                      <a
                        href={p.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        {p.cta}
                      </a>
                    ) : (
                      <button className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90">
                        {p.cta}
                      </button>
                    )}
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
        {slides.map((p, i) => (
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
