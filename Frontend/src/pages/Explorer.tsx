import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, TxtInput } from "@/components/forms/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { safeStringify } from "@/lib/polkadot/utils";
import { AssetSelect, CollectionSelect } from "@/components/forms/EntitySelect";
import { Search } from "lucide-react";

type ArgType = "u64" | "u32" | "AccountId";
type Selector = "asset" | "collection";
interface ArgDef { name: string; type: ArgType; selector?: Selector }
interface QueryDef {
  key: string;
  label: string;
  storage: string;
  args: ArgDef[];
}

const QUERIES: QueryDef[] = [
  { key: "nextAssetId", label: "NextAssetId", storage: "nextAssetId", args: [] },
  { key: "nextCollectionId", label: "NextCollectionId", storage: "nextCollectionId", args: [] },
  { key: "assets", label: "Assets(asset_id)", storage: "assets", args: [{ name: "asset_id", type: "u64", selector: "asset" }] },
  { key: "assetOwner", label: "AssetOwner(asset_id)", storage: "assetOwner", args: [{ name: "asset_id", type: "u64", selector: "asset" }] },
  { key: "frozenAssets", label: "FrozenAssets(asset_id)", storage: "frozenAssets", args: [{ name: "asset_id", type: "u64", selector: "asset" }] },
  { key: "contractSignatures", label: "ContractSignatures(asset_id, account)", storage: "contractSignatures",
    args: [{ name: "asset_id", type: "u64", selector: "asset" }, { name: "account", type: "AccountId" }] },
  { key: "contractHistory", label: "ContractHistory(asset_id, version)", storage: "contractHistory",
    args: [{ name: "asset_id", type: "u64", selector: "asset" }, { name: "version", type: "u32" }] },
  { key: "contractHistoryCount", label: "ContractHistoryCount(asset_id)", storage: "contractHistoryCount",
    args: [{ name: "asset_id", type: "u64", selector: "asset" }] },
  { key: "collections", label: "Collections(collection_id)", storage: "collections",
    args: [{ name: "collection_id", type: "u64", selector: "collection" }] },
  { key: "collectionRoles", label: "CollectionRoles(collection_id, account)", storage: "collectionRoles",
    args: [{ name: "collection_id", type: "u64", selector: "collection" }, { name: "account", type: "AccountId" }] },
  { key: "assetCollection", label: "AssetCollection(asset_id)", storage: "assetCollection",
    args: [{ name: "asset_id", type: "u64", selector: "asset" }] },
  { key: "fungibleBalances", label: "FungibleBalances(asset_id, account)", storage: "fungibleBalances",
    args: [{ name: "asset_id", type: "u64", selector: "asset" }, { name: "account", type: "AccountId" }] },
];

export default function Explorer() {
  const { api, blockNumber } = usePolkadot();
  const [selected, setSelected] = useState<string>(QUERIES[0].key);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = QUERIES.find((q) => q.key === selected)!;

  const update = (k: string, v: string) => setArgs((p) => ({ ...p, [k]: v }));

  const run = async () => {
    if (!api) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const P = (api.query as any).assetTokenization;
      const fn = P[def.storage];
      if (!fn) throw new Error(`Storage item ${def.storage} not found`);
      const callArgs = def.args.map((a) => {
        const v = args[a.name] ?? "";
        if (a.type === "AccountId") return v;
        return Number(v);
      });
      const res = await fn(...callArgs);
      setResult(safeStringify(res.toJSON?.() ?? res.toString()));
      setFetchedAt(blockNumber);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Query Explorer" description="Run any of the 12 storage items and see the decoded JSON result." />
      <Card className="surface-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            assetTokenization storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Storage item">
              <Select value={selected} onValueChange={(v) => { setSelected(v); setArgs({}); setResult(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUERIES.map((q) => (
                    <SelectItem key={q.key} value={q.key}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {def.args.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {def.args.map((a) => {
                if (a.selector === "asset") {
                  return (
                    <AssetSelect
                      key={a.name}
                      label={`${a.name} (asset)`}
                      value={args[a.name] ?? ""}
                      onChange={(v) => update(a.name, v)}
                    />
                  );
                }
                if (a.selector === "collection") {
                  return (
                    <CollectionSelect
                      key={a.name}
                      label={`${a.name} (collection)`}
                      value={args[a.name] ?? ""}
                      onChange={(v) => update(a.name, v)}
                    />
                  );
                }
                return (
                  <Field key={a.name} label={`${a.name} (${a.type})`}>
                    <TxtInput
                      value={args[a.name] ?? ""}
                      onChange={(v) => update(a.name, v)}
                      placeholder={a.type === "AccountId" ? "5G…" : "0"}
                      mono
                    />
                  </Field>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={run} disabled={!api || loading} className="bg-gradient-primary shadow-glow">
              Run query
            </Button>
          </div>

          <div className="rounded-md border border-border bg-background/60 p-4 min-h-[180px]">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : error ? (
              <pre className="text-xs text-destructive whitespace-pre-wrap break-all">{error}</pre>
            ) : result ? (
              <>
                {fetchedAt != null && <div className="text-[10px] text-muted-foreground font-mono mb-2">@ block #{fetchedAt}</div>}
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/90">{result}</pre>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Pick a storage item, fill any keys, and run the query.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}