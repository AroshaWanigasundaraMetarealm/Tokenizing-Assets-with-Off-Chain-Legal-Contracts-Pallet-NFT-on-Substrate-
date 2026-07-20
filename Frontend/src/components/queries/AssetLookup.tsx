import { useEffect, useState } from "react";
import { ResultCard } from "@/components/ResultCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { onRefresh } from "@/lib/polkadot/refreshBus";
import { fmtNumber, shortAddr, hexToString } from "@/lib/polkadot/utils";
import { AssetSelect } from "@/components/forms/EntitySelect";
import { Search } from "lucide-react";

export function AssetLookup() {
  const { api, blockNumber, selectedAddress } = usePolkadot();
  const [assetId, setAssetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<boolean | null>(null);
  const [historyCount, setHistoryCount] = useState<string | null>(null);
  const [parentCol, setParentCol] = useState<string | null>(null);
  const [fungBal, setFungBal] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const fetchAll = async () => {
    if (!api || !assetId) return;
    setLoading(true);
    try {
      const id = Number(assetId);
      const P = (api.query as any).assetTokenization;
      const [a, o, f, hc, ac] = await Promise.all([
        P.assets(id),
        P.assetOwner(id),
        P.frozenAssets(id),
        P.contractHistoryCount(id),
        P.assetCollection(id),
      ]);
      setInfo(a.isSome ? a.unwrap().toJSON() : null);
      setOwner(o.isSome ? o.unwrap().toString() : null);
      setFrozen(f.isSome ? Boolean(f.unwrap().valueOf?.() ?? f.unwrap().toJSON()) : Boolean(f.toJSON?.()));
      setHistoryCount(hc.toString());
      setParentCol(ac.isSome ? ac.unwrap().toString() : null);
      if (selectedAddress) {
        const fb = await P.fungibleBalances(id, selectedAddress);
        setFungBal(fb.toString());
      } else {
        setFungBal(null);
      }
      setFetchedAt(blockNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => onRefresh(() => { if (assetId) fetchAll(); }), [assetId, api, selectedAddress]);

  return (
    <Card className="surface-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Look Up Asset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <AssetSelect value={assetId} onChange={setAssetId} label="Asset" />
          </div>
          <Button onClick={fetchAll} disabled={!api || !assetId || loading} className="bg-gradient-primary">
            Query
          </Button>
        </div>

        <ResultCard title="AssetInfo" loading={loading} fetchedAt={fetchedAt} onRefresh={fetchAll} empty={!info && !loading}>
          {info && (
            <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">name</dt>
              <dd className="font-medium">{hexToString(info.name) ?? "—"}</dd>
              <dt className="text-muted-foreground">type</dt>
              <dd>{typeof info.assetType === "object" ? Object.keys(info.assetType)[0] : String(info.assetType)}</dd>
              <dt className="text-muted-foreground">URI</dt>
              <dd className="font-mono break-all">{hexToString(info.contractUri)}</dd>
              <dt className="text-muted-foreground">hash</dt>
              <dd className="font-mono break-all">{info.contractHash}</dd>
              <dt className="text-muted-foreground">fungible</dt>
              <dd>{String(info.isFungible)}</dd>
              <dt className="text-muted-foreground">supply</dt>
              <dd>{info.fungibleSupply != null ? fmtNumber(info.fungibleSupply) : "—"}</dd>
              <dt className="text-muted-foreground">creator</dt>
              <dd className="font-mono break-all">{info.creator}</dd>
              <dt className="text-muted-foreground">created at</dt>
              <dd>#{fmtNumber(info.createdAt)}</dd>
            </dl>
          )}
        </ResultCard>

        <div className="grid grid-cols-2 gap-3">
          <ResultCard title="Owner" loading={loading} fetchedAt={fetchedAt} empty={!owner}>
            <span className="font-mono text-xs break-all">{owner ? shortAddr(owner, 8) : "—"}</span>
          </ResultCard>
          <ResultCard title="Status" loading={loading} fetchedAt={fetchedAt}>
            {frozen
              ? <Badge className="bg-destructive/20 text-destructive border-destructive/40">Frozen</Badge>
              : <Badge className="bg-success/20 text-success border-success/40">Active</Badge>}
          </ResultCard>
          <ResultCard title="Contract updates" loading={loading} fetchedAt={fetchedAt}>
            <span className="font-semibold">{historyCount != null ? fmtNumber(historyCount) : "—"}</span>
          </ResultCard>
          <ResultCard title="Parent collection" loading={loading} fetchedAt={fetchedAt}>
            {parentCol != null ? <span className="font-mono">#{parentCol}</span> : <span className="text-muted-foreground italic text-xs">No collection</span>}
          </ResultCard>
        </div>

        <ResultCard title="Your fungible balance" loading={loading} fetchedAt={fetchedAt}>
          {selectedAddress
            ? <span className="text-lg font-semibold gradient-text">{fungBal != null ? fmtNumber(fungBal) : "0"}</span>
            : <span className="text-xs text-muted-foreground italic">Connect wallet to view</span>}
        </ResultCard>
      </CardContent>
    </Card>
  );
}