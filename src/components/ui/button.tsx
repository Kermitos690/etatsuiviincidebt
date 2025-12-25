import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 hover:scale-[1.02]",
        destructive: "bg-gradient-to-r from-red-500 to-rose-500 text-destructive-foreground shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5",
        outline: "border border-glass bg-glass backdrop-blur-glass hover:bg-secondary/80 hover:shadow-glass",
        secondary: "bg-secondary/80 text-secondary-foreground backdrop-blur-glass hover:bg-secondary hover:shadow-glass",
        ghost: "hover:bg-secondary/50 hover:text-accent-foreground backdrop-blur-glass",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-secondary text-white shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 hover:scale-[1.02]",
        glass: "bg-glass backdrop-blur-glass border border-glass text-foreground hover:bg-secondary/50 hover:shadow-elevated",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
