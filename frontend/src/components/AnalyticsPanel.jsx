import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Satellite, MapPin, Thermometer, Wind, Droplets, Globe, Navigation, Activity, Zap } from 'lucide-react'

function Section({ title, icon: Icon, children, accent = '#00d4ff' }) {
  return (
    <div className="glass-light p-3 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} style={{ color: accent }} />
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: accent }}>
          {title}
        </span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg,${accent}40,transparent)` }} />
      </div>
      {children}
    </div>
  )
}

function DataRow({ label, value, unit = '', accent }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">{label}</span>
      <span className="text-xs font-mono" style={{ color: accent || '#e2f0ff' }}>
        {value}<span className="text-white/30 ml-0.5 text-[9px]">{unit}</span>
      </span>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-2.5 py-1.5 text-xs font-mono rounded-lg">
      <div className="text-neon-blue/70">{label}</div>
      <div className="text-cyan-300">{payload[0]?.value}°C</div>
    </div>
  )
}

export default function AnalyticsPanel({ issData, selectedCountry, weather, tempHistory }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="h-full flex flex-col glass border-l border-neon-blue/15 panel-scroll"
      style={{ borderRadius: 0 }}>

      {/* Panel header */}
      <div className="px-4 py-3 border-b border-neon-blue/15 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-[0.25em] text-neon-blue uppercase">Analytics Hub</span>
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {['overview', 'satellite', 'weather'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all"
              style={{
                background: activeTab === t ? 'rgba(0,212,255,0.15)' : 'transparent',
                color: activeTab === t ? '#00d4ff' : 'rgba(255,255,255,0.35)',
                border: `1px solid ${activeTab === t ? 'rgba(0,212,255,0.4)' : 'transparent'}`,
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-0">

        {/* ── ISS Live Coordinates ── */}
        <Section title="ISS Live Position" icon={Navigation} accent="#00d4ff">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="glass-light p-2 rounded-lg text-center">
              <div className="text-[9px] text-white/40 font-mono mb-1">LATITUDE</div>
              <div className="text-sm font-mono text-cyan-300">
                {issData.latitude?.toFixed(4) ?? '--'}°
              </div>
            </div>
            <div className="glass-light p-2 rounded-lg text-center">
              <div className="text-[9px] text-white/40 font-mono mb-1">LONGITUDE</div>
              <div className="text-sm font-mono text-cyan-300">
                {issData.longitude?.toFixed(4) ?? '--'}°
              </div>
            </div>
          </div>
          <DataRow label="Altitude"  value={issData.altitude ?? 408}  unit="km"   accent="#00ff88" />
          <DataRow label="Velocity"  value={(issData.velocity ?? 27600).toLocaleString()} unit="km/h" accent="#ffaa00" />
          <DataRow label="Period"    value="92.65"  unit="min"  />
          <DataRow label="Inclination" value="51.6" unit="°"   />
        </Section>

        {/* ── Satellite Fleet ── */}
        {(activeTab === 'overview' || activeTab === 'satellite') && (
          <Section title="Satellite Fleet" icon={Satellite} accent="#8b5cf6">
            {[
              { name: 'ISS',        alt: '408 km',    spd: '27,600',  status: 'ACTIVE',  color: '#00d4ff' },
              { name: 'Starlink-A', alt: '550 km',    spd: '27,400',  status: 'ACTIVE',  color: '#00ff88' },
              { name: 'WorldView',  alt: '617 km',    spd: '27,100',  status: 'ACTIVE',  color: '#ffaa00' },
              { name: 'Starlink-B', alt: '540 km',    spd: '27,500',  status: 'ACTIVE',  color: '#ff66ff' },
            ].map(sat => (
              <div key={sat.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sat.color }} />
                  <span className="text-xs font-mono text-white/80">{sat.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono" style={{ color: sat.color }}>{sat.alt}</div>
                  <div className="text-[9px] text-white/30">{sat.spd} km/h</div>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* ── Temperature Chart ── */}
        {(activeTab === 'overview' || activeTab === 'weather') && (
          <Section title="Temperature (24h)" icon={Thermometer} accent="#ff6b35">
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tempHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ff6b35" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="temp" stroke="#ff6b35" strokeWidth={1.5}
                    fill="url(#tempGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {/* ── Weather Widget ── */}
        {(activeTab === 'overview' || activeTab === 'weather') && (
          <Section title="Weather Overlay" icon={Wind} accent="#38bdf8">
            {weather ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-base font-bold text-white">{weather.temp}°C</div>
                    <div className="text-[10px] text-white/50">{weather.condition}</div>
                  </div>
                  <div className="text-3xl">{weather.temp > 30 ? '☀️' : weather.temp > 20 ? '⛅' : '🌧️'}</div>
                </div>
                <DataRow label="Location"   value={weather.location || '—'} />
                <DataRow label="Humidity"   value={weather.humidity}  unit="%" accent="#38bdf8" />
                <DataRow label="Wind Speed" value={weather.wind_speed} unit="km/h" accent="#7dd3fc" />
              </div>
            ) : (
              <div className="text-[11px] text-white/30 font-mono text-center py-2">
                Click a country to load weather
              </div>
            )}
          </Section>
        )}

        {/* ── Selected Country Info ── */}
        {selectedCountry && (
          <Section title="Country Intel" icon={Globe} accent="#ffd700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{selectedCountry.flag}</span>
              <div>
                <div className="text-sm font-semibold text-white">{selectedCountry.name}</div>
                <div className="text-[10px] text-neon-blue/60 font-mono">{selectedCountry.capital}</div>
              </div>
            </div>
            <DataRow label="Population" value={selectedCountry.population} accent="#ffd700" />
            <DataRow label="Area"       value={selectedCountry.area} />
            <DataRow label="Timezone"   value={selectedCountry.timezone} accent="#a3e635" />
            <DataRow label="Latitude"   value={`${selectedCountry.lat.toFixed(2)}°`} />
            <DataRow label="Longitude"  value={`${selectedCountry.lon.toFixed(2)}°`} />
          </Section>
        )}

        {/* ── System Status ── */}
        <Section title="System Status" icon={Activity} accent="#00ff88">
          {[
            { label: 'ISS Telemetry',   pct: 98, color: '#00ff88' },
            { label: 'Weather Feed',    pct: 87, color: '#38bdf8' },
            { label: 'Sat Tracking',    pct: 100, color: '#8b5cf6' },
            { label: 'Render Engine',   pct: 72, color: '#ffaa00' },
          ].map(item => (
            <div key={item.label} className="mb-2 last:mb-0">
              <div className="flex justify-between text-[9px] font-mono mb-1">
                <span className="text-white/40">{item.label}</span>
                <span style={{ color: item.color }}>{item.pct}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${item.pct}%`, background: `linear-gradient(90deg, ${item.color}80, ${item.color})` }} />
              </div>
            </div>
          ))}
        </Section>

        {/* ── Live Data Stream ── */}
        <Section title="Data Stream" icon={Zap} accent="#ff66ff">
          <div className="relative overflow-hidden h-24 text-[9px] font-mono text-purple-300/50">
            <div className="data-stream space-y-0.5">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="whitespace-nowrap">
                  {`[${new Date(Date.now() - i * 5000).toISOString().split('T')[1].slice(0,8)}] `}
                  <span className="text-cyan-400/60">SAT-{String(i % 4 + 1).padStart(2,'0')}</span>
                  {` → ${(Math.random() * 360 - 180).toFixed(3)}°, ${(Math.random() * 180 - 90).toFixed(3)}°`}
                </div>
              ))}
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}
