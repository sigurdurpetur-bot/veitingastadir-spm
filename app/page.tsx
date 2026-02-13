"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import dynamicImport from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MapContainer = dynamicImport(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamicImport(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamicImport(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamicImport(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

export default function Home() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeRegion, setActiveRegion] = useState("Ísland");
  const [selectedMood, setSelectedMood] = useState("Allt");
  const [maxDistance, setMaxDistance] = useState(15); // Default nær
  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [icon, setIcon] = useState<any>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const themeGold = "#D4AF37"; 

  useEffect(() => {
    setIsClient(true);
    async function fetchData() {
      const { data } = await supabase.from('restaurants').select('*');
      if (data) setRestaurants(data);
    }
    fetchData();

    // Snjall GPS skynjari - Kerfið lærir hvar þú ert
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.watchPosition((pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => console.log("GPS Blocked"), { enableHighAccuracy: true });
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    import('leaflet').then((L) => {
      setIcon(L.icon({ 
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', 
        iconSize: [25, 41], 
        iconAnchor: [12, 41]
      }));
    });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const filtered = useMemo(() => {
    return restaurants.filter(res => {
      const isBali = Number(res.lat) < 0;
      const regionMatch = activeRegion === "Bali" ? isBali : !isBali;
      const searchMatch = res.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const moodMatch = selectedMood === "Allt" || (res['best for'] || "").toLowerCase().includes(selectedMood.toLowerCase());
      
      let distanceMatch = true;
      if (userPos && activeRegion === "Ísland" && res.lat) {
        const dist = calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng);
        distanceMatch = dist <= maxDistance;
      }
      return regionMatch && searchMatch && moodMatch && distanceMatch;
    });
  }, [restaurants, activeRegion, searchTerm, selectedMood, maxDistance, userPos]);

  if (!isClient) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white overflow-hidden selection:bg-[#D4AF37]/30">
      
      {/* LIFANDI BAKGRUNNUR - Glow sem fylgir músinni */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle 600px at ${mousePos.x}px ${mousePos.y}px, rgba(212,175,55,0.07), transparent)`
        }}
      />

      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full bg-black/60 backdrop-blur-2xl border-b border-white/5 z-[100] px-6 py-6">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl md:text-5xl font-serif tracking-tighter uppercase italic">
              VIBE<span style={{ color: themeGold }} className="animate-pulse">.SPM</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 opacity-40 justify-center lg:justify-start">
              <span className={`w-2 h-2 rounded-full ${userPos ? 'bg-green-500 animate-ping' : 'bg-red-500'}`} />
              <span className="text-[9px] tracking-[0.3em] uppercase">
                {userPos ? `User Connected: ${activeRegion}` : "Locating Connection..."}
              </span>
            </div>
          </div>

          {/* DISTANCE SLIDER - Núna mjög áberandi */}
          {activeRegion === "Ísland" && (
            <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-3xl px-8 py-3 w-full lg:w-80">
              <span className="text-[10px] font-black text-[#D4AF37] uppercase mb-1">Radar Range: {maxDistance}km</span>
              <input 
                type="range" min="1" max="50" value={maxDistance} 
                onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]" 
              />
            </div>
          )}

          <div className="flex gap-4 bg-white/5 p-1 rounded-full border border-white/10">
            {["Ísland", "Bali"].map(r => (
              <button key={r} onClick={() => setActiveRegion(r)} className={`px-8 py-2 rounded-full text-[10px] font-black transition-all ${activeRegion === r ? 'bg-[#D4AF37] text-black shadow-lg shadow-gold/20' : 'text-white/40'}`}>{r.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </nav>

      <div className="pt-[280px] lg:pt-[160px] flex flex-col lg:flex-row h-screen relative z-10">
        
        <div className={`${showMapMobile ? 'hidden' : 'block'} w-full lg:w-[60%] overflow-y-auto px-6 md:px-12 pb-40 no-scrollbar`}>
          
          {/* SEARCH & MOOD */}
          <div className="flex flex-col md:flex-row gap-6 mb-12">
            <input 
              type="text" placeholder="Scanning for vibes..." 
              className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 outline-none focus:border-[#D4AF37]/50 transition-all flex-1 text-lg font-serif italic"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
              {["Allt", "Rómantík", "Vini", "Dýrt"].map(mood => (
                <button 
                  key={mood} onClick={() => setSelectedMood(mood)}
                  className={`px-6 py-3 rounded-xl border text-[10px] font-black transition-all ${selectedMood === mood ? 'bg-white text-black border-white' : 'border-white/10 text-white/40'}`}
                >
                  {mood.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* LIST */}
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {filtered.map((res, index) => (
                <motion.div 
                  key={res.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-gradient-to-r from-white/[0.03] to-transparent border-l-2 border-white/5 p-8 md:p-10 hover:border-[#D4AF37] transition-all duration-500"
                  onClick={() => res.lat && map?.flyTo([res.lat, res.lng], 16)}
                >
                  <div className="flex flex-col md:flex-row gap-10 items-center">
                    <div className="w-32 h-32 rounded-full border border-white/10 p-4 bg-black/40 group-hover:scale-110 transition-transform duration-700">
                      <img src={res.image} className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all" alt={res.name} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center gap-4 mb-2 justify-center md:justify-start">
                        <span className="text-2xl font-serif text-[#D4AF37]">★ {res.rating}</span>
                        {userPos && res.lat && (
                          <span className="text-[10px] font-bold tracking-widest text-white/20 uppercase">
                            Distance: {calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng).toFixed(1)} KM
                          </span>
                        )}
                      </div>
                      <h2 className="text-4xl md:text-6xl font-serif mb-4 tracking-tighter group-hover:italic transition-all">{res.name}</h2>
                      <p className="text-white/50 text-xl font-serif italic leading-relaxed">"{res.reviews || res.review}"</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* MAP */}
        <div className={`${showMapMobile ? 'block' : 'hidden'} lg:block w-full lg:w-[40%] h-full border-l border-white/5`}>
          <MapContainer center={[64.1467, -21.9333]} zoom={13} className="h-full w-full invert-[0.9] hue-rotate-[180deg] opacity-60" ref={setMap}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
            {filtered.map((res) => (
              res.lat && (
                <Marker key={res.id} position={[Number(res.lat), Number(res.lng)]} icon={icon} />
              )
            ))}
          </MapContainer>
        </div>

        {/* MOBILE TOGGLE */}
        <button 
          onClick={() => setShowMapMobile(!showMapMobile)}
          className="lg:hidden fixed bottom-8 right-8 bg-white text-black w-16 h-16 rounded-full font-black text-[10px] z-[200] shadow-2xl flex items-center justify-center border-4 border-black"
        >
          {showMapMobile ? "LIST" : "MAP"}
        </button>
      </div>
    </main>
  );
}