import type { ButtonHTMLAttributes } from "react";
import { buttonClassName, type ButtonVariant } from "@/app/_components/ui/button-styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({
  variant = "primary",
  className,
  type,
  ...props
}: ButtonProps) {
  return <button type={type ?? "button"} className={buttonClassName(variant, className)} {...props} />;
}
