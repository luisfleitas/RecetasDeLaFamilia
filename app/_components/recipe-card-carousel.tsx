"use client";

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
  const mediaLabel = `Open media for ${title}`;

  return (
    <div id={`home-recipe-carousel-${recipeId}`} className="relative overflow-hidden">
      <RecipeMediaCarousel
        items={mediaItems}
        triggerId={`home-recipe-carousel-image-button-${recipeId}`}
        triggerLabel={mediaLabel}
        triggerClassName="home-recipe-carousel-image-button"
        triggerChildren={
          <img
            id={`home-recipe-carousel-image-${recipeId}`}
            src={current.thumbnailUrl}
            alt={title}
            className="block h-36 w-full object-cover"
          />
        }
      />
    </div>
  );
}
