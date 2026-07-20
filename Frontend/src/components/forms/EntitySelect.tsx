import { useEffect, useState } from "react";
import { Field } from "@/components/forms/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { hexToString } from "@/lib/polkadot/utils";

export interface AssetItem {
  id: number;
  name: string;
  isFungible: boolean;
}

export interface CollectionItem {
  id: number;
  name: string;
  frozen: boolean;
}

export function useAssets() {
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
            items.push({ id: i, name: hexToString(info.name), isFungible: !!info.isFungible });
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

export function useCollections() {
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

export function AssetSelect({
  value, onChange, label = "Asset", fungible,
}: { value: string; onChange: (v: string) => void; label?: string; fungible?: boolean }) {
  const { assets, loading } = useAssets();
  const filtered = fungible !== undefined
    ? assets.filter((a) => a.isFungible === fungible)
    : assets;
  return (
    <Field
      label={label}
      hint={loading ? "Loading assets…" : filtered.length === 0 ? "No assets found." : "Select an asset by name."}
    >
      <Select value={value} onValueChange={onChange} disabled={loading || filtered.length === 0}>
        <SelectTrigger>
          <SelectValue placeholder="Select asset" />
        </SelectTrigger>
        <SelectContent>
          {filtered.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              #{a.id} — {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function CollectionSelect({
  value, onChange, label = "Collection",
}: { value: string; onChange: (v: string) => void; label?: string }) {
  const { collections, loading } = useCollections();
  return (
    <Field
      label={label}
      hint={loading ? "Loading collections…" : collections.length === 0 ? "No collections found." : "Select a collection by name."}
    >
      <Select value={value} onValueChange={onChange} disabled={loading || collections.length === 0}>
        <SelectTrigger>
          <SelectValue placeholder="Select collection" />
        </SelectTrigger>
        <SelectContent>
          {collections.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              #{c.id} — {c.name}{c.frozen ? " (frozen)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}