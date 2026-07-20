import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ExtrinsicForm } from "@/components/ExtrinsicForm";
import { Field, TxtInput } from "@/components/forms/Field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { isValidSs58 } from "@/lib/polkadot/utils";
import { fireRefresh } from "@/lib/polkadot/refreshBus";
import { AssetSelect } from "@/components/forms/EntitySelect";

export default function Transfers() {
  return (
    <>
      <PageHeader title="Transfers" description="Move NFT or fungible balances, or freeze an asset permanently." />
      <div className="grid gap-6 lg:grid-cols-2">
        <TransferAssetForm />
        <TransferFungibleForm />
      </div>
      <div className="mt-6 max-w-xl">
        <FreezeAssetForm />
      </div>
    </>
  );
}

function TransferAssetForm() {
  const [assetId, setAssetId] = useState("");
  const [to, setTo] = useState("");
  const idOk = /^\d+$/.test(assetId);
  const toOk = isValidSs58(to);
  return (
    <ExtrinsicForm
      title="Transfer Asset (NFT)"
      description="Transfer non-fungible ownership of the entire asset to another account."
      canSubmit={idOk && toOk}
      submitLabel="Transfer"
      banner={
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Sign first</AlertTitle>
          <AlertDescription className="text-xs">
            You must have signed the contract (Contracts page) before transferring.
          </AlertDescription>
        </Alert>
      }
      buildTx={(api) => api.tx.assetTokenization.transferAsset(Number(assetId), to)}
      onSuccess={() => fireRefresh()}
    >
      <AssetSelect value={assetId} onChange={setAssetId} label="Asset" fungible={false} />
      <Field label="Recipient (SS58 address)" error={to && !toOk ? "Invalid SS58 address" : null}>
        <TxtInput value={to} onChange={setTo} placeholder="5G…" mono />
      </Field>
    </ExtrinsicForm>
  );
}

function TransferFungibleForm() {
  const [assetId, setAssetId] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const ok = /^\d+$/.test(assetId) && isValidSs58(to) && /^\d+$/.test(amount);
  return (
    <ExtrinsicForm
      title="Transfer Fungible Tokens"
      description="Move a u128 amount of a fungible asset's units."
      canSubmit={ok}
      submitLabel="Send tokens"
      buildTx={(api) => api.tx.assetTokenization.transferFungible(Number(assetId), to, amount)}
      onSuccess={() => fireRefresh()}
    >
      <AssetSelect value={assetId} onChange={setAssetId} label="Asset" fungible={true} />
      <Field label="Recipient (SS58 address)" error={to && !isValidSs58(to) ? "Invalid SS58 address" : null}>
        <TxtInput value={to} onChange={setTo} placeholder="5G…" mono />
      </Field>
      <Field label="Amount (u128)">
        <TxtInput value={amount} onChange={setAmount} placeholder="100" mono />
      </Field>
    </ExtrinsicForm>
  );
}

function FreezeAssetForm() {
  const [assetId, setAssetId] = useState("");
  const ok = /^\d+$/.test(assetId);
  return (
    <ExtrinsicForm
      title="Freeze Asset"
      description="Permanently lock an asset against further updates."
      canSubmit={ok}
      submitLabel="Freeze permanently"
      banner={
        <Alert className="border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle>Irreversible</AlertTitle>
          <AlertDescription className="text-xs">
            This action is irreversible. Once frozen, the asset cannot be updated.
          </AlertDescription>
        </Alert>
      }
      buildTx={(api) => api.tx.assetTokenization.freezeAsset(Number(assetId))}
      onSuccess={() => fireRefresh()}
    >
      <AssetSelect value={assetId} onChange={setAssetId} label="Asset" />
    </ExtrinsicForm>
  );
}