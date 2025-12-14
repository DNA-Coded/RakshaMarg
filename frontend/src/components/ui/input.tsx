import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // White background to pop against #ececec
          // Border: Third Color (Slate)
          // Text: Fourth Color (Navy)
          // Ring: Second Color (Teal)
          "flex h-10 w-full rounded-md border border-brand-slate/30 bg-white px-3 py-2 text-base text-brand-navy shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-brand-navy placeholder:text-brand-slate/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };