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
  const [maxDistance, setMaxDistance] = useState(50); 
  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  const [hhOnly, setHhOnly] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [icon, setIcon] = useState<any>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);

  const themeGold = "#D4AF37"; 

  useEffect(() => {
    setIsClient(true);
    async function fetchData() {
      const { data } = await supabase.from('restaurants').select('*');
      if (data) setRestaurants(data);
    }
    fetchData();

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    import('leaflet').then((L) => {
      setIcon(L.icon({ 
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', 
        iconSize: [25, 41], 
        iconAnchor: [12, 41],
        className: 'custom-marker'
      }));
    });
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
      const moodVal = (res['best for'] || res.mood || "").toLowerCase();
      const moodMatch = selectedMood === "Allt" || moodVal.includes(selectedMood.toLowerCase());
      const hhMatch = !hhOnly || (res['happy hour time'] && res['happy hour time'] !== "Nei");
      
      let distanceMatch = true;
      if (userPos && activeRegion === "Ísland" && res.lat && maxDistance < 50) {
        const dist = calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng);
        distanceMatch = dist <= maxDistance;
      }
      return regionMatch && searchMatch && moodMatch && hhMatch && distanceMatch;
    });
  }, [restaurants, activeRegion, searchTerm, selectedMood, maxDistance, userPos, hhOnly]);

  if (!isClient) return null;

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white selection:bg-[#D4AF37]/30">
      
      {/* LUXURY NAV */}
      <nav className="fixed top-0 w-full bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/5 z-[100] px-6 py-6 md:py-8">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl md:text-5xl font-serif tracking-tighter uppercase italic">
              VIBE<span style={{ color: themeGold }}>.SPM</span>
            </h1>
            <p className="text-[10px] tracking-[0.4em] opacity-40 uppercase mt-2">Curated Lifestyle Experience</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
              {["Ísland", "Bali"].map(r => (
                <button key={r} onClick={() => setActiveRegion(r)} className={`px-8 py-2 rounded-full text-xs font-black tracking-widest transition-all ${activeRegion === r ? 'bg-[#D4AF37] text-black' : 'text-white/40 hover:text-white'}`}>{r.toUpperCase()}</button>
              ))}
            </div>
            <input 
              type="text" 
              placeholder="Hvað viltu finna?..." 
              className="bg-white/5 border border-white/10 rounded-full px-8 py-3 outline-none focus:border-[#D4AF37]/50 transition-all w-64 text-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </nav>

      <div className="pt-[260px] lg:pt-[160px] flex flex-col lg:flex-row h-screen">
        
        {/* MAIN CONTENT */}
        <div className={`${showMapMobile ? 'hidden' : 'block'} w-full lg:w-[60%] overflow-y-auto px-6 md:px-12 pb-40 no-scrollbar`}>
          
          {/* THE MOOD SELECTOR */}
          <div className="mb-16 overflow-x-auto no-scrollbar py-4">
            <div className="flex gap-4 min-w-max">
              {["Allt", "Rómantík", "Viðskipti", "Vini", "Fjölskylda", "Skyndibiti"].map(mood => (
                <button 
                  key={mood} 
                  onClick={() => setSelectedMood(mood)}
                  className={`px-8 py-4 rounded-2xl border transition-all duration-500 ${selectedMood === mood ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.3)]' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
                >
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">{mood}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RESTAURANT CARDS */}
          <div className="grid grid-cols-1 gap-12">
            <AnimatePresence mode="popLayout">
              {filtered.map((res) => (
                <motion.div 
                  key={res.id} 
                  layout 
                  initial={{ opacity: 0, y: 30 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden hover:bg-white/[0.04] transition-all duration-700 cursor-pointer"
                  onClick={() => res.lat && map?.flyTo([res.lat, res.lng], 16)}
                >
                  <div className="flex flex-col md:flex-row p-8 md:p-10 gap-10">
                    <div className="relative w-full md:w-48 h-48 rounded-3xl overflow-hidden bg-black shrink-0">
                      <img src={res.image} className="w-full h-full object-contain opacity-80 group-hover:scale-110 transition-transform duration-700" alt={res.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-6 mb-4">
                        <span className="text-3xl font-serif italic text-[#D4AF37]">★ {res.rating}</span>
                        {userPos && res.lat && activeRegion === "Ísland" && (
                          <span className="text-[10px] font-black tracking-widest text-white/30 bg-white/5 px-4 py-1 rounded-full uppercase">
                            {calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng).toFixed(1)} km away
                          </span>
                        )}
                      </div>
                      <h2 className="text-4xl md:text-6xl font-serif tracking-tight mb-4 group-hover:translate-x-2 transition-transform duration-500">{res.name}</h2>
                      <p className="text-white/40 text-xl font-serif italic leading-relaxed mb-8 max-w-2xl">"{res.reviews || res.review}"</p>
                      
                      <div className="flex flex-wrap gap-8 pt-8 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Timing</span>
                          <span className="text-xs font-bold">{res['opening hours']}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Pricing</span>
                          <span className="text-xs font-bold text-[#D4AF37]">{res.price || res.cost}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Vibe</span>
                          <span className="text-xs font-bold opacity-60">{res.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* CINEMATIC MAP */}
        <div className={`${showMapMobile ? 'block' : 'hidden'} lg:block w-full lg:w-[40%] h-full fixed lg:sticky bottom-0 lg:top-0 border-l border-white/5`}>
          <MapContainer center={[64.1467, -21.9333]} zoom={13} className="h-full w-full invert-[0.9] hue-rotate-[180deg] brightness-[0.6] grayscale-[0.5]" ref={setMap}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
            {filtered.map((res) => (
              res.lat && (
                <Marker key={res.id} position={[Number(res.lat), Number(res.lng)]} icon={icon}>
                  <Popup className="dark-popup"><div className="font-serif p-2 text-black">{res.name}</div></Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* MOBILE TOGGLE */}
        <button 
          onClick={() => setShowMapMobile(!showMapMobile)}
          className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black px-12 py-5 rounded-full font-black text-xs tracking-[0.2em] shadow-2xl z-[200]"
        >
          {showMapMobile ? "BACK TO LIST" : "EXPLORE MAP"}
        </button>
      </div>
    </main>
  );
}