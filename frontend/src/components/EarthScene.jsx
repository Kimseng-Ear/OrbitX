import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { TextureLoader } from 'three'

const EARTH_R  = 2
const CLOUD_R  = 2.03
const ATMO_R   = 2.12
const ISS_R    = 2.22   // ~408 km scaled
const SAT_SATS = [
  { r: 2.35, inc: 53,  speed: 0.18, color: '#00ff88', name: 'Starlink-A' },
  { r: 2.55, inc: 97,  speed: 0.12, color: '#ffaa00', name: 'WorldView' },
  { r: 2.18, inc: 28,  speed: 0.22, color: '#ff66ff', name: 'Starlink-B' },
]

/* ── Lat/Lon → 3D position ── */
function latLonToVec3(lat, lon, r) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

/* ── Shaders ── */
const vertexShader = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewDir;
  void main(){
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform sampler2D dayTex;
  uniform sampler2D nightTex;
  uniform sampler2D specMap;
  uniform sampler2D normalMap;
  uniform vec3 sunDir;
  uniform float uNightFactor;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewDir;

  void main(){
    vec3 normal = normalize(texture2D(normalMap, vUv).rgb * 2.0 - 1.0);
    // Mix the geometry normal with the normal map
    vec3 worldNormal = normalize(vNormal + normal * 0.1);
    
    float sunDot = dot(worldNormal, normalize(sunDir));
    float blend = smoothstep(-0.15, 0.15, sunDot);
    
    float finalBlend = mix(blend, 0.0, uNightFactor);
    
    vec4 day   = texture2D(dayTex,   vUv);
    vec4 night = texture2D(nightTex, vUv);
    float spec = texture2D(specMap,  vUv).r;
    
    vec4 col = mix(night * 1.5, day, finalBlend);
    
    // Specular highlight (only on water)
    vec3 reflection = reflect(-normalize(sunDir), worldNormal);
    float specIntensity = pow(max(dot(reflection, normalize(vViewDir)), 0.0), 32.0) * spec;
    col.rgb += vec3(0.4, 0.6, 1.0) * specIntensity * finalBlend;
    
    // Fresnel / Atmosphere rim
    float fresnel = pow(1.0 - max(dot(worldNormal, normalize(vViewDir)), 0.0), 2.0);
    col.rgb += vec3(0.1, 0.3, 0.6) * fresnel * 0.4 * finalBlend;
    
    gl_FragColor = col;
  }
`

const atmoVertex = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main(){
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vViewPos = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`
const atmoFrag = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main(){
    float fresnel = pow(1.0 - dot(vNormal, normalize(vViewPos)), 3.0);
    float edgeAlpha = pow(dot(vNormal, normalize(vViewPos)), 0.5);
    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * fresnel * 0.8;
  }
`

/* ── Engineering-Inspired Satellite Archetypes ── */

function ISSModel({ isHovered }) {
  const scale = isHovered ? 1.05 : 1
  return (
    <group scale={scale}>
      {/* Main Truss */}
      <mesh>
        <boxGeometry args={[0.01, 0.01, 0.12]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Central Modules */}
      <group position={[0,0,0]}>
        <mesh position={[0,0,0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} rotation={[Math.PI/2, 0, 0]} />
          <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0,0.015,0]}>
          <boxGeometry args={[0.02, 0.02, 0.02]} />
          <meshStandardMaterial color="#dddddd" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      {/* Solar Arrays - 8 large panels */}
      {[ -0.05, -0.03, -0.01, 0.01, 0.03, 0.05 ].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh position={[0.04, 0, 0]}>
            <boxGeometry args={[0.06, 0.001, 0.012]} />
            <meshStandardMaterial color="#1a3b5c" emissive="#051020" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[-0.04, 0, 0]}>
            <boxGeometry args={[0.06, 0.001, 0.012]} />
            <meshStandardMaterial color="#1a3b5c" emissive="#051020" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function StarlinkModel({ isHovered }) {
  const scale = isHovered ? 1.1 : 1
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.015, 0.003, 0.025]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.01, 0.001, 0.04]} />
        <meshStandardMaterial color="#102030" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

function EarthObsModel({ isHovered }) {
  return (
    <group scale={isHovered ? 1.05 : 1}>
      <mesh>
        <boxGeometry args={[0.02, 0.03, 0.02]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Sensor Lens */}
      <mesh position={[0, -0.018, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.005, 12]} />
        <meshStandardMaterial color="#111111" metalness={1} roughness={0} />
      </mesh>
      {/* Side Panels */}
      <mesh position={[0.025, 0, 0]}>
        <boxGeometry args={[0.03, 0.002, 0.025]} />
        <meshStandardMaterial color="#1a3b5c" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.025, 0, 0]}>
        <boxGeometry args={[0.03, 0.002, 0.025]} />
        <meshStandardMaterial color="#1a3b5c" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function GPSModel({ isHovered }) {
  return (
    <group scale={isHovered ? 1.05 : 1}>
      <mesh>
        <boxGeometry args={[0.015, 0.015, 0.015]} />
        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
      </mesh>
      {[Math.PI/4, -Math.PI/4].map((rot, i) => (
        <group key={i} rotation={[0, rot, 0]}>
          <mesh position={[0.02, 0, 0]}>
            <boxGeometry args={[0.025, 0.002, 0.01]} />
            <meshStandardMaterial color="#1a3b5c" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.02, 0, 0]}>
            <boxGeometry args={[0.025, 0.002, 0.01]} />
            <meshStandardMaterial color="#1a3b5c" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function WeatherModel({ isHovered }) {
  return (
    <group scale={isHovered ? 1.05 : 1}>
      <mesh>
        <cylinderGeometry args={[0.01, 0.01, 0.03, 8]} />
        <meshStandardMaterial color="#f0f0f0" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Dish */}
      <mesh position={[0, 0.02, 0]} rotation={[0,0,Math.PI]}>
        <coneGeometry args={[0.012, 0.01, 16, 1, true]} />
        <meshStandardMaterial color="#cccccc" metalness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Sensor Boom */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.002, 0.03, 0.002]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </group>
  )
}

function CommModel({ isHovered }) {
  return (
    <group scale={isHovered ? 1.05 : 1}>
      <mesh>
        <boxGeometry args={[0.02, 0.02, 0.03]} />
        <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Large Dish */}
      <mesh position={[0, 0.015, 0.01]} rotation={[Math.PI/4, 0, 0]}>
        <sphereGeometry args={[0.015, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#dddddd" side={THREE.DoubleSide} metalness={0.6} />
      </mesh>
      {/* Wide Panels */}
      <mesh position={[0.045, 0, 0]}>
        <boxGeometry args={[0.07, 0.001, 0.025]} />
        <meshStandardMaterial color="#102040" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.045, 0, 0]}>
        <boxGeometry args={[0.07, 0.001, 0.025]} />
        <meshStandardMaterial color="#102040" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

const SATELLITES_DATA = Array.from({ length: 50 }).map((_, i) => {
  let type = i === 0 ? 'ISS' : i <= 15 ? 'Starlink' : i <= 25 ? 'EarthObs' : i <= 35 ? 'GPS' : i <= 43 ? 'Weather' : 'Comm'
  
  // Real-world altitude logic
  let alt = type === 'ISS' ? 408 : type === 'Starlink' ? 550 : type === 'GPS' ? 20200 : type === 'Comm' ? 35786 : 850
  let rOffset = (alt / 6371) * EARTH_R
  
  return {
     id: `sat_${i}`,
     name: type === 'ISS' ? 'ISS (Zarya)' : `${type}-${Math.floor(Math.random()*9000)+1000}`,
     type,
     altitude: alt,
     radius: EARTH_R + rOffset,
     speed: type === 'ISS' ? 0.008 : type === 'GPS' ? 0.002 : type === 'Comm' ? 0.001 : 0.005 + Math.random() * 0.005,
     inclination: type === 'ISS' ? 51.6 * (Math.PI/180) : type === 'GPS' ? 55 * (Math.PI/180) : type === 'Comm' ? 0 : Math.random() * Math.PI,
     raan: Math.random() * Math.PI * 2,
     phase: Math.random() * Math.PI * 2,
  }
})

function SingleSatellite({ sat, issData, onHover }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const time = clock.getElapsedTime()
    let currentAngle = sat.phase + time * sat.speed
    
    let pos = new THREE.Vector3()
    let tangent = new THREE.Vector3()
    
    if (sat.type === 'ISS' && issData) {
       pos.copy(latLonToVec3(issData.latitude, issData.longitude, sat.radius))
       // Simple tangent approximation for ISS
       const nextPos = latLonToVec3(issData.latitude + 0.1, issData.longitude + 0.1, sat.radius)
       tangent.copy(nextPos).sub(pos).normalize()
    } else {
       pos.set(sat.radius * Math.cos(currentAngle), sat.radius * Math.sin(currentAngle), 0)
       tangent.set(-sat.radius * Math.sin(currentAngle), sat.radius * Math.cos(currentAngle), 0)
       const euler = new THREE.Euler(sat.inclination, sat.raan, 0, 'ZYX')
       pos.applyEuler(euler)
       tangent.applyEuler(euler)
    }
    
    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().add(tangent))
  })

  return (
    <group ref={groupRef} 
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(sat) }}
      onPointerOut={() => { setHovered(false); onHover(null) }}>
      {sat.type === 'ISS' && <ISSModel isHovered={hovered} />}
      {sat.type === 'Starlink' && <StarlinkModel isHovered={hovered} />}
      {sat.type === 'EarthObs' && <EarthObsModel isHovered={hovered} />}
      {sat.type === 'GPS' && <GPSModel isHovered={hovered} />}
      {sat.type === 'Weather' && <WeatherModel isHovered={hovered} />}
      {sat.type === 'Comm' && <CommModel isHovered={hovered} />}
      
      {/* Subtle Navigation Beacon */}
      <mesh position={[0,0,0]}>
        <sphereGeometry args={[0.002, 8, 8]} />
        <meshBasicMaterial color={hovered ? "#00ffff" : "#ffffff"} opacity={0.4} transparent />
      </mesh>
    </group>
  )
}

function SatellitesSystem({ issData }) {
  const [hoveredSat, setHoveredSat] = useState(null)
  
  // Static Orbit Rings
  const orbitGeo = useMemo(() => {
    const pts = []
    SATELLITES_DATA.forEach(sat => {
       const euler = new THREE.Euler(sat.inclination, sat.raan, 0, 'ZYX')
       const segments = 128
       for (let i=0; i<segments; i++) {
          const a1 = (i / segments) * Math.PI * 2
          const a2 = ((i+1) / segments) * Math.PI * 2
          const p1 = new THREE.Vector3(sat.radius * Math.cos(a1), sat.radius * Math.sin(a1), 0).applyEuler(euler)
          const p2 = new THREE.Vector3(sat.radius * Math.cos(a2), sat.radius * Math.sin(a2), 0).applyEuler(euler)
          pts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
       }
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }, [])

  return (
    <group>
      {/* Orbit Rings - Very subtle as per request */}
      <lineSegments geometry={orbitGeo}>
         <lineBasicMaterial color={0x00d9ff} transparent opacity={0.02} />
      </lineSegments>

      {/* Individual Satellites */}
      {SATELLITES_DATA.map(sat => (
        <SingleSatellite 
          key={sat.id} 
          sat={sat} 
          issData={issData} 
          onHover={setHoveredSat} 
        />
      ))}

      {/* Tooltip for Hovered Satellite */}
      {hoveredSat && (
        <Html position={[0,0,0]} wrapperClass="pointer-events-none">
          <div className="bg-[#030a1a]/95 border border-cyan-500/40 p-3 rounded-lg text-xs text-white backdrop-blur-xl whitespace-nowrap -mt-24 ml-6 shadow-2xl"
               style={{ borderLeft: '3px solid #00d4ff' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div className="font-bold text-sm tracking-tight text-cyan-100">{hoveredSat.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] uppercase tracking-wider text-white/50 font-mono">
              <div>Type: <span className="text-white/80">{hoveredSat.type}</span></div>
              <div>Alt: <span className="text-white/80">{hoveredSat.altitude}km</span></div>
              <div>Vel: <span className="text-white/80">7.66km/s</span></div>
              <div>Inc: <span className="text-white/80">{(hoveredSat.inclination * (180/Math.PI)).toFixed(1)}°</span></div>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

/* ── Country Marker ── */
function CountryMarker({ country, onClick, isSelected }) {
  const pos = latLonToVec3(country.lat, country.lon, EARTH_R + 0.04)
  const color = isSelected ? '#00d4ff' : '#ffffff'

  return (
    <Html position={pos} center distanceFactor={6} zIndexRange={[10, 0]}>
      <div className="country-marker flex flex-col items-center gap-0.5" onClick={() => onClick(country)}>
        {/* Dot */}
        <div className="relative flex items-center justify-center">
          {isSelected && (
            <>
              <div className="absolute rounded-full pulse-ring"
                style={{ width: 20, height: 20, background: 'rgba(0,212,255,0.35)', border: '1px solid rgba(0,212,255,0.6)' }} />
              <div className="absolute rounded-full pulse-ring2"
                style={{ width: 20, height: 20, background: 'rgba(0,212,255,0.2)' }} />
            </>
          )}
          <div className="rounded-full pulse-dot z-10"
            style={{ width: isSelected ? 10 : 3, height: isSelected ? 10 : 3,
              background: color, boxShadow: `0 0 10px ${color}`, cursor: 'pointer' }} />
        </div>
        
        {/* Label - Only show when selected or hovered via CSS */}
        {isSelected && (
          <div className="marker-label text-xs font-mono px-1.5 py-0.5 rounded"
            style={{ color, background: 'rgba(0,5,20,0.75)', border: `1px solid ${color}40`,
              fontSize: '11px', fontWeight: 600 }}>
            📍 {country.name}
          </div>
        )}

      </div>
    </Html>
  )
}

/* ── Atmosphere ── */
function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[ATMO_R, 64, 64]} />
      <shaderMaterial
        vertexShader={atmoVertex}
        fragmentShader={atmoFrag}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

/* ── Country Borders ── */
function CountryBorders() {
  const [geometry, setGeometry] = useState(null)

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => {
        const positions = []
        data.features.forEach(feature => {
          const { geometry } = feature
          if (!geometry) return

          const processPolygon = (polygon) => {
            const ring = polygon[0] // Exterior ring
            for (let i = 0; i < ring.length - 1; i++) {
               const p1 = latLonToVec3(ring[i][1], ring[i][0], EARTH_R + 0.003)
               const p2 = latLonToVec3(ring[i+1][1], ring[i+1][0], EARTH_R + 0.003)
               positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
            }
          }

          if (geometry.type === 'Polygon') {
             processPolygon(geometry.coordinates)
          } else if (geometry.type === 'MultiPolygon') {
             geometry.coordinates.forEach(processPolygon)
          }
        })

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        setGeometry(geo)
      })
      .catch(err => console.error("Could not load borders", err))
  }, [])

  if (!geometry) return null

  return (
    <group>
      {/* Sharp core line */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={0x00ffff} transparent opacity={0.15} />
      </lineSegments>
      {/* Subtle glow layer (slightly offset to avoid z-fighting with self) */}
      <lineSegments geometry={geometry} scale={1.0005}>
        <lineBasicMaterial color={0x0088ff} transparent opacity={0.2} />
      </lineSegments>
    </group>
  )
}

/* ── Main Earth Scene ── */
export default function EarthScene({ issData, countries, onCountryClick, selectedCountry, focusTarget, onZoomChange, isNightMode }) {
  const earthRef = useRef()
  const cloudRef = useRef()
  const materialRef = useRef()
  const controlsRef = useRef()
  const [showPhnomPenh, setShowPhnomPenh] = useState(false)
  const { camera } = useThree()

  const [dayTex, nightTex, cloudTex, normalMap, specMap] = useLoader(TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
  ])

  useEffect(() => {
    [dayTex, nightTex, cloudTex, normalMap, specMap].forEach(tex => {
      tex.anisotropy = 16
      tex.minFilter = THREE.LinearMipMapLinearFilter
      tex.magFilter = THREE.LinearFilter
    })
  }, [dayTex, nightTex, cloudTex, normalMap, specMap])

  const uniforms = useMemo(() => ({
    dayTex:   { value: dayTex },
    nightTex: { value: nightTex },
    normalMap: { value: normalMap },
    specMap:  { value: specMap },
    sunDir:   { value: new THREE.Vector3(1.5, 0.5, 1).normalize() },
    uNightFactor: { value: 0 }
  }), [dayTex, nightTex, normalMap, specMap])

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uNightFactor.value = isNightMode ? 1.0 : 0.0
    }
  }, [isNightMode])



  // Focus camera on target country
  const targetCamPos = useRef(null)
  useEffect(() => {
    if (!focusTarget) return
    // Get world pos of target on the rotated earth
    const localPos = latLonToVec3(focusTarget.lat, focusTarget.lon, 4.5)
    // We want the camera to go to this position relative to the earth's rotation
    // But earth rotates! So targetCamPos will follow it.
    targetCamPos.current = { lat: focusTarget.lat, lon: focusTarget.lon }
  }, [focusTarget])

  useFrame(({ clock, camera }) => {
    // Rotate Earth
    if (earthRef.current) {
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.035
      // Smooth camera auto zoom (spherical interpolation to avoid going through Earth)
      if (targetCamPos.current && controlsRef.current) {
         // Target direction on the rotating earth
         const localPos = latLonToVec3(targetCamPos.current.lat, targetCamPos.current.lon, 1)
         const worldTargetDir = localPos.applyMatrix4(earthRef.current.matrixWorld).normalize()
         
         // Current direction
         const currentDir = camera.position.clone().normalize()
         
         // Spherical interpolation approximation for direction
         currentDir.lerp(worldTargetDir, 0.04).normalize()
         
         // Linear interpolation for distance
         const currentDist = camera.position.length()
         const newDist = THREE.MathUtils.lerp(currentDist, 3.5, 0.04)
         
         camera.position.copy(currentDir).multiplyScalar(newDist)
         controlsRef.current.target.lerp(new THREE.Vector3(0,0,0), 0.1)
         
         // Stop if close enough
         if (camera.position.distanceTo(worldTargetDir.multiplyScalar(3.5)) < 0.1) {
            targetCamPos.current = null 
         }
      }
    }
    // Rotate clouds slightly faster
    if (cloudRef.current) cloudRef.current.rotation.y = clock.getElapsedTime() * 0.042

    // Detect zoom for Phnom Penh highlight
    const dist = camera.position.length()
    if (onZoomChange) onZoomChange(dist)
    setShowPhnomPenh(dist < 3.5)
  })

  return (
    <>
      <Stars radius={150} depth={80} count={6000} factor={4} saturation={0.1} fade speed={0.5} />
      <ambientLight intensity={0.08} />
      <directionalLight position={[5, 2, 4]} intensity={1.4} color="#ffe8c8" />
      <pointLight position={[-10, -5, -5]} intensity={0.05} color="#4488ff" />

      {/* ── Earth ── */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_R, 96, 96]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
        
        {/* ── GeoJSON Borders ── */}
        <CountryBorders />
        
        {/* ── Country Markers (Child of Earth to rotate with it) ── */}
        {countries.map(c => (
          <CountryMarker
            key={c.id}
            country={c}
            onClick={onCountryClick}
            isSelected={selectedCountry?.id === c.id}
          />
        ))}
      </mesh>

      {/* ── Clouds ── */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[CLOUD_R, 64, 64]} />
        <meshPhongMaterial
          map={cloudTex}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* ── Atmosphere ── */}
      <Atmosphere />

      {/* ── Advanced Satellites ── */}
      <SatellitesSystem issData={issData} />

      {/* ── Controls ── */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.35}
        zoomSpeed={1.5}
        enableZoom={true}
        minDistance={1.2}
        maxDistance={10}
        enablePan={false}
        onStart={() => { targetCamPos.current = null }}
      />
    </>
  )
}
