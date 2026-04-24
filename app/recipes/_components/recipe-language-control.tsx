"use client";

import { useMessages } from "@/app/_components/locale-provider";
import { SUPPORTED_RECIPE_LANGUAGES, type RecipeLanguage } from "@/lib/domain/recipe-language";

type RecipeLanguageControlProps = {
  baseId: string;
  value: RecipeLanguage;
  onChange: (language: RecipeLanguage) => void;
};

function getLanguageLabel(language: RecipeLanguage, messages: ReturnType<typeof useMessages>) {
  return language === "es" ? messages.recipe.languageSpanish : messages.recipe.languageEnglish;
}

export default function RecipeLanguageControl({
  baseId,
  value,
  onChange,
}: RecipeLanguageControlProps) {
  const messages = useMessages();

  return (
    <div id={`${baseId}-section`} className="space-y-3">
      <div id={`${baseId}-copy`} className="space-y-1">
        <p id={`${baseId}-title`} className="text-sm font-semibold text-[var(--color-text)]">
          {messages.recipe.recipeLanguageLabel}
        </p>
        <p id={`${baseId}-description`} className="text-sm text-[var(--color-text-muted)]">
          {messages.recipe.recipeLanguageDescription}
        </p>
      </div>

      <div
        id={`${baseId}-options`}
        role="tablist"
        aria-label={messages.recipe.recipeLanguageLabel}
        className="secondary-tab-strip"
      >
        {SUPPORTED_RECIPE_LANGUAGES.map((language) => {
          const isActive = language === value;
          return (
            <button
              id={`${baseId}-option-${language}`}
              key={language}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-active={isActive}
              className="secondary-tab-strip-item"
              onClick={() => onChange(language)}
            >
              {getLanguageLabel(language, messages)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
