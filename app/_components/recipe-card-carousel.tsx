"use client";

import Link from "next/link";
import RecipeMediaCarousel from "@/app/recipes/_components/recipe-media-carousel";
import type { RecipeMediaCarouselItem } from "@/lib/application/recipes/recipe-media-groups";

type ImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

type Props = {
  recipeId: number;
  title: string;
  images: ImageRef[];
  mediaItems: RecipeMediaCarouselItem[];
};

export default function RecipeCardCarousel({ recipeId, title, images, mediaItems }: Props) {
  if (images.length === 0) {
    return null;
  }

  const current = images[0];

  return (
    <div id={`home-recipe-carousel-${recipeId}`} className="relative overflow-hidden">
      <Link id={`home-recipe-carousel-image-link-${recipeId}`} href={`/recipes/${recipeId}`} aria-label={title}>
        <img
          id={`home-recipe-carousel-image-${recipeId}`}
          src={current.thumbnailUrl}
          alt={title}
          className="block h-36 w-full object-cover"
        />
      </Link>

      <div
        id={`home-recipe-carousel-overlay-${recipeId}`}
        className="z-20"
        style={{ position: "absolute", right: 8, bottom: 8 }}
      >
        <RecipeMediaCarousel
          items={mediaItems}
          triggerId={`home-recipe-media-action-${recipeId}`}
          triggerLabel={`${mediaItems.length} media`}
        />
      </div>
    </div>
  );
}
