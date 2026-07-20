import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
type InjectedAccountWithMeta = { address: string; meta: { name?: string; source: string; genesisHash?: string | null }; type?: string };
import { toast } from "sonner";

export type ConnStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface PolkadotCtx {
  api: ApiPromise | null;
  status: ConnStatus;
  endpoint: string;
  setEndpoint: (e: string) => void;
  reconnect: () => void;
  blockNumber: number | null;
  // accounts
  accounts: InjectedAccountWithMeta[];
  selectedAddress: string | null;
  setSelectedAddress: (a: string) => void;
  extensionInstalled: boolean | null;
  enableExtension: () => Promise<void>;
}

const Ctx = createContext<PolkadotCtx | null>(null);

const DEFAULT_ENDPOINT = "wss://tokenizing-assets-with-off-chain-legal-contracts-pallet.projectfreedom.io/ws";
const STORAGE_KEY = "at_endpoint";
const ACC_KEY = "at_selected_account";

export function PolkadotProvider({ children }: { children: ReactNode }) {
  const [endpoint, setEndpointState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_ENDPOINT,
  );
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [status, setStatus] = useState<ConnStatus>("idle");
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAddress, setSelectedAddressState] = useState<string | null>(
    () => localStorage.getItem(ACC_KEY),
  );
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);

  const setEndpoint = (e: string) => {
    localStorage.setItem(STORAGE_KEY, e);
    setEndpointState(e);
  };
  const setSelectedAddress = (a: string) => {
    localStorage.setItem(ACC_KEY, a);
    setSelectedAddressState(a);
  };
  const reconnect = () => setReconnectKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    let provider: WsProvider | null = null;
    let apiInst: ApiPromise | null = null;
    let unsubBlocks: (() => void) | null = null;

    setStatus("connecting");
    setApi(null);
    setBlockNumber(null);

    (async () => {
      try {
        provider = new WsProvider(endpoint, 2000);
        provider.on("connected", () => !cancelled && setStatus("connected"));
        provider.on("disconnected", () => !cancelled && setStatus("disconnected"));
        provider.on("error", () => !cancelled && setStatus("error"));

        apiInst = await ApiPromise.create({ provider, throwOnConnect: false });
        if (cancelled) {
          await apiInst.disconnect();
          return;
        }
        await apiInst.isReady;
        if (cancelled) return;
        setApi(apiInst);
        setStatus("connected");
        toast.success("Connected to node", { description: endpoint });

        const unsub = await apiInst.rpc.chain.subscribeNewHeads((header) => {
          setBlockNumber(header.number.toNumber());
        });
        unsubBlocks = unsub as unknown as () => void;
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        toast.error("Failed to connect", { description: err?.message ?? String(err) });
      }
    })();

    return () => {
      cancelled = true;
      try { unsubBlocks?.(); } catch {}
      try { apiInst?.disconnect(); } catch {}
    };
  }, [endpoint, reconnectKey]);

  const enableExtension = async () => {
    try {
      const exts = await web3Enable("Asset Tokenization Console");
      if (exts.length === 0) {
        setExtensionInstalled(false);
        toast.error("Polkadot.js extension not found", {
          description: "Install it to sign transactions.",
        });
        return;
      }
      setExtensionInstalled(true);
      const accs = await web3Accounts();
      setAccounts(accs);
      if (accs.length > 0) {
        const stored = localStorage.getItem(ACC_KEY);
        const found = accs.find((a) => a.address === stored);
        if (!found) setSelectedAddress(accs[0].address);
        toast.success(`${accs.length} account${accs.length > 1 ? "s" : ""} loaded`);
      } else {
        toast.message("No accounts in extension");
      }
    } catch (err: any) {
      toast.error("Extension error", { description: err?.message ?? String(err) });
    }
  };

  const value = useMemo<PolkadotCtx>(
    () => ({
      api, status, endpoint, setEndpoint, reconnect, blockNumber,
      accounts, selectedAddress, setSelectedAddress, extensionInstalled, enableExtension,
    }),
    [api, status, endpoint, blockNumber, accounts, selectedAddress, extensionInstalled],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePolkadot() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePolkadot must be used inside PolkadotProvider");
  return v;
}
