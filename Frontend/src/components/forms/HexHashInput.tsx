import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clipboard, Check, X } from "lucide-react";
import { isValidHex32 } from "@/lib/polkadot/utils";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function HexHashInput({ value, onChange, disabled }: Props) {
  const ok = value === "" ? null : isValidHex32(value);

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      const normalized = text.startsWith("0x") ? text : `0x${text}`;
      onChange(normalized);
      if (isValidHex32(normalized)) toast.success("Valid 32-byte hex pasted");
      else toast.error("Pasted value is not a valid 32-byte hex");
    } catch {
      toast.error("Clipboard read failed");
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x… (64 hex characters)"
          className="font-mono text-xs pr-9"
          disabled={disabled}
        />
        {ok !== null && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {ok
              ? <Check className="h-4 w-4 text-success" />
              : <X className="h-4 w-4 text-destructive" />}
          </span>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={paste} className="gap-1.5" disabled={disabled}>
        <Clipboard className="h-3.5 w-3.5" />
        Paste & Validate
      </Button>
    </div>
  );
}
