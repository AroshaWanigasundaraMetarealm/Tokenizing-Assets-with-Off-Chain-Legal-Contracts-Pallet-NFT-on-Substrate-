import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ExtrinsicForm } from "@/components/ExtrinsicForm";
import { Field, TxtInput } from "@/components/forms/Field";
import { HexHashInput } from "@/components/forms/HexHashInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, History } from "lucide-react";
import { hexToString, isValidHex32 } from "@/lib/polkadot/utils";
import { fireRefresh } from "@/lib/polkadot/refreshBus";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { toast } from "sonner";

interface AssetItem {
  id: number;
  name: string;
}

function useAssets() {
  const { api } = usePolkadot();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const P = (api.query as any).assetTokenization;
        const next = await P.nextAssetId();
        const count = Number(next.toString());
        if (count === 0) {
          if (!cancelled) setAssets([]);
          return;
        }
        const items: AssetItem[] = [];
        for (let i = 0; i < count; i++) {
          const raw = await P.assets(i);
          if (raw.isSome) {
            const info = raw.unwrap().toJSON();
            items.push({ id: i, name: hexToString(info.name) });
          }
        }
        if (!cancelled) setAssets(items);
      } catch (e) {
        console.error("useAssets", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  return { assets, loading };
}

function AssetSelect({
  value, onChange, label = "Asset",
}: { value: string; onChange: (v: string) => void; label?: string }) {
  const { assets, loading } = useAssets();
  return (
    <Field
      label={label}
      hint={loading ? "Loading assets…" : assets.length === 0 ? "No assets found." : "Select an asset by name."}
    >
      <Select value={value} onValueChange={onChange} disabled={loading || assets.length === 0}>
        <SelectTrigger>
          <SelectValue placeholder="Select asset" />
        </SelectTrigger>
        <SelectContent>
          {assets.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              #{a.id} — {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export default function Contracts() {
  return (
    <>
      <PageHeader title="Contracts" description="Sign asset contracts, push updates (auto-archived), and review the audit trail." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SignContractForm />
        <UpdateContractForm />
      </div>
      <div className="mt-6">
        <ContractHistoryViewer />
      </div>
    </>
  );
}

function SignContractForm() {
  const [assetId, setAssetId] = useState("");
  const ok = /^\d+$/.test(assetId);
  return (
    <ExtrinsicForm
      title="Sign Contract"
      description="Cryptographically attest that you've reviewed the contract for this asset."
      canSubmit={ok}
      submitLabel="Sign"
      buildTx={(api) => api.tx.assetTokenization.signContract(Number(assetId))}
      onSuccess={() => fireRefresh()}
    >
      <AssetSelect value={assetId} onChange={setAssetId} />
    </ExtrinsicForm>
  );
}

function UpdateContractForm() {
  const [assetId, setAssetId] = useState("");
  const [uri, setUri] = useState("");
  const [hash, setHash] = useState("");
  const uriBytes = new TextEncoder().encode(uri).length;
  const ok = /^\d+$/.test(assetId) && !!uri && uriBytes <= 256 && isValidHex32(hash);

  return (
    <ExtrinsicForm
      title="Update Contract"
      description="Upload a new contract document — URI and hash are filled automatically."
      canSubmit={!!ok}
      submitLabel="Push update"
      banner={
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Auditable</AlertTitle>
          <AlertDescription className="text-xs">
            Each update is permanently archived on-chain for auditability.
          </AlertDescription>
        </Alert>
      }
      buildTx={(api) => api.tx.assetTokenization.updateContract(Number(assetId), uri, hash)}
      onSuccess={() => { fireRefresh(); setUri(""); setHash(""); }}
    >
      <AssetSelect value={assetId} onChange={setAssetId} />

      <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
        <h4 className="text-sm font-semibold mb-3 text-purple-400">
          📄 Upload New Contract Document
        </h4>
        <FileUploadField
          onUploadComplete={(newUri, newHash, filename) => {
            setUri(newUri);
            setHash(newHash);
            toast.success("Auto-filled", {
              description: `Contract URI and SHA-256 hash populated from ${filename}`,
            });
          }}
        />
        <p className="text-xs text-muted-foreground mt-3">
          Upload your updated legal contract (PDF, Word, etc.) to IPFS. The URI and hash will be auto-filled.
        </p>
      </div>

      <Field label={`Contract URI (${uriBytes}/256 bytes)`} hint="Auto-filled from uploaded document">
        <TxtInput value={uri} onChange={setUri} placeholder="ipfs://Qm..." mono disabled />
      </Field>
      <Field label="SHA-256 hash" hint="Auto-filled from uploaded document">
        <HexHashInput value={hash} onChange={setHash} disabled />
      </Field>
    </ExtrinsicForm>
  );
}

function ContractHistoryViewer() {
  const { api, blockNumber } = usePolkadot();
  const [assetId, setAssetId] = useState("");
  const [rows, setRows] = useState<{ index: number; hash: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const load = async () => {
    if (!api || !assetId) return;
    setLoading(true);
    try {
      const id = Number(assetId);
      const P = (api.query as any).assetTokenization;
      const cnt = (await P.contractHistoryCount(id)).toString();
      const total = Number(cnt);
      const promises = [];
      for (let i = 0; i < total; i++) promises.push(P.contractHistory(id, i));
      const results = await Promise.all(promises);
      setRows(results.map((r: any, i: number) => ({
        index: i,
        hash: r.isSome ? r.unwrap().toString() : r.toString(),
      })));
      setFetchedAt(blockNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="surface-card border-border">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Contract History Viewer
        </CardTitle>
        {fetchedAt != null && <span className="text-[10px] text-muted-foreground font-mono">@ #{fetchedAt}</span>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-xs">
            <AssetSelect value={assetId} onChange={setAssetId} />
          </div>
          <Button onClick={load} disabled={!api || !assetId || loading} className="bg-gradient-primary">
            Load history
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No archived versions for this asset (yet).</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-3">
            {rows.map((r) => (
              <li key={r.index} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />
                <div className="rounded-md border border-border bg-card/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Version #{r.index}</div>
                  <code className="font-mono text-xs break-all">{r.hash}</code>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}