"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { RecipeMediaCarouselItem } from "@/lib/application/recipes/recipe-media-groups";

type RecipeMediaCarouselProps = {
  items: RecipeMediaCarouselItem[];
  triggerId: string;
  triggerLabel: string;
  triggerClassName?: string;
  triggerChildren?: ReactNode;
};

export default function RecipeMediaCarousel({
  items,
  triggerId,
  triggerLabel,
  triggerClassName = "recipe-media-carousel-trigger",
  triggerChildren,
}: RecipeMediaCarouselProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = items.length > 0 ? Math.min(activeIndex, items.length - 1) : 0;
  const activeItem = items[safeActiveIndex];
  const titleId = `${triggerId}-title`;
  const hasMultipleItems = items.length > 1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((currentIndex) => (currentIndex === 0 ? items.length - 1 : currentIndex - 1));
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
      }
    }

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, [isOpen, items.length]);

  const thumbnails = useMemo(() => items.slice(0, 5), [items]);

  if (items.length === 0 || !activeItem) {
    return null;
  }

  function openCarousel(index: number) {
    setActiveIndex(index);
    setIsOpen(true);
  }

  function showPrevious() {
    setActiveIndex((currentIndex) => (currentIndex === 0 ? items.length - 1 : currentIndex - 1));
  }

  function showNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
  }

  function handleModalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      return;
    }

    event.stopPropagation();
  }

  return (
    <>
      <button
        id={triggerId}
        type="button"
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={triggerChildren ? triggerLabel : undefined}
        onClick={() => openCarousel(0)}
      >
        {triggerChildren ?? triggerLabel}
      </button>

      {isOpen ? createPortal(
        <div
          id="recipe-media-carousel"
          className="recipe-media-carousel-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={handleModalKeyDown}
        >
          <div id="recipe-media-carousel-panel" className="recipe-media-carousel-panel">
            <div id="recipe-media-carousel-header" className="recipe-media-carousel-header">
              <div id="recipe-media-carousel-copy" className="min-w-0">
                <p id={titleId} className="recipe-media-carousel-title">
                  {activeItem.label}
                </p>
                <p id="recipe-media-carousel-counter" className="recipe-media-carousel-counter">
                  {safeActiveIndex + 1}/{items.length}
                </p>
              </div>
              <button
                id="recipe-media-carousel-close"
                type="button"
                className="recipe-media-carousel-icon-btn"
                aria-label="Close media carousel"
                onClick={() => setIsOpen(false)}
              >
                x
              </button>
            </div>

            <div id="recipe-media-carousel-stage" className="recipe-media-carousel-stage">
              <button
                id="recipe-media-carousel-prev"
                type="button"
                className="recipe-media-carousel-nav-btn"
                aria-label="Previous media"
                disabled={!hasMultipleItems}
                onClick={showPrevious}
              >
                ‹
              </button>
              <img
                id="recipe-media-carousel-image"
                src={activeItem.fullUrl}
                alt={activeItem.accessibleLabel}
                className="recipe-media-carousel-image"
              />
              <button
                id="recipe-media-carousel-next"
                type="button"
                className="recipe-media-carousel-nav-btn"
                aria-label="Next media"
                disabled={!hasMultipleItems}
                onClick={showNext}
              >
                ›
              </button>
            </div>

            {thumbnails.length > 1 ? (
              <div id="recipe-media-carousel-thumbnails" className="recipe-media-carousel-thumbnails">
                {thumbnails.map((item, index) => (
                  <button
                    id={`recipe-media-carousel-thumbnail-${item.id}`}
                    key={item.id}
                    type="button"
                    className={`recipe-media-carousel-thumbnail ${index === safeActiveIndex ? "is-active" : ""}`}
                    aria-label={item.accessibleLabel}
                    aria-current={index === safeActiveIndex}
                    onClick={() => setActiveIndex(index)}
                  >
                    <img
                      id={`recipe-media-carousel-thumbnail-image-${item.id}`}
                      src={item.thumbnailUrl}
                      alt=""
                      className="recipe-media-carousel-thumbnail-image"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
