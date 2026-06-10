"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "meritra.seenIntro.v1";

/**
 * One-shot landing card for first-time visitors. Dismissed value is persisted
 * in localStorage so returning users don't see it again. The card mounts
 * client-only (returns null during SSR / before hydration) so existing
 * server-rendered landing markup is untouched until the browser confirms the
 * user hasn't dismissed it before.
 */
export default function IntroCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(STORAGE_KEY)) {
        setShow(true);
      }
    } catch {
      /* localStorage blocked - just don't show */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <section className="max-w-5xl mx-auto px-6 pt-8">
      <div className="manuscript-border bg-manuscript/80 p-6 relative">
        <button
          onClick={dismiss}
          aria-label="Dismiss intro"
          className="absolute top-3 right-3 text-margin hover:text-ivory text-xs mono"
        >
          dismiss x
        </button>
        <div className="dossier-label">Welcome to MERITRA</div>
        <h2 className="heading text-ivory text-2xl mt-1">
          Research grant review, decided by consensus.
        </h2>
        <p className="text-ivory/85 text-sm mt-3 leading-relaxed">
          MERITRA is a GenLayer-native research grant reviewer. Funders open a round, applicants submit
          sealed (commit-reveal protected) proposals, and GenLayer validators produce a non-deterministic
          consensus judgement on merit, feasibility, impact, budget and ranking, instead of a fixed rubric formula.
        </p>
        <ol className="text-ivory/80 text-sm mt-3 list-decimal list-inside space-y-1">
          <li>Creator opens a grant round with a rubric and deadlines.</li>
          <li>Applicants commit a sealed hash of their proposal; content is hidden until reveal.</li>
          <li>After commitments close, applicants reveal; GenLayer scores, ranks and recommends funding.</li>
        </ol>
        <div className="flex gap-3 flex-wrap mt-5">
          <Link href="/create-round" className="seal-tab text-xs" onClick={dismiss}>
            Create a grant round
          </Link>
          <Link href="/rounds" className="tab-button text-xs" onClick={dismiss}>
            Browse rounds
          </Link>
          <Link href="/reveal" className="tab-button text-xs" onClick={dismiss}>
            My sealed applications
          </Link>
        </div>
      </div>
    </section>
  );
}
