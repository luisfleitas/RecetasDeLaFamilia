import ReactMarkdown from "react-markdown";
import { normalizeFormattedRecipeContent } from "@/lib/application/recipes/rich-text";

type FormattedRecipeContentProps = {
  baseId: string;
  className?: string;
  content: string | null | undefined;
  id?: string;
};

export default function FormattedRecipeContent({ baseId, className, content, id }: FormattedRecipeContentProps) {
  const normalizedContent = normalizeFormattedRecipeContent(content);

  if (normalizedContent == null) {
    return null;
  }

  return (
    <div id={id ?? `${baseId}-formatted-content`} className={className}>
      <ReactMarkdown>{normalizedContent}</ReactMarkdown>
    </div>
  );
}
