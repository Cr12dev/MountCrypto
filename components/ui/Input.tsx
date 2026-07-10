import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-md border border-border bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors focus:border-accent ${className}`}
        {...props}
      />
    </div>
  );
}
