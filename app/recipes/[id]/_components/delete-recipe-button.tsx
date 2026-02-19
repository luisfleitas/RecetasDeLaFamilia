"use client";

import { getAccessToken } from "@/lib/auth/client-session";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteRecipeResponse = {
  error?: string;
};

export default function DeleteRecipeButton({ recipeId }: { recipeId: number }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm("Delete this recipe?");
    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!response.ok) {
        const data = (await response.json()) as DeleteRecipeResponse;
        setError(data.error ?? "Failed to delete recipe");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Failed to delete recipe");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded border border-red-500 px-3 py-1 text-sm text-red-600 disabled:opacity-60"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
