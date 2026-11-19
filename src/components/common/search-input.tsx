"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  onSearch?: (value: string) => void;
  debounceMs?: number;
  size?: "sm" | "md" | "lg";
}

function SearchInput({
  className,
  onSearch,
  debounceMs = 300,
  placeholder = "Search...",
  value: propValue,
  defaultValue,
  ...props
}: SearchInputProps) {
  const [value, setValue] = React.useState(
    propValue !== undefined ? propValue : (defaultValue || "")
  );
  const onSearchRef = React.useRef(onSearch);
  const isFirstRender = React.useRef(true);
  const lastEmittedValue = React.useRef<string | null>(null);

  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Synchronize internal state when propValue changes externally
  React.useEffect(() => {
    if (propValue !== undefined && propValue !== value) {
      setValue(propValue);
      lastEmittedValue.current = String(propValue);
    }
  }, [propValue]);

  // Debounced search trigger — ONLY runs when value actually changes and NEVER on initial mount
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastEmittedValue.current = String(value);
      return;
    }

    if (String(value) === lastEmittedValue.current) {
      return;
    }

    const timer = setTimeout(() => {
      lastEmittedValue.current = String(value);
      onSearchRef.current?.(String(value));
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent accidental form submissions & page refresh
      lastEmittedValue.current = String(value);
      onSearchRef.current?.(String(value));
    }
    props.onKeyDown?.(e);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setValue("");
    lastEmittedValue.current = "";
    onSearchRef.current?.("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        leftIcon={<Search className="h-4 w-4 text-theme-text-muted" />}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-11 rounded-xl border-theme-border bg-theme-surface text-theme-text-primary placeholder:text-theme-text-muted hover:border-theme-border-accent focus:border-theme-primary",
          value ? "pr-10" : ""
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-primary cursor-pointer p-1 z-10"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export { SearchInput };
