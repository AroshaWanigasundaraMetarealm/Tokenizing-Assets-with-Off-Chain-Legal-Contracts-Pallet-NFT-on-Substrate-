import { web3FromAddress, web3Enable } from "@polkadot/extension-dapp";
import type { ApiPromise } from "@polkadot/api";
import { toast } from "sonner";

export interface SubmitOpts {
  api: ApiPromise;
  address: string;
  tx: any; // SubmittableExtrinsic
  onStatus?: (msg: string) => void;
  onFinalized?: (blockHash: string) => void;
}

export async function signAndSubmit({ api, address, tx, onStatus, onFinalized }: SubmitOpts) {
  await web3Enable("Asset Tokenization Console");
  const injector = await web3FromAddress(address);
  return new Promise<void>((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, dispatchError, events }: any) => {
      if (status.isReady) {
        onStatus?.("Transaction submitted to the pool");
        toast.message("Transaction submitted");
      } else if (status.isInBlock) {
        onStatus?.(`Included in block ${status.asInBlock.toString().slice(0, 10)}…`);
      } else if (status.isFinalized) {
        if (dispatchError) {
          let msg = dispatchError.toString();
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            msg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
          }
          toast.error("Transaction failed", { description: msg });
          reject(new Error(msg));
        } else {
          const blockHash = status.asFinalized.toString();
          onFinalized?.(blockHash);
          // try to get the block number for nicer toast
          api.rpc.chain.getHeader(blockHash).then((h) => {
            toast.success(`Confirmed in block #${h.number.toNumber()}`);
          }).catch(() => toast.success("Transaction finalized"));
          resolve();
        }
      } else if (status.isInvalid || status.isDropped || status.isUsurped) {
        const m = `Transaction ${status.type}`;
        toast.error(m);
        reject(new Error(m));
      }
    }).catch((e: any) => {
      toast.error("Submission error", { description: e?.message ?? String(e) });
      reject(e);
    });
  });
}
