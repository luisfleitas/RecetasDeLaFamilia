"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type DeleteRecipeResponse = {
  error?: string;
};

export default function DeleteRecipeButton({ recipeId }: { recipeId: number }) {
  const router = useRouter();
  const messages = useMessages();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(messages.recipe.deleteConfirm);
    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as DeleteRecipeResponse;
        setError(data.error ?? messages.recipe.errors.deleteRecipeFailed);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(messages.recipe.errors.deleteRecipeFailed);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div id="recipe-delete-action-group" className="flex flex-col items-end gap-1">
      <button
        id={`recipe-delete-button-${recipeId}`}
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className={buttonClassName("danger")}
      >
        {isDeleting ? messages.recipe.deletingSubmit : messages.recipe.deleteSubmit}
      </button>
      {error ? <p id={`recipe-delete-error-${recipeId}`} className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
