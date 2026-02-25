import { useId, type ButtonHTMLAttributes } from "react";
import { buttonClassName, type ButtonVariant } from "@/app/_components/ui/button-styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({
  variant = "primary",
  id,
  className,
  type,
  ...props
}: ButtonProps) {
  const generatedId = useId();

  return <button id={id ?? `button-${generatedId}`} type={type ?? "button"} className={buttonClassName(variant, className)} {...props} />;
}
