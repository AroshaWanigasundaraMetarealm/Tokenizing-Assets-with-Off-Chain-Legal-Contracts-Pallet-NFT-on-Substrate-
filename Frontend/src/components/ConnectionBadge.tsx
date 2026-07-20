import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { cn } from "@/lib/utils";

export function ConnectionBadge() {
  const { status, blockNumber } = usePolkadot();
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    connected: { label: "Connected", cls: "bg-success/15 text-success border-success/30", dot: "bg-success" },
    connecting: { label: "Connecting…", cls: "bg-warning/15 text-warning border-warning/30", dot: "bg-warning animate-pulse" },
    disconnected: { label: "Disconnected", cls: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
    error: { label: "Error", cls: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
    idle: { label: "Idle", cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  };
  const s = map[status];
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", s.cls)}>
      <span className={cn("h-2 w-2 rounded-full", s.dot)} />
      <span>{s.label}</span>
      {status === "connected" && blockNumber !== null && (
        <span className="text-foreground/60 font-mono">#{blockNumber}</span>
      )}
    </div>
  );
}
