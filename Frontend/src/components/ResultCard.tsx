import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";

interface Props {
  title: string;
  loading?: boolean;
  fetchedAt?: number | null;
  onRefresh?: () => void;
  children: ReactNode;
  empty?: boolean;
}

export function ResultCard({ title, loading, fetchedAt, onRefresh, children, empty }: Props) {
  const { blockNumber } = usePolkadot();
  return (
    <Card className="surface-card border-border">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {fetchedAt != null && (
            <span className="text-[10px] text-muted-foreground font-mono">@ #{fetchedAt}</span>
          )}
          {onRefresh && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        {loading
          ? <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-48" /></div>
          : empty
            ? <div className="text-muted-foreground text-xs italic">No data</div>
            : children}
      </CardContent>
    </Card>
  );
}
