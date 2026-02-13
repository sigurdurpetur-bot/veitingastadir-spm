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
  const [selectedCat, setSelectedCat] = useState("Allt");
  const [selectedMood, setSelectedMood] = useState("Allt");
  const [selectedPrice, setSelectedPrice] = useState("Allt");
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(50); 
  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  const [hhOnly, setHhOnly] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [icon, setIcon] = useState<any>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);

  const themeGold = "#C5A059"; 
  const bgSoft = "#F2EFE9"; 

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
      }, (err) => console.log("GPS error:", err));
    }

    import('leaflet').then((L) => {
      setIcon(L.icon({ 
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', 
        iconSize: [25, 41], 
        iconAnchor: [12, 41] 
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
      
      // LAGFÆRING Á MOOD SÍU
      const moodVal = (res['best for'] || res.mood || "").toLowerCase();
      const moodMatch = selectedMood === "Allt" || moodVal.includes(selectedMood.toLowerCase());
      
      const catMatch = selectedCat === "Allt" || res.category === selectedCat;
      
      const priceVal = (res.price || res.cost || "").toLowerCase();
      const priceMatch = selectedPrice === "Allt" || priceVal.includes(selectedPrice.toLowerCase());
      
      const ratingMatch = parseFloat(res.rating?.split('/')[0] || "0") >= minRating;
      const hhMatch = !hhOnly || (res['happy hour time'] && res['happy hour time'] !== "Nei");
      
      let distanceMatch = true;
      if (userPos && activeRegion === "Ísland" && res.lat && maxDistance < 50) {
        const dist = calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng);
        distanceMatch = dist <= maxDistance;
      }
      
      return regionMatch && searchMatch && moodMatch && catMatch && priceMatch && ratingMatch && hhMatch && distanceMatch;
    });
  }, [restaurants, activeRegion, searchTerm, selectedCat, selectedMood, selectedPrice, minRating, maxDistance, userPos, hhOnly]);

  if (!isClient) return null;

  return (
    <main style={{ backgroundColor: bgSoft }} className="min-h-screen text-[#2D2D2A] font-normal">
      
      <nav className="fixed top-0 w-full bg-[#1A1A18] border-b border-white/10 z-[100] px-4 md:px-8 py-4 md:py-6 shadow-2xl">
        <div className="max-w-[1800px] mx-auto flex flex-col gap-4 lg:flex-row items-center justify-between">
          <h1 className="text-2xl md:text-4xl font-serif tracking-[0.1em] uppercase text-white cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            Veitingastaðir<span style={{ color: themeGold }}>.SPM</span>
          </h1>

          <div className="flex items-center bg-white/10 rounded-full px-4 md:px-8 py-2 md:py-4 border border-white/20 w-full lg:w-auto">
            <button onClick={() => setActiveRegion("Ísland")} className={`text-[10px] md:text-sm font-bold tracking-widest px-3 md:px-6 transition-all ${activeRegion === "Ísland" ? 'text-[#C5A059]' : 'text-zinc-500'}`}>ÍSLAND</button>
            <div className="w-[1px] h-4 md:h-6 bg-white/20 mx-2" />
            <button onClick={() => setActiveRegion("Bali")} className={`text-[10px] md:text-sm font-bold tracking-widest px-3 md:px-6 transition-all ${activeRegion === "Bali" ? 'text-[#C5A059]' : 'text-zinc-500'}`}>BALI</button>
            <div className="w-[1px] h-4 md:h-6 bg-white/20 mx-2 md:mx-4" />
            <input type="text" placeholder="Leita..." className="bg-transparent text-white text-sm md:text-lg outline-none flex-1 lg:w-64 placeholder:text-zinc-600" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex gap-2 w-full lg:w-auto justify-center">
            <button onClick={() => setHhOnly(!hhOnly)} className={`flex-1 lg:flex-none px-4 md:px-8 py-3 md:py-4 rounded-full text-[10px] font-black tracking-widest transition-all ${hhOnly ? 'bg-[#C5A059] text-white' : 'bg-white/10 text-zinc-400'}`}>
              🍺 HAPPY HOUR
            </button>
            <button onClick={() => setShowMapMobile(!showMapMobile)} className="lg:hidden flex-1 px-4 py-3 rounded-full text-[10px] font-black tracking-widest bg-white/10 text-white border border-white/20">
              {showMapMobile ? "LISTI" : "KORT"}
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-[220px] md:pt-[240px] lg:pt-[130px] flex flex-col lg:flex-row h-screen">
        
        <div className={`${showMapMobile ? 'hidden' : 'block'} w-full lg:w-[60%] overflow-y-auto px-4 md:px-12 pb-40 no-scrollbar`}>
          
          <div className="mb-8 bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              <div className="col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Andrúmsloft</span>
                <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} className="w-full bg-transparent border-b border-black/10 py-1 font-bold text-sm md:text-lg outline-none">
                  {["Allt", "Rómantík", "Viðskipti", "Vini", "Fjölskylda", "Skyndibiti"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Verð</span>
                <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className="w-full bg-transparent border-b border-black/10 py-1 font-bold text-sm outline-none">
                  {["Allt", "Lágt", "Miðlungs", "Dýrt"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Einkunn</span>
                <select value={minRating} onChange={(e) => setMinRating(parseFloat(e.target.value))} className="w-full bg-transparent border-b border-black/10 py-1 font-bold text-sm outline-none">
                  {[0, 4, 4.5].map(r => <option key={r} value={r}>{r === 0 ? "Allt" : `${r} ★`}</option>)}
                </select>
              </div>

              {activeRegion === "Ísland" && (
                <div className="col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] mb-2 block">Fjarlægð: {maxDistance === 50 ? "Öll" : `${maxDistance}km`}</span>
                  <input type="range" min="1" max="50" value={maxDistance} onChange={(e) => setMaxDistance(parseInt(e.target.value))} className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#C5A059]" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filtered.length > 0 ? (
                filtered.map((res) => (
                  <motion.div key={res.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className="group bg-white/40 p-6 md:p-8 rounded-[1.5rem] border border-black/5 hover:bg-white/60 transition-all cursor-pointer"
                    onClick={() => res.lat && map?.flyTo([res.lat, res.lng], 16)}>
                    <div className="flex flex-row gap-4 md:gap-8 items-start">
                      <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden bg-white shadow-md p-3 shrink-0">
                        <img src={res.image} className="w-full h-full object-contain" alt={res.name} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[#C5A059] font-bold text-lg md:text-2xl">★ {res.rating}</span>
                          {userPos && res.lat && activeRegion === "Ísland" && (
                            <span className="text-[9px] md:text-xs font-bold bg-black/5 px-2 py-1 rounded-full text-zinc-400">{calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng).toFixed(1)} km</span>
                          )}
                        </div>
                        <h2 className="text-xl md:text-3xl font-serif font-bold text-[#1A1A18] mb-2">{res.name}</h2>
                        <p className="text-[#4A4A44] text-sm md:text-lg font-serif italic mb-4 opacity-80 leading-snug">"{res.reviews || res.review}"</p>
                        <div className="flex flex-wrap gap-4 text-[10px] md:text-xs font-bold text-zinc-400 uppercase">
                          <span>🕒 {res['opening hours']}</span>
                          <span>💰 {res.price || res.cost}</span>
                          <span className="text-[#C5A059]">{res.category}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 opacity-40 font-serif italic text-2xl">Engir staðir fundust með þessum síum...</div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className={`${showMapMobile ? 'block' : 'hidden'} lg:block w-full lg:w-[40%] h-[60vh] lg:h-full fixed lg:sticky bottom-0 lg:top-0 border-l border-black/5 z-[50]`}>
          <MapContainer center={[64.1467, -21.9333]} zoom={13} className="h-full w-full grayscale-[0.3]" ref={setMap}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            {filtered.map((res) => (
              res.lat && (
                <Marker key={res.id} position={[Number(res.lat), Number(res.lng)]} icon={icon}>
                  <Popup><div className="font-bold p-1">{res.name}</div></Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      </div>
    </main>
  );
}