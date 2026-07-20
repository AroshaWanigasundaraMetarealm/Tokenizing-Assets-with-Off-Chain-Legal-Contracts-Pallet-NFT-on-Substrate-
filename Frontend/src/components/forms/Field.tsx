import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {error
        ? <p className="text-xs text-destructive">{error}</p>
        : hint
          ? <p className="text-xs text-muted-foreground/80">{hint}</p>
          : null}
    </div>
  );
}

interface TxtProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  className?: string;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
}
export function TxtInput({ value, onChange, placeholder, mono, className, type = "text", maxLength, disabled }: TxtProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(mono && "font-mono text-sm", className)}
      type={type}
      maxLength={maxLength}
      disabled={disabled}
    />
  );
}
