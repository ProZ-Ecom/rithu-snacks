"use client";

import * as React from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children" | "size"> {
  options: SelectOption[];
  placeholder?: string;
  error?: string | boolean;
  onValueChange?: (value: string) => void;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "warm" | "ghost";
  placement?: "bottom" | "top" | "auto";
  dropdownClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      options = [],
      placeholder = "Select an option",
      error,
      disabled = false,
      value: controlledValue,
      defaultValue,
      onChange,
      onValueChange,
      name,
      id,
      icon,
      leftIcon,
      rightIcon,
      size = "md",
      variant = "default",
      placement = "auto",
      dropdownClassName,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [effectivePlacement, setEffectivePlacement] = React.useState<"bottom" | "top">(
      placement === "top" ? "top" : "bottom"
    );
    const [internalValue, setInternalValue] = React.useState<string>(
      (controlledValue !== undefined
        ? controlledValue
        : defaultValue !== undefined
        ? defaultValue
        : "") as string
    );
    const [searchQuery, setSearchQuery] = React.useState("");

    const containerRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const hiddenSelectRef = React.useRef<HTMLSelectElement | null>(null);

    // Calculate smart placement when opened or on scroll/resize
    const updatePlacement = React.useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Estimated height of dropdown list: ~36px per option + padding (~20px), clamped to max-h-56 (224px)
      const estimatedHeight = Math.min(options.length * 36 + 20, 224);
      const buffer = 16; // breathing room from viewport edge

      if (placement === "top") {
        // Preferred top, but flip to bottom if it would touch or exceed the top of viewport
        if (spaceAbove < estimatedHeight + buffer && spaceBelow > spaceAbove) {
          setEffectivePlacement("bottom");
        } else {
          setEffectivePlacement("top");
        }
      } else if (placement === "bottom") {
        // Preferred bottom, but flip to top if it would touch or exceed the bottom of viewport
        if (spaceBelow < estimatedHeight + buffer && spaceAbove > spaceBelow) {
          setEffectivePlacement("top");
        } else {
          setEffectivePlacement("bottom");
        }
      } else {
        // "auto": if it fits below comfortably, open bottom; otherwise if it fits above, open top; else pick side with more space
        if (spaceBelow >= estimatedHeight + buffer) {
          setEffectivePlacement("bottom");
        } else if (spaceAbove >= estimatedHeight + buffer) {
          setEffectivePlacement("top");
        } else {
          setEffectivePlacement(spaceAbove > spaceBelow ? "top" : "bottom");
        }
      }
    }, [placement, options.length]);

    React.useEffect(() => {
      if (isOpen) {
        updatePlacement();
        window.addEventListener("resize", updatePlacement);
        window.addEventListener("scroll", updatePlacement, true);
        return () => {
          window.removeEventListener("resize", updatePlacement);
          window.removeEventListener("scroll", updatePlacement, true);
        };
      }
    }, [isOpen, updatePlacement]);

    // Sync controlled value if passed
    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(String(controlledValue));
      }
    }, [controlledValue]);

    // Handle outside click
    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchQuery("");
        }
      }

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    // Focus search input when dropdown opens
    React.useEffect(() => {
      if (isOpen && options.length > 6) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }, [isOpen, options.length]);

    // Keyboard navigation (Escape to close)
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      } else if (e.key === "ArrowDown" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    const handleSelectOption = (option: SelectOption) => {
      if (option.disabled || disabled) return;

      const newValue = option.value;
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      setIsOpen(false);
      setSearchQuery("");

      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = newValue;
        const changeEvent = new Event("change", { bubbles: true });
        hiddenSelectRef.current.dispatchEvent(changeEvent);
      }

      if (onValueChange) {
        onValueChange(newValue);
      }

      if (onChange) {
        const syntheticEvent = {
          target: { name, value: newValue, id },
          currentTarget: { name, value: newValue, id },
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    };

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return options;
      const query = searchQuery.toLowerCase().trim();
      return options.filter((opt) =>
        opt.label.toLowerCase().includes(query)
      );
    }, [options, searchQuery]);

    // Selected option label
    const selectedOption = options.find(
      (opt) => String(opt.value) === String(internalValue)
    );

    const sizeClasses = {
      sm: "h-9 px-3 rounded-lg text-xs",
      md: "h-11 px-4 rounded-xl text-sm font-normal",
      lg: "h-12 px-4 rounded-xl text-base font-normal",
    };

    const effectiveRightIcon = rightIcon || icon;

    return (
      <div className="w-full relative" ref={containerRef} onKeyDown={handleKeyDown}>
        {/* Hidden Native Select for Form Libraries (e.g. react-hook-form) */}
        <select
          ref={(node) => {
            hiddenSelectRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
            }
          }}
          name={name}
          id={id}
          value={internalValue}
          onChange={onChange || (() => {})}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none"
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Select Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between border bg-theme-surface text-theme-text-primary transition-all text-left cursor-pointer",
            sizeClasses[size],
            "outline-none focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20",
            isOpen
              ? "border-theme-primary ring-2 ring-theme-primary/20 bg-theme-surface"
              : "border-theme-border hover:border-theme-border-accent hover:bg-theme-surface-warm",
            error && "border-theme-status-can-fg focus:border-theme-status-can-fg focus:ring-theme-status-can-fg/20",
            disabled && "cursor-not-allowed bg-theme-surface-alt opacity-60 hover:border-theme-border",
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 truncate">
            {leftIcon && (
              <span className="shrink-0 text-theme-text-muted">{leftIcon}</span>
            )}
            <span
              className={cn(
                "truncate",
                !selectedOption || selectedOption.value === ""
                  ? "text-theme-text-muted font-normal"
                  : "text-theme-text-primary"
              )}
            >
              {selectedOption && selectedOption.value !== ""
                ? selectedOption.label
                : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {effectiveRightIcon && (
              <span className="text-theme-text-muted">{effectiveRightIcon}</span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-theme-text-muted transition-transform duration-200",
                isOpen && "rotate-180 text-theme-primary"
              )}
            />
          </div>
        </button>

        {/* Custom Dropdown List - Scrollable and Contained */}
        {isOpen && (
          <div
            className={cn(
              "absolute left-0 z-[70] overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-xl animate-in duration-150 min-w-full min-w-[100px]",
              effectivePlacement === "top"
                ? "bottom-full mb-1.5 origin-bottom zoom-in-95"
                : "top-full mt-1.5 origin-top zoom-in-95",
              dropdownClassName
            )}
            role="listbox"
          >
            {/* Search Input for Long Lists (>= 7 options) */}
            {options.length > 6 && (
              <div className="border-b border-theme-border-subtle p-2 bg-theme-surface-alt">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-theme-text-muted pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="h-8 w-full rounded-md border border-theme-border bg-theme-surface pl-8 pr-3 text-xs text-theme-text-primary placeholder:text-theme-text-muted outline-none focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Scrollable Options Area */}
            <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-theme-text-muted">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected =
                    String(option.value) === String(internalValue) &&
                    option.value !== "";

                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectOption(option)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer select-none",
                        isSelected
                          ? "bg-theme-surface-alt font-bold text-theme-primary"
                          : "text-theme-text-primary hover:bg-theme-surface-alt hover:text-theme-primary",
                        option.disabled &&
                          "cursor-not-allowed opacity-40 hover:bg-transparent pointer-events-none select-none"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {option.icon && (
                          <span className="shrink-0 text-theme-text-muted">{option.icon}</span>
                        )}
                        <span className="truncate">{option.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-theme-primary" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {typeof error === "string" && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, Select as Dropdown };
