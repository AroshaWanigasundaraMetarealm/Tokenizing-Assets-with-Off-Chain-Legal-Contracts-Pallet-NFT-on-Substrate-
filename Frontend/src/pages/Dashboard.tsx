import { useEffect, useState } from "react";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { onRefresh } from "@/lib/polkadot/refreshBus";
import { PageHeader } from "@/components/PageHeader";
import { ResultCard } from "@/components/ResultCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtNumber, shortAddr } from "@/lib/polkadot/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Lock } from "lucide-react";

interface FeedEvent {
  id: string;
  method: string;
  data: string;
  block: number;
  rawMethod: string;
  collectionId?: string;
}

export default function Dashboard() {
  const { api, status, selectedAddress, blockNumber } = usePolkadot();
  const [nextAssetId, setNextAssetId] = useState<string | null>(null);
  const [nextCollectionId, setNextCollectionId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const PALLET = "assetTokenization";

  const refresh = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const at = (api.query as any)[PALLET];
      if (at?.nextAssetId) {
        const v = await at.nextAssetId();
        setNextAssetId(v.toString());
      }
      if (at?.nextCollectionId) {
        const v = await at.nextCollectionId();
        setNextCollectionId(v.toString());
      }
      if (selectedAddress) {
        const acc: any = await api.query.system.account(selectedAddress);
        setBalance(acc.data.free.toString());
      } else {
        setBalance(null);
      }
    } catch (e) {
      console.error("Dashboard refresh", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [api, selectedAddress]);
  useEffect(() => onRefresh(refresh), [api, selectedAddress]);

  // Subscribe to events
  useEffect(() => {
    if (!api) return;
    let unsub: any;
    (async () => {
      try {
        unsub = await api.query.system.events((records: any) => {
          const head = blockNumber ?? 0;
          const matched: FeedEvent[] = [];
          records.forEach((rec: any, i: number) => {
            const { event } = rec;
            if (event.section === PALLET) {
              const isFreeze = event.method === "CollectionFrozen";
              let collectionId: string | undefined;
              if (isFreeze) {
                try { collectionId = event.data[0]?.toString(); } catch {}
              }
              matched.push({
                id: `${head}-${i}-${event.method}`,
                method: `${event.section}.${event.method}`,
                rawMethod: event.method,
                data: event.data.toString(),
                block: head,
                collectionId,
              });
            }
          });
          if (matched.length > 0) {
            setEvents((prev) => [...matched.reverse(), ...prev].slice(0, 10));
          }
        });
      } catch (e) {
        console.warn("event subscription failed", e);
      }
    })();
    return () => { try { unsub?.(); } catch {} };
  }, [api, blockNumber]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of the assetTokenization pallet, your account, and live on-chain activity."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Node status" value={status === "connected" ? "Online" : status} accent />
        <StatCard label="Current block" value={blockNumber !== null ? `#${fmtNumber(blockNumber)}` : "—"} />
        <StatCard label="Next Asset ID" value={nextAssetId !== null ? fmtNumber(nextAssetId) : "—"} loading={loading} />
        <StatCard label="Next Collection ID" value={nextCollectionId !== null ? fmtNumber(nextCollectionId) : "—"} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Selected account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedAddress ? (
              <>
                <div className="font-mono text-xs break-all bg-muted/40 p-2 rounded border border-border">
                  {selectedAddress}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Free balance</span>
                  <span className="text-lg font-semibold gradient-text">
                    {balance ? fmtNumber(balance) : "—"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Connect Polkadot.js extension and pick an account in the top-right.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent {PALLET} events
            </CardTitle>
            <Badge variant="outline" className="text-xs">{events.length}/10</Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] pr-3">
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No events captured yet. Submit an extrinsic to see it appear here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {events.map((e) => {
                    const isFreeze = e.rawMethod === "CollectionFrozen";
                    return (
                      <li
                        key={e.id}
                        className={`rounded-md border p-3 ${
                          isFreeze
                            ? "border-red-500/60 bg-red-500/5"
                            : "border-border bg-card/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className={`font-medium text-sm flex items-center gap-1.5 ${isFreeze ? "text-red-400" : "text-primary-glow"}`}>
                            {isFreeze && <Lock className="h-3.5 w-3.5" />}
                            {isFreeze && e.collectionId
                              ? `Collection #${e.collectionId} Frozen`
                              : e.method}
                          </span>
                          <div className="flex items-center gap-2">
                            {isFreeze && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500 text-[10px]">PERMANENT</Badge>
                            )}
                            <span className="font-mono text-[10px] text-muted-foreground">#{e.block}</span>
                          </div>
                        </div>
                        <code className="text-[11px] text-muted-foreground break-all">{e.data}</code>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ label, value, accent, loading }: { label: string; value: string | number; accent?: boolean; loading?: boolean }) {
  return (
    <Card className="surface-card">
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
        <div className={`text-2xl font-bold ${accent ? "gradient-text" : ""} ${loading ? "animate-pulse-glow" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
