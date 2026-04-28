export const dynamic = 'force-dynamic';

import Navbar from '@/components/Navbar';
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
        <HeroSection />
        <MarketOverview indices={indices} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="mb-12">
            <InternationalIndices />
          </div>

          <div className="mb-16">
            <SectorHeatmap />
          </div>

          <div className="mb-16">
            <AnalystDiscovery />
          </div>

          <div className="mb-12">
            <MarketImpactFeed />
          </div>

          <div className="mb-12">
            <MarketCommentaryFeed />
          </div>

          <DashboardManager />
        </div>
      </div>
    </main>
  );
}
