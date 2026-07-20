import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { shortAddr } from "@/lib/polkadot/utils";
import { Wallet } from "lucide-react";

export function AccountSelector() {
  const { accounts, selectedAddress, setSelectedAddress, enableExtension, extensionInstalled } = usePolkadot();

  if (accounts.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={enableExtension} className="gap-2">
        <Wallet className="h-4 w-4" />
        {extensionInstalled === false ? "Install Polkadot.js" : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <Select value={selectedAddress ?? undefined} onValueChange={setSelectedAddress}>
      <SelectTrigger className="w-[220px] h-9">
        <Wallet className="h-3.5 w-3.5 mr-1 text-primary" />
        <SelectValue placeholder="Pick account" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.address} value={a.address}>
            <div className="flex flex-col">
              <span className="font-medium">{a.meta.name ?? "Unnamed"}</span>
              <span className="font-mono text-xs text-muted-foreground">{shortAddr(a.address)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
