import { useState } from "react";
import { usePolkadot } from "@/lib/polkadot/PolkadotContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";

export function EndpointDialog() {
  const { endpoint, setEndpoint, reconnect } = usePolkadot();
  const [val, setVal] = useState(endpoint);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Endpoint settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Node endpoint</DialogTitle>
          <DialogDescription>
            Default: wss://tokenizing-assets-with-off-chain-legal-contracts-pallet.projectfreedom.io/ws. Browsers block ws:// from https:// pages — use a wss:// proxy or run on http://localhost.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="ws:// or wss://"
          className="font-mono text-sm"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setEndpoint(val.trim());
              reconnect();
              setOpen(false);
            }}
          >
            Save & Reconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
