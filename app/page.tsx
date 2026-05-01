export const dynamic = 'force-dynamic';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import HeroSection from '@/components/HeroSection';
import MarketOverview from '@/components/MarketOverview';
import DashboardManager from '@/components/DashboardManager';
import MarketImpactFeed from '@/components/MarketImpactFeed';
import SectorHeatmap from '@/components/SectorHeatmap';
import MarketCommentaryFeed from '@/components/MarketCommentaryFeed';
import AnalystDiscovery from '@/components/AnalystDiscovery';
import InternationalIndices from '@/components/InternationalIndices';
import { getMarketIndices } from '@/lib/fmp';

export default async function Home() {
  const indices = await getMarketIndices();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-100 font-sans relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/8 blur-[150px]" />
        <div className="absolute top-[30%] right-[-15%] w-[50%] h-[50%] rounded-full bg-cyan-500/6 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <Sidebar />

        {/* All page content shifted right on xl to make room for sidebar */}
        <div className="xl:ml-52">
          <HeroSection />

          <div id="markets" className="scroll-mt-20">
            <MarketOverview indices={indices} />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

            {/* ── Personal dashboard ── */}
            <div id="dashboard" className="mb-16 scroll-mt-20">
              <DashboardManager />
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">Market Intelligence</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* ── Global market data ── */}
            <div id="international" className="mb-12 scroll-mt-20">
              <InternationalIndices />
            </div>

            <div id="sectors" className="mb-16 scroll-mt-20">
              <SectorHeatmap />
            </div>

            <div id="analyst" className="mb-16 scroll-mt-20">
              <AnalystDiscovery />
            </div>

            <div id="impact" className="mb-12 scroll-mt-20">
              <MarketImpactFeed />
            </div>

            <div id="voices" className="mb-12 scroll-mt-20">
              <MarketCommentaryFeed />
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
