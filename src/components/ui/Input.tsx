import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-gray-400 text-sm">{prefix}</span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-all",
              "focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20",
              "placeholder:text-gray-400",
              prefix && "pl-8",
              error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
