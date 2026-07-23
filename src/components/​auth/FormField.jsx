import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Styled input with label + inline error message.
 * Pass `type="password"` and it automatically gets a show/hide toggle.
 */
const FormField = forwardRef(function FormField(
  { id, label, hideLabel = false, type = "text", error, icon: Icon, className = "", ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={className}>
      {!hideLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type={resolvedType}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400
            py-2.5 ${Icon ? "pl-10" : "pl-3.5"} ${isPassword ? "pr-10" : "pr-3.5"}
            transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40
            ${error ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-brand-500"}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

export default FormField;
