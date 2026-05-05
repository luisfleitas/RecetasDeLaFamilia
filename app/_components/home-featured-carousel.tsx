"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { FeaturedRecipeSlide } from "@/lib/application/home-navigation/view-model";

type HomeFeaturedCarouselProps = {
  slides: FeaturedRecipeSlide[];
  labels: {
    title: string;
    previous: string;
    next: string;
  };
};

export default function HomeFeaturedCarousel({ slides, labels }: HomeFeaturedCarouselProps) {
  const [index, setIndex] = useState(0);

  if (slides.length === 0) {
    return null;
  }

  const safeIndex = Math.min(index, slides.length - 1);
  const active = slides[safeIndex] ?? slides[0];

  function previousSlide() {
    setIndex((current) => {
      const currentSafeIndex = Math.min(current, slides.length - 1);
      return currentSafeIndex === 0 ? slides.length - 1 : currentSafeIndex - 1;
    });
  }

  function nextSlide() {
    setIndex((current) => {
      const currentSafeIndex = Math.min(current, slides.length - 1);
      return (currentSafeIndex + 1) % slides.length;
    });
  }

  return (
    <section id="home-featured-carousel" className="home-featured-band">
      <div id="home-featured-carousel-media" className="home-featured-media">
        {active.imageUrl ? (
          <Image
            id={`home-featured-carousel-image-${active.id}`}
            src={active.imageUrl}
            alt={active.title}
            width={960}
            height={540}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            id={`home-featured-carousel-placeholder-${active.id}`}
            className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,var(--brand-cream-100),var(--brand-orange-300))] p-5 text-center"
          >
            <p id={`home-featured-carousel-placeholder-title-${active.id}`} className="break-words font-serif text-2xl font-semibold text-[var(--brand-brown-900)]">
              {active.title}
            </p>
          </div>
        )}
      </div>
      <div id="home-featured-carousel-copy" className="home-featured-copy">
        <p id="home-featured-carousel-label" className="text-xs font-black uppercase text-[var(--brand-orange-700)]">
          {labels.title}
        </p>
        <Link
          id={`home-featured-carousel-link-${active.id}`}
          href={active.href}
          className="block break-words font-serif text-2xl font-semibold leading-tight text-[var(--brand-brown-900)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] sm:text-3xl"
        >
          {active.title}
        </Link>
        {active.description ? (
          <p id={`home-featured-carousel-description-${active.id}`} className="text-sm leading-relaxed text-[var(--brand-brown-700)]">
            {active.description}
          </p>
        ) : null}
      </div>
      <div id="home-featured-carousel-controls" className="home-featured-controls">
        <p id="home-featured-carousel-counter" className="text-sm font-bold text-[var(--brand-brown-700)]">
          {safeIndex + 1}/{slides.length}
        </p>
        <div id="home-featured-carousel-button-group" className="flex gap-2">
          <button
            id="home-featured-carousel-prev-btn"
            type="button"
            aria-label={labels.previous}
            onClick={previousSlide}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] font-black text-[var(--brand-orange-700)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            ‹
          </button>
          <button
            id="home-featured-carousel-next-btn"
            type="button"
            aria-label={labels.next}
            onClick={nextSlide}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] font-black text-[var(--brand-orange-700)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
