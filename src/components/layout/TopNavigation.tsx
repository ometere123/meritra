import Link from "next/link";
import { AccountMenu } from "@/components/layout/AccountMenu";

export default function TopNavigation() {
  return (
    <header className="border-b border-graphite/60 bg-ink/60 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 border border-gold flex items-center justify-center heading text-gold">M</div>
          <div>
            <div className="heading text-ivory text-xl tracking-[0.18em]">MERITRA</div>
            <div className="dossier-label">Research Meridian</div>
          </div>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/rounds" className="tab-button">
            Grant Rounds
          </Link>
          <Link href="/create-round" className="seal-tab text-xs">
            Create Round
          </Link>
          <AccountMenu />
        </nav>
      </div>
    </header>
  );
}
