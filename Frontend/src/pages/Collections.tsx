import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ExtrinsicForm } from "@/components/ExtrinsicForm";
import { Field, TxtInput } from "@/components/forms/Field";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, Search, AlertTriangle, Lock } from "lucide-react";
import { isValidSs58, shortAddr, hexToString } from "@/lib/polkadot/utils";
import { fireRefresh, onRefresh } from "@/lib/polkadot/refreshBus";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { CollectionSelect } from "@/components/forms/EntitySelect";
import { toast } from "sonner";

export default function Collections() {
  const [lookupId, setLookupId] = useState("");
  const [lookupFrozen, setLookupFrozen] = useState<boolean | null>(null);

  return (
    <>
      <PageHeader title="Collections" description="Group assets into collections and grant on-chain roles." />
      <div className="grid gap-6 lg:grid-cols-2">
        <CreateCollectionForm />
        <SetRolesForm />
      </div>
      <div className="mt-6">
        <FreezeCollectionForm lookupId={lookupId} lookupFrozen={lookupFrozen} />
      </div>
      <div className="mt-6">
        <CollectionLookup
          collectionId={lookupId}
          setCollectionId={setLookupId}
          onFrozenChange={setLookupFrozen}
        />
      </div>
    </>
  );
}

function FreezeCollectionForm({ lookupId, lookupFrozen }: { lookupId: string; lookupFrozen: boolean | null }) {
  const { api } = usePolkadot();
  const [collectionId, setCollectionId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [preCheckErr, setPreCheckErr] = useState<string | null>(null);

  const idValid = /^\d+$/.test(collectionId);
  const matchesLookup = lookupId && lookupId === collectionId;
  const alreadyFrozen = matchesLookup && lookupFrozen === true;

  useEffect(() => {
    setPreCheckErr(null);
    if (!api || !idValid) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await (api.query as any).assetTokenization.collections(Number(collectionId));
        if (cancelled) return;
        if (!c.isSome) {
          setPreCheckErr(`Collection #${collectionId} does not exist.`);
        } else {
          const info = c.unwrap().toJSON();
          if (info.isFrozen) setPreCheckErr(`Collection #${collectionId} is already frozen.`);
        }
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, [api, collectionId, idValid]);

  const blocked = !!preCheckErr || alreadyFrozen;
  const canSubmit = idValid && confirmed && !blocked;

  return (
    <ExtrinsicForm
      title="Freeze Collection"
      description="Permanently lock a collection so no new assets can be minted into it."
      canSubmit={canSubmit}
      submitLabel={alreadyFrozen ? "This collection is already frozen" : "Freeze collection"}
      buildTx={(api) => api.tx.assetTokenization.freezeCollection(Number(collectionId))}
      onSuccess={() => {
        toast.success(`Collection #${collectionId} has been frozen`);
        fireRefresh();
        setConfirmed(false);
      }}
      banner={
        <div className="space-y-3">
          <div
            className="rounded-md p-3 text-sm flex gap-2 items-start"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "2px solid #EF4444",
              color: "#FCA5A5",
            }}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>This action is PERMANENT and IRREVERSIBLE.</strong>{" "}
              Once frozen, no new assets can be minted into this collection. Existing assets remain transferable unless individually frozen.
            </div>
          </div>
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle>Permissions</AlertTitle>
            <AlertDescription className="text-xs">
              Only the collection owner or an account with the Admin role can freeze a collection.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <div>
        <CollectionSelect value={collectionId} onChange={setCollectionId} label="Collection" />
        {(collectionId && !idValid) || preCheckErr ? (
          <p className="text-xs text-destructive mt-1">{collectionId && !idValid ? "Must be a non-negative integer" : preCheckErr}</p>
        ) : null}
      </div>
      <label className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 cursor-pointer">
        <Checkbox checked={confirmed} onCheckedChange={(c) => setConfirmed(Boolean(c))} />
        <span className="text-sm">I understand this action cannot be undone</span>
      </label>
    </ExtrinsicForm>
  );
}

function CreateCollectionForm() {
  const [name, setName] = useState("");
  const bytes = new TextEncoder().encode(name).length;
  const err = bytes > 64 ? "Max 64 bytes" : null;
  return (
    <ExtrinsicForm
      title="Create Collection"
      description="The signer becomes the collection owner."
      canSubmit={!!name && !err}
      submitLabel="Create"
      buildTx={(api) => api.tx.assetTokenization.createCollection(name)}
      onSuccess={() => { fireRefresh(); setName(""); }}
    >
      <Field label={`Name (${bytes}/64 bytes)`} error={err}>
        <TxtInput value={name} onChange={setName} placeholder="My Gallery" />
      </Field>
    </ExtrinsicForm>
  );
}

function SetRolesForm() {
  const [collectionId, setCollectionId] = useState("");
  const [who, setWho] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);
  const [isFreezer, setIsFreezer] = useState(false);
  const ok = /^\d+$/.test(collectionId) && isValidSs58(who);
  return (
    <ExtrinsicForm
      title="Manage Roles"
      description="Toggle Admin / Issuer / Freezer flags for an account in a collection."
      canSubmit={ok}
      submitLabel="Set roles"
      banner={
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Permissions</AlertTitle>
          <AlertDescription className="text-xs">
            Only the collection owner can grant the Admin role. Admins can grant Issuer and Freezer roles only.
          </AlertDescription>
        </Alert>
      }
      buildTx={(api) =>
        api.tx.assetTokenization.setCollectionRoles(
          Number(collectionId),
          who,
          { isAdmin, isIssuer, isFreezer },
        )
      }
      onSuccess={() => fireRefresh()}
    >
      <CollectionSelect value={collectionId} onChange={setCollectionId} label="Collection" />
      <Field label="Account (SS58)" error={who && !isValidSs58(who) ? "Invalid SS58 address" : null}>
        <TxtInput value={who} onChange={setWho} placeholder="5G…" mono />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Admin", v: isAdmin, set: setIsAdmin },
          { label: "Issuer", v: isIssuer, set: setIsIssuer },
          { label: "Freezer", v: isFreezer, set: setIsFreezer },
        ].map((r) => (
          <label key={r.label} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 cursor-pointer">
            <Checkbox checked={r.v} onCheckedChange={(c) => r.set(Boolean(c))} />
            <span className="text-sm">{r.label}</span>
          </label>
        ))}
      </div>
    </ExtrinsicForm>
  );
}

