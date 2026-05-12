"use client";

import { useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type AddRecipeStartOverDialogProps = {
  isVisible: boolean;
  onStartOver: () => void;
};

export default function AddRecipeStartOverDialog({ isVisible, onStartOver }: AddRecipeStartOverDialogProps) {
  const messages = useMessages();

  if (!isVisible) {
    return null;
  }

  return (
    <button
      id="add-recipe-start-over"
      type="button"
      className={buttonClassName("secondary", "shrink-0")}
      onClick={onStartOver}
    >
      {messages.recipe.addWorkflowStartOver}
    </button>
  );
}
