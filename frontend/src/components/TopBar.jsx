import { Satellite, Radio, Clock, Wifi, Moon, Sun, LayoutDashboard, X } from 'lucide-react'

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300" />
    </span>
  )
}

export default function TopBar({ issData, isLoading, isNightMode, setNightMode, toggleAnalytics, isAnalyticsOpen }) {
  const now = new Date()
  const utc = now.toUTCString().split(' ').slice(1, 5).join(' ')

  return (
    <div className="glass border-b border-neon-blue/20 px-4 md:px-6 py-3 flex items-center justify-between"
      style={{ borderRadius: 0 }}>

      {/* Left – Brand */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', boxShadow: '0 0 14px rgba(0,212,255,0.5)' }}>
          <span className="text-sm">🌍</span>
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-bold tracking-widest gradient-text">ORBITX</div>
          <div className="text-[9px] text-neon-blue/50 font-mono tracking-[0.2em]">LIVE DASHBOARD</div>
        </div>
      </div>

      {/* Center – Status */}
      <div className="hidden lg:flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs font-mono text-white/60">
          <LiveDot />
          <span className={isLoading ? 'text-yellow-400' : 'text-green-400'}>
            {isLoading ? 'CONNECTING...' : 'LIVE FEED ACTIVE'}
          </span>
        </div>
        <div className="h-4 w-px bg-neon-blue/20" />
        <div className="flex items-center gap-1.5 text-xs font-mono text-white/50">
          <Clock size={11} className="text-neon-blue/50" />
          <span>{utc}</span>
        </div>
        <div className="h-4 w-px bg-neon-blue/20" />
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Satellite size={11} className="text-cyan-400" />
          <span className="text-cyan-300">ISS {issData.latitude?.toFixed(2)}°, {issData.longitude?.toFixed(2)}°</span>
        </div>
      </div>

      {/* Right – Actions & Signal */}
      <div className="flex items-center gap-2 md:gap-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setNightMode(!isNightMode)}
            className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full border transition-all duration-300 ${
              isNightMode 
              ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300 shadow-[0_0_15px_rgba(129,140,248,0.2)]' 
              : 'bg-orange-500/10 border-orange-400/30 text-orange-300'
            }`}
          >
            {isNightMode ? <Moon size={14} /> : <Sun size={14} />}
            <span className="hidden xs:block text-[10px] font-bold tracking-wider uppercase">
              {isNightMode ? 'NIGHT' : 'DAY'}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(b => (
              <div key={b} className="w-1 rounded-sm"
                style={{ height: `${b * 3 + 4}px`, background: b <= 4 ? '#00d4ff' : 'rgba(0,212,255,0.2)' }} />
            ))}
          </div>
          <Wifi size={14} className="text-neon-blue/50" />
        </div>

        {/* Mobile Analytics Toggle */}
        <button 
          onClick={toggleAnalytics}
          className="lg:hidden p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
        >
          {isAnalyticsOpen ? <X size={18} /> : <LayoutDashboard size={18} />}
        </button>
      </div>
    </div>
  )
}
