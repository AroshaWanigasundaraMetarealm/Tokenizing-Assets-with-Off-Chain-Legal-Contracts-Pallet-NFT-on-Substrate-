import { useState } from "react";
import { sha256 } from "js-sha256";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  onUploadComplete: (cid: string, hash: string, filename: string) => void;
}

export function FileUploadField({ onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ cid: string; filename: string } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploaded(null);

    try {
      // Compute SHA-256 hash
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const hashHex = "0x" + sha256(uint8Array);

      // Upload directly to Filebase IPFS RPC endpoint
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://rpc.filebase.io/api/v0/add", {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_FILEBASE_IPFS_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { Hash } = await response.json();
      const ipfsUri = `ipfs://${Hash}`;

      setUploaded({ cid: Hash, filename: file.name });
      toast.success("File uploaded to IPFS", { description: `CID: ${Hash}` });

      // Pass back the URI and hash
      onUploadComplete(ipfsUri, hashHex, file.name);
    } catch (err: any) {
      toast.error("Upload failed", { description: err?.message ?? String(err) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="file"
          id="ipfs-file-upload"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="ipfs-file-upload" className="flex-1">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading to IPFS...
                </>
              ) : uploaded ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Uploaded: {uploaded.filename}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Contract Document to IPFS
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      {uploaded && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-xs font-mono text-green-400">
            CID: {uploaded.cid}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Contract URI and hash have been auto-filled below.
          </p>
        </div>
      )}
    </div>
  );
}