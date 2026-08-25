import { cn } from "@/lib/utils";

export function Switch({
  id,
  name,
  checked,
  defaultChecked,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  const isControlled = checked !== undefined;

  return (
    <label
      htmlFor={id}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center align-middle",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        className="peer sr-only"
        checked={isControlled ? checked : undefined}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        role="switch"
        aria-checked={isControlled ? checked : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      />
      {/* Track */}
      <div
        aria-hidden="true"
        className={cn(
          "h-6 w-11 rounded-full transition-colors duration-200 ease-in-out",
          "bg-gray-300 dark:bg-gray-600",
          "peer-checked:bg-green-500",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-focus-visible:outline-none",
          // Thumb
          "after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 after:ease-in-out after:content-['']",
          "peer-checked:after:translate-x-full",
        )}
      ></div>
    </label>
  );
}
