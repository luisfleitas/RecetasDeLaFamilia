type FamilyImageFrameProps = {
  alt: string;
  id: string;
  imageUrl: string | null;
  initials: string;
  state?: "empty" | "loading" | "ready";
};

export default function FamilyImageFrame({
  alt,
  id,
  imageUrl,
  initials,
  state = imageUrl ? "ready" : "empty",
}: FamilyImageFrameProps) {
  return (
    <div
      id={id}
      className="relative grid aspect-square w-full max-w-40 place-items-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-recipe-paper)] text-[var(--color-recipe-ink)]"
      aria-label={alt}
      role="img"
    >
      {imageUrl ? (
        <span
          id={`${id}-image`}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${imageUrl}")` }}
          aria-hidden="true"
        />
      ) : (
        <span id={`${id}-initials`} className="text-3xl font-semibold">
          {initials}
        </span>
      )}

      {state === "loading" ? (
        <span
          id={`${id}-loading`}
          className="absolute inset-x-3 bottom-3 rounded-sm bg-white/90 px-2 py-1 text-center text-xs font-semibold text-[var(--color-muted)]"
        >
          Loading
        </span>
      ) : null}
    </div>
  );
}
