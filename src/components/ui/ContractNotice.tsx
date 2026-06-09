"use client";
import { isContractConfigured } from "@/lib/genlayer/config";

export default function ContractNotice() {
  if (isContractConfigured()) return null;
  return (
    <div className="manuscript-border bg-manuscript/80 p-5 my-6 max-w-3xl">
      <div className="dossier-label mb-2">Setup notice</div>
      <p className="text-ivory heading text-lg">
        GenLayer contract is not configured yet.
      </p>
      <p className="text-margin text-sm mt-1">
        Deploy Meritra and add <span className="mono text-gold">NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS</span> to enable live research grant reviews.
      </p>
    </div>
  );
}
