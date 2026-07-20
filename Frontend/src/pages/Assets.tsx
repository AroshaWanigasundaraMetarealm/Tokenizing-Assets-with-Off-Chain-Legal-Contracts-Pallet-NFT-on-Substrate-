import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ExtrinsicForm } from "@/components/ExtrinsicForm";
import { Field, TxtInput } from "@/components/forms/Field";
import { HexHashInput } from "@/components/forms/HexHashInput";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { hexToString, isValidHex32 } from "@/lib/polkadot/utils";
import { fireRefresh } from "@/lib/polkadot/refreshBus";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { AssetLookup } from "@/components/queries/AssetLookup";
import { FileUploadField } from "@/components/forms/FileUploadField";

interface CollectionItem {
  id: number;
  name: string;
  frozen: boolean;
}

function useCollections() {
  const { api } = usePolkadot();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const P = (api.query as any).assetTokenization;
        const next = await P.nextCollectionId();
        const count = Number(next.toString());
        if (count === 0) {
          if (!cancelled) setCollections([]);
          return;
        }
        const items: CollectionItem[] = [];
        for (let i = 0; i < count; i++) {
          const raw = await P.collections(i);
          if (raw.isSome) {
            const info = raw.unwrap().toJSON();
            items.push({ id: i, name: hexToString(info.name), frozen: !!info.isFrozen });
          }
        }
        if (!cancelled) setCollections(items);
      } catch (e) {
        console.error("useCollections", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  return { collections, loading };
}

export default function Assets() {
  const { collections, loading: collectionsLoading } = useCollections();
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<"Physical" | "Digital">("Digital");
  const [digitalMode, setDigitalMode] = useState<"upload" | "uri">("upload");
  const [contractUri, setContractUri] = useState("");
  const [contractHash, setContractHash] = useState("");
  const [isFungible, setIsFungible] = useState(false);
  const [supply, setSupply] = useState("");
  const [collectionId, setCollectionId] = useState("none");

  // Physical always uses upload; Digital uses user-selected mode
  const mode: "upload" | "uri" = assetType === "Physical" ? "upload" : digitalMode;

  const nameBytes = new TextEncoder().encode(name).length;
  const uriBytes = new TextEncoder().encode(contractUri).length;

  const nameErr = nameBytes > 64 ? "Max 64 bytes" : null;
  const uriErr = uriBytes > 256 ? "Max 256 bytes" : null;
  const hashErr = contractHash && !isValidHex32(contractHash) ? "Must be 0x + 64 hex chars" : null;
  const supplyErr = isFungible && !/^\d+$/.test(supply) ? "Required positive integer" : null;

  const canSubmit =
    !!name && !nameErr &&
    !!contractUri && !uriErr &&
    isValidHex32(contractHash) &&
    !supplyErr;

  const reset = () => {
    setName(""); setContractUri(""); setContractHash("");
    setIsFungible(false); setSupply(""); setCollectionId("none");
  };

  return (
    <>
      <PageHeader
        title="Assets"
        description="Mint a new tokenized asset and look up any asset by ID."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ExtrinsicForm
          title="Mint New Asset"
          description="Create a new on-chain asset bound to a contract URI and SHA-256 hash."
          canSubmit={canSubmit}
          submitLabel="Mint asset"
          buildTx={(api) =>
            api.tx.assetTokenization.mintAsset(
              name,
              { [assetType]: null },
              contractUri,
              contractHash,
              isFungible,
              isFungible ? supply : null,
              collectionId !== "none" ? Number(collectionId) : null,
            )
          }
          onSuccess={() => { fireRefresh(); reset(); }}
        >
          <Field label={`Name (${nameBytes}/64 bytes)`} error={nameErr}>
            <TxtInput value={name} onChange={setName} placeholder="My Tokenized Painting" />
          </Field>

          <Field label="Asset type">
            <Select value={assetType} onValueChange={(v: any) => setAssetType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Digital">Digital</SelectItem>
                <SelectItem value="Physical">Physical</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {assetType === "Digital" && (
            <Field label="Contract source" hint="Choose how to provide the contract document.">
              <Select value={digitalMode} onValueChange={(v: any) => {
                setDigitalMode(v);
                setContractUri("");
                setContractHash("");
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload contract document (IPFS)</SelectItem>
                  <SelectItem value="uri">Enter contract URI manually</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          {mode === "upload" && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
              <h4 className="text-sm font-semibold mb-3 text-purple-400">
                📄 Upload Contract Document
              </h4>
              <FileUploadField
                onUploadComplete={(uri, hash, filename) => {
                  setContractUri(uri);
                  setContractHash(hash);
                  toast({
                    title: "Auto-filled",
                    description: `Contract URI and SHA-256 hash populated from ${filename}`
                  });
                }}
              />
              <p className="text-xs text-muted-foreground mt-3">
                Upload your legal contract (PDF, Word, etc.) to IPFS. The URI and hash will be auto-filled.
              </p>
            </div>
          )}

          <Field label={`Contract URI (${uriBytes}/256 bytes)`} error={uriErr} hint={mode === "uri" ? "Paste your contract URI (e.g. ipfs://Qm…, https://…)" : "e.g. ipfs://Qm…"}>
            <TxtInput value={contractUri} onChange={setContractUri} placeholder="ipfs://Qm..." mono disabled={mode === "upload"} />
          </Field>

          <Field label="SHA-256 hash of contract" error={hashErr} hint="32 bytes — exactly 64 hex characters">
            <HexHashInput value={contractHash} onChange={setContractHash} disabled={mode === "upload"} />
          </Field>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">Fungible asset</div>
              <p className="text-xs text-muted-foreground">Toggle for ERC-20-style divisible tokens.</p>
            </div>
            <Switch checked={isFungible} onCheckedChange={setIsFungible} />
          </div>

          {isFungible && (
            <Field label="Fungible supply (u128)" error={supplyErr}>
              <TxtInput value={supply} onChange={setSupply} placeholder="1000000" mono />
            </Field>
          )}

          <Field label="Collection (optional)" hint={collectionsLoading ? "Loading collections…" : collections.length === 0 ? "No collections found." : "Select an existing collection, or leave blank."}>
            <Select
              value={collectionId}
              onValueChange={setCollectionId}
              disabled={collectionsLoading || collections.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="No collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No collection</SelectItem>
                {collections.map((col) => (
                  <SelectItem key={col.id} value={String(col.id)}>
                    #{col.id} — {col.name}{col.frozen ? " (frozen)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </ExtrinsicForm>

        <AssetLookup />
      </div>
    </>
  );
}