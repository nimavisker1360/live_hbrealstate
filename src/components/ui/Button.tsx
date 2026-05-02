import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  rel?: string;
  size?: "sm" | "md" | "lg";
  target?: string;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-[#d6b15f] text-black shadow-[0_0_30px_rgba(214,177,95,0.22)] hover:bg-[#f0cf79]",
  secondary:
    "border border-white/15 bg-white/[0.06] text-white hover:border-[#d6b15f]/70 hover:bg-[#d6b15f]/10",
  ghost: "text-white/80 hover:bg-white/[0.07] hover:text-white",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  children,
  className,
  disabled,
  href,
  onClick,
  rel,
  size = "md",
  target,
  type = "button",
  variant = "primary",
}: ButtonProps) {
  const buttonClassName = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d6b15f] focus:ring-offset-2 focus:ring-offset-black",
    variants[variant],
    sizes[size],
    disabled && "cursor-not-allowed opacity-55",
    className,
  );

  if (href) {
    return (
      <Link className={buttonClassName} href={href} rel={rel} target={target}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={buttonClassName}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
