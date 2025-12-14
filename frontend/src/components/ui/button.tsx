import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default: Third Color (Slate) -> Hover: Fourth Color (Navy)
        default: "bg-brand-slate text-brand-light hover:bg-brand-navy shadow-md hover:shadow-lg",
        
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        
        // Outline: Border Slate, Text Slate -> Hover: Fill Slate
        outline: "border-2 border-brand-slate bg-transparent text-brand-slate hover:bg-brand-slate hover:text-brand-light",
        
        // Secondary: Second Color (Teal) -> Text Navy
        secondary: "bg-brand-teal text-brand-navy hover:bg-brand-teal/80 font-semibold",
        
        ghost: "hover:bg-brand-slate/10 hover:text-brand-slate",
        link: "text-brand-slate underline-offset-4 hover:underline",
        
        // Hero: Gradient Slate to Navy -> Text Light
        hero: "bg-gradient-to-r from-brand-slate to-brand-navy text-brand-light font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-100",
        
        // Teal Variant (Explicit): Teal bg -> Navy text
        teal: "bg-brand-teal text-brand-navy font-semibold shadow-md hover:bg-brand-teal/90",
        
        // Navy Variant: Navy bg -> Light text
        navy: "bg-brand-navy text-brand-light font-semibold shadow-md hover:bg-brand-navy/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg rounded-xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };