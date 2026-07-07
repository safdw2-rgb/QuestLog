"use client";

interface AuthCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

export function AuthCheckbox({
  checked,
  onChange,
  label,
  id = "auth-checkbox",
}: AuthCheckboxProps) {
  return (
    <label htmlFor={id} className="auth-checkbox flex cursor-pointer items-center gap-3">
      <input
        id={id}
        type="checkbox"
        className="auth-checkbox-input sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="auth-checkbox-box" aria-hidden />
      <span className="auth-checkbox-label text-sm text-ink">{label}</span>
    </label>
  );
}