function CollectionLookup({
  collectionId,
  setCollectionId,
  onFrozenChange,
}: {
  collectionId: string;
  setCollectionId: (v: string) => void;
  onFrozenChange: (v: boolean | null) => void;
}) {
  const { api, blockNumber } = usePolkadot();
  const [account, setAccount] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [roles, setRoles] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const load = async () => {
    if (!api || !collectionId) return;
    setLoading(true);
    try {
      const id = Number(collectionId);
      const P = (api.query as any).assetTokenization;
      const c = await P.collections(id);
      const j = c.isSome ? c.unwrap().toJSON() : null;
      setInfo(j);
      onFrozenChange(j ? !!j.isFrozen : null);
      if (account && isValidSs58(account)) {
        const r = await P.collectionRoles(id, account);
        setRoles(r.isSome ? r.unwrap().toJSON() : r.toJSON());
      } else {
        setRoles(null);
      }
      setFetchedAt(blockNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => onRefresh(() => { if (collectionId) load(); }), [collectionId, account, api]);

  return (
    <Card className="surface-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Look Up Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <CollectionSelect value={collectionId} onChange={setCollectionId} label="Collection" />
          <Field label="Account for roles (optional)">
            <TxtInput value={account} onChange={setAccount} placeholder="5G…" mono />
          </Field>
          <Button onClick={load} disabled={!api || !collectionId || loading} className="bg-gradient-primary">Query</Button>
        </div>

        {fetchedAt != null && <div className="text-[10px] text-muted-foreground font-mono">@ #{fetchedAt}</div>}

        {info && (
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-xs uppercase text-muted-foreground mb-2">CollectionInfo</h4>
            <dl className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
              <dt className="text-muted-foreground">name</dt><dd className="font-medium">{hexToString(info.name)}</dd>
              <dt className="text-muted-foreground">owner</dt><dd className="font-mono text-xs break-all">{info.owner}</dd>
              <dt className="text-muted-foreground">status</dt>
              <dd>
                {info.isFrozen ? (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500 gap-1">
                    <Lock className="h-3 w-3" /> FROZEN 🔒
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500">ACTIVE ✓</Badge>
                )}
              </dd>
            </dl>
          </div>
        )}

        {roles && (
          <div className="rounded-md border border-border bg-card/50 p-4">
            <h4 className="text-xs uppercase text-muted-foreground mb-2">Roles for {shortAddr(account)}</h4>
            <div className="flex gap-2 flex-wrap">
              <RoleBadge label="Admin" on={!!roles.isAdmin} />
              <RoleBadge label="Issuer" on={!!roles.isIssuer} />
              <RoleBadge label="Freezer" on={!!roles.isFreezer} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoleBadge({ label, on }: { label: string; on: boolean }) {
  return on
    ? <Badge className="bg-primary/20 text-primary-glow border-primary/40">{label}</Badge>
    : <Badge variant="outline" className="text-muted-foreground">{label}</Badge>;
}