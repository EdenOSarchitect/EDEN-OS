import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 active:not-disabled:scale-[0.96] transition-[scale,background-color,color,border-color,opacity] duration-150 ease-out",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:bg-fg border border-accent",
        secondary:
          "bg-transparent text-fg border border-line-strong hover:border-accent hover:bg-elevated",
        ghost:
          "bg-transparent text-muted hover:text-fg hover:bg-elevated border border-transparent",
        line: "bg-transparent text-fg border-b border-line-strong rounded-none px-0 hover:border-fg",
      },
      size: {
        sm: "h-9 px-3 text-xs tracking-wide",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-sm tracking-wide",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
