import React, { useState, useEffect, useCallback, useMemo } from 'react'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import EarthScene from './components/EarthScene'
import AnalyticsPanel from './components/AnalyticsPanel'
import TopBar from './components/TopBar'
import axios from 'axios'
import COUNTRIES_DATA from './countries_data.json'

// We will fetch countries dynamically instead of using a hardcoded list

export default function App() {
  const [countries, setCountries] = useState([])
  const [issData, setIssData] = useState({ latitude: 0, longitude: 0, altitude: 408, velocity: 27600 })
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [weather, setWeather] = useState(null)
  const [cameraZoom, setCameraZoom] = useState(6)
  const [focusTarget, setFocusTarget] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNightMode, setIsNightMode] = useState(false)
  const [locationImages, setLocationImages] = useState([])
  const [isImagesLoading, setIsImagesLoading] = useState(false)
  const [locationSummary, setLocationSummary] = useState('')
  const tempHistory = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      time: `${String(i * 2).padStart(2, '0')}:00`,
      temp: Math.round(22 + Math.sin(i / 2) * 8 + Math.random() * 3),
      humidity: Math.round(55 + Math.random() * 30),
    })), []
  )


  // Fetch ISS location every 5s
  useEffect(() => {
    const fetchISS = async () => {
      try {
        const res = await axios.get('/api/iss-location')
        setIssData(res.data)
      } catch {
        // Animate mock ISS position
        const t = Date.now() / 1000
        setIssData({
          latitude: 51.6 * Math.sin(t / 5400 * Math.PI * 2),
          longitude: (((t / 5400) * 360) % 360) - 180,
          altitude: 408,
          velocity: 27600,
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchISS()
    const id = setInterval(fetchISS, 5000)
    return () => clearInterval(id)
  }, [])

  // Fetch all countries
  useEffect(() => {
    setCountries(COUNTRIES_DATA)
  }, [])

  // Fetch weather and images when country selected
  useEffect(() => {
    if (!selectedCountry) {
      setLocationImages([])
      setLocationSummary('')
      return
    }

    const { lat, lon, name, capital } = selectedCountry

    // 1. Fetch Weather
    axios.get(`/api/weather/${lat}/${lon}`)
      .then(r => setWeather(r.data))
      .catch(() => setWeather({
        temp: 22,
        condition: 'Clear',
        humidity: 55,
        wind_speed: 10,
        location: capital,
      }))

    // 2. Hierarchical Image Retrieval (Geosearch -> Local City -> Country Fallback)
    setIsImagesLoading(true)

    const fetchLocalImages = async () => {
      try {
        let finalImages = []
        let resolvedTitle = name

        // STAGE 1: Wikipedia Geosearch (Nearby Landmarks)
        const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=5`
        const geoRes = await fetch(geoUrl)
        const geoData = await geoRes.json()
        const geoResults = geoData.query?.geosearch || []

        if (geoResults.length > 0) {
          // We found nearby landmarks! Use the most prominent one for the summary
          resolvedTitle = geoResults[0].title

          // Fetch images for top landmarks
          const landmarkTitles = geoResults.map(r => r.title).join('|')
          const landmarkImgUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages|imageinfo&titles=${landmarkTitles}&pithumbsize=500&iiprop=url&iiurlwidth=400`

          const imgRes = await fetch(landmarkImgUrl)
          const imgData = await imgRes.json()
          const pages = imgData.query?.pages || {}

          Object.values(pages).forEach(p => {
            if (p.thumbnail) {
              finalImages.push({ title: p.title, url: p.thumbnail.source })
            }
          })
        }

        // STAGE 2: Reverse Geocoding for City Name (If no landmarks or few images)
        if (finalImages.length < 3) {
          const revGeoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          const revRes = await fetch(revGeoUrl)
          const revData = await revRes.json()
          const localCity = revData.address?.city || revData.address?.town || revData.address?.village || revData.address?.state_district

          if (localCity && !geoResults.some(r => r.title.includes(localCity))) {
            const cityWikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&titles=${localCity}&pithumbsize=500`
            const cityWikiRes = await fetch(cityWikiUrl)
            const cityWikiData = await cityWikiRes.json()
            const cityPage = Object.values(cityWikiData.query?.pages || {})[0]
            if (cityPage?.thumbnail) {
              finalImages.push({ title: `${localCity} Vista`, url: cityPage.thumbnail.source })
            }
          }
        }

        // STAGE 3: Summary Fetch
        const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&titles=${resolvedTitle}&exintro=1&explaintext=1`
        const sumRes = await fetch(summaryUrl)
        const sumData = await sumRes.json()
        const sumPage = Object.values(sumData.query?.pages || {})[0]
        setLocationSummary(sumPage?.extract || `Intelligence data for coordinates ${lat.toFixed(2)}, ${lon.toFixed(2)}. Strategic assessment active.`)

        // Add visual diversity with high-quality unsplash imagery based on coordinates/region
        const atmosphereMocks = [
          { title: "Local Geography", url: `https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=400&q=80` },
          { title: "Regional Profile", url: `https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=400&q=80` }
        ]

        // Deduplicate and finalize
        const uniqueImages = Array.from(new Set(finalImages.map(a => a.url)))
          .map(url => finalImages.find(a => a.url === url))

        setLocationImages([...uniqueImages, ...atmosphereMocks])

      } catch (e) {
        console.error("Geosearch failed", e)
        setLocationSummary("Telemetry disrupted. Analyzing terrain data.")
        setLocationImages([
          { title: "Surface Scan", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80" }
        ])
      } finally {
        setIsImagesLoading(false)
      }
    }

    fetchLocalImages()
  }, [selectedCountry])

  const handleCountryClick = useCallback((country) => {
    setSelectedCountry(prev => {
      const isSame = prev?.id === country.id;
      if (isSame) {
        setFocusTarget(null);
        return null;
      }
      setFocusTarget({ lat: country.lat, lon: country.lon });
      return country;
    });
  }, []);


  return (
    <div className="relative w-full h-screen overflow-hidden bg-space-dark">
      {/* ── Cinematic vignette ── */}
      <div className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(3,10,26,0.85) 100%)' }} />

      {/* ── Stars background ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {Array.from({ length: 200 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 0.5}px`,
              height: `${Math.random() * 2 + 0.5}px`,
              opacity: Math.random() * 0.7 + 0.1,
              animation: `pulse ${2 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* ── Three.js Canvas ── */}
      <div className="absolute inset-0 z-1">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => { gl.setClearColor('#030a1a', 1) }}
        >
          <Suspense fallback={null}>
            <EarthScene
              issData={issData}
              countries={countries}
              onCountryClick={handleCountryClick}
              selectedCountry={selectedCountry}
              focusTarget={focusTarget}
              onZoomChange={setCameraZoom}
              isNightMode={isNightMode}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <TopBar issData={issData} isLoading={isLoading} isNightMode={isNightMode} setNightMode={setIsNightMode} />
      </div>

      {/* ── Left Selection Detail Panel ── */}
      {selectedCountry && (
        <div className="absolute top-16 left-8 z-40 w-[22rem] animate-slide-in">
          <div className="bg-[#0a1622]/95 border border-cyan-500/30 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl filter drop-shadow-lg">{selectedCountry.flag}</span>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <div className="text-[10px] font-bold text-cyan-400 tracking-[0.2em] uppercase">
                      Target Identified
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight leading-none">
                    {selectedCountry.name}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                  <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Coordinates</div>
                  <div className="text-[11px] font-mono text-cyan-300">
                    {selectedCountry.lat.toFixed(3)}°, {selectedCountry.lon.toFixed(3)}°
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                  <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Local Status</div>
                  <div className="text-[11px] font-mono text-orange-400">
                    {weather ? `${weather.temp}°C | ${weather.condition}` : 'FETCHING...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

              {/* Summary */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Intel Summary</div>
                <p className="text-xs text-white/70 leading-relaxed font-light">
                  {locationSummary || 'Loading intelligence data...'}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest italic">Capital City</span>
                  <span className="text-xs text-white font-medium">{selectedCountry.capital}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest italic">Population</span>
                  <span className="text-xs text-orange-400 font-black">{selectedCountry.population}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest italic">Total Area</span>
                  <span className="text-xs text-cyan-300 font-bold">{selectedCountry.area}</span>
                </div>
              </div>

              {/* IMAGE GALLERY SECTION */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Visual Survey</div>
                  <div className="text-[9px] text-cyan-500/50">{locationImages.length} FEEDS</div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x cursor-grab active:cursor-grabbing">
                  {isImagesLoading ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="min-w-[160px] h-28 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                    ))
                  ) : (
                    locationImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="min-w-[180px] group relative h-32 rounded-2xl overflow-hidden snap-start transition-all duration-500 hover:scale-[1.03] border border-white/10"
                      >
                        <img
                          src={img.url}
                          alt={img.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-2 left-3 right-3">
                          <div className="text-[10px] text-white font-black leading-tight line-clamp-2 uppercase tracking-tighter shadow-sm">
                            {img.title}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20">
              <button
                onClick={() => setSelectedCountry(null)}
                className="w-full py-3 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 rounded-2xl text-[10px] font-black text-white/40 hover:text-red-400 transition-all uppercase tracking-[0.3em]"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Right Analytics Panel ── */}
      <div className="absolute top-16 right-0 bottom-0 z-30 w-80 xl:w-96">
        <AnalyticsPanel
          issData={issData}
          selectedCountry={selectedCountry}
          weather={weather}
          tempHistory={tempHistory}
          cameraZoom={cameraZoom}
        />
      </div>

      {/* ── Corner decorations ── */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 text-xs font-mono text-neon-blue/40">
        ORBITX LIVE v2.1 | {new Date().toISOString().split('T')[0]}
      </div>
    </div>
  )
}
