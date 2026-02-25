"use client";

import { useState } from "react";

type ImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

type Props = {
  recipeId: number;
  title: string;
  images: ImageRef[];
};

export default function RecipeCardCarousel({ recipeId, title, images }: Props) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return null;
  }

  const current = images[index];

  function prev() {
    setIndex((currentIndex) => (currentIndex === 0 ? images.length - 1 : currentIndex - 1));
  }

  function next() {
    setIndex((currentIndex) => (currentIndex + 1) % images.length);
  }

  return (
    <div id={`home-recipe-carousel-${recipeId}`} className="relative overflow-hidden">
      <img
        id={`home-recipe-carousel-image-${recipeId}`}
        src={current.thumbnailUrl}
        alt={title}
        className="block h-36 w-full object-cover"
      />

      <div
        id={`home-recipe-carousel-overlay-${recipeId}`}
        className="z-20"
        style={{ position: "absolute", right: 8, bottom: 8 }}
      >
        <div
          id={`home-recipe-carousel-controls-${recipeId}`}
          className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1 shadow-sm"
          style={{ backgroundColor: "rgba(241, 246, 241, 0.95)" }}
        >
          <button
            id={`home-recipe-carousel-prev-${recipeId}`}
            type="button"
            aria-label="Previous image"
            onClick={prev}
            disabled={images.length <= 1}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/90 text-sm leading-none text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ‹
          </button>
          <div id={`home-recipe-carousel-counter-${recipeId}`} className="px-1 text-[10px] text-[var(--color-text)]">
            {index + 1}/{images.length}
          </div>
          <button
            id={`home-recipe-carousel-next-${recipeId}`}
            type="button"
            aria-label="Next image"
            onClick={next}
            disabled={images.length <= 1}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/90 text-sm leading-none text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
