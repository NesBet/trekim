"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, rightElement, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              rightElement && "pr-10",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-0 top-0 flex h-full items-center pr-3">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
