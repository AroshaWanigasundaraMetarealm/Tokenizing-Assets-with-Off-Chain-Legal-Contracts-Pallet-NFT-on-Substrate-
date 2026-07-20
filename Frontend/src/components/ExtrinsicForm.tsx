import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { signAndSubmit } from "@/lib/polkadot/submit";
import { toast } from "sonner";

interface Props {
  title: string;
  description?: string;
  banner?: ReactNode;
  children: ReactNode;
  buildTx: (api: any) => any;
  canSubmit: boolean;
  submitLabel?: string;
  onSuccess?: () => void;
}

export function ExtrinsicForm({
  title, description, banner, children, buildTx, canSubmit, submitLabel = "Submit", onSuccess,
}: Props) {
  const { api, selectedAddress, status } = usePolkadot();
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const disabled = !api || status !== "connected" || !selectedAddress || !canSubmit || busy;

  const submit = async () => {
    if (!api || !selectedAddress) {
      toast.error("Connect wallet & node first");
      return;
    }
    try {
      setBusy(true);
      setStatusMsg(null);
      const tx = buildTx(api);
      await signAndSubmit({
        api,
        address: selectedAddress,
        tx,
        onStatus: setStatusMsg,
        onFinalized: () => onSuccess?.(),
      });
      setStatusMsg("Finalized ✓");
    } catch (e: any) {
      setStatusMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="surface-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {banner}
        <div className="grid gap-4">{children}</div>
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground min-h-[1.25rem]">{statusMsg}</div>
          <Button onClick={submit} disabled={disabled} className="bg-gradient-primary hover:opacity-90 shadow-glow">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
