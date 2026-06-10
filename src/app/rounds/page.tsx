"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllRounds, ContractNotConfiguredError } from "@/lib/genlayer/contracts";
import ContractNotice from "@/components/ui/ContractNotice";

export default function RoundsPage() {
  const [rounds, setRounds] = useState<{ id: string; data: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getAllRounds();
        setRounds(r.filter((x) => x.data));
      } catch (e) {
        if (e instanceof ContractNotConfiguredError) setError("contract");
        else setError(String((e as Error).message));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="dossier-label">Research Archive Shelf</div>
          <h1 className="section-title mt-1">Grant Rounds</h1>
        </div>
        <Link href="/create-round" className="seal-tab text-sm">◈ Create Round</Link>
      </div>

      <ContractNotice />

      {loading && <div className="text-margin">Loading archive…</div>}

      {!loading && rounds.length === 0 && !error && (
        <div className="manuscript-border p-10 text-center bg-manuscript/40">
          <div className="heading text-ivory text-2xl">No research grant rounds yet.</div>
          <p className="text-margin mt-2">
            Create the first MERITRA round to begin consensus-based proposal review.
          </p>
          <Link href="/create-round" className="seal-tab mt-6 inline-flex">◈ Create First Round</Link>
        </div>
      )}

      {!loading && rounds.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {rounds.map(({ id, data }, i) => (
            <Link key={id} href={`/rounds/${id}`}
              className={`folder p-6 block ${i % 3 === 1 ? "md:translate-y-4" : i % 3 === 2 ? "md:translate-y-8" : ""}`}>
              <div className="dossier-label mono">{id}</div>
              <div className="heading text-ivory text-2xl mt-2">{data.title}</div>
              <div className="text-margin text-sm mt-1">{data.fundingOrganisation}</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="dossier-label">Area</div>
                  <div className="text-ivory mono">{data.researchArea}</div>
                </div>
                <div>
                  <div className="dossier-label">Pool</div>
                  <div className="text-ivory mono">
                    {data.fundingPool ? `${data.fundingPool} ${data.currency || ""}` : "-"}
                  </div>
                </div>
                <div>
                  <div className="dossier-label">Deadline</div>
                  <div className="text-ivory mono">{data.applicationDeadline?.slice(0,10) || "-"}</div>
                </div>
                <div>
                  <div className="dossier-label">Status</div>
                  <div className="text-gold mono">{data.status}</div>
                </div>
              </div>
              <div className="mt-5 text-right">
                <span className="seal-tab text-xs">Open Round</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
