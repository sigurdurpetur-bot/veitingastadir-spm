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
  const [openNow, setOpenNow] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [icon, setIcon] = useState<any>(null);

  const themeGold = "#C5A059"; // Mýkri gull litur
  const bgSoft = activeRegion === "Ísland" ? "#F4F1EE" : "#EBE7E0"; // Mjúkur drappaður bakgrunnur

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
        iconSize: [20, 32], 
        iconAnchor: [10, 32] 
      }));
    });
  }, [activeRegion]);

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
      const catMatch = selectedCat === "Allt" || res.category === selectedCat;
      const priceMatch = selectedPrice === "Allt" || (res.price || "").toLowerCase().includes(selectedPrice.toLowerCase());
      const ratingMatch = parseFloat(res.rating?.split('/')[0] || "0") >= minRating;
      const hhMatch = !hhOnly || (res['happy hour time'] && res['happy hour time'] !== "Nei");
      
      let distanceMatch = true;
      if (userPos && activeRegion === "Ísland" && res.lat) {
        const dist = calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng);
        distanceMatch = maxDistance === 50 || dist <= maxDistance;
      }
      return regionMatch && searchMatch && moodMatch && catMatch && priceMatch && ratingMatch && hhMatch && distanceMatch;
    });
  }, [restaurants, activeRegion, searchTerm, selectedCat, selectedMood, selectedPrice, minRating, maxDistance, userPos, hhOnly]);

  if (!isClient) return null;

  return (
    <main style={{ backgroundColor: bgSoft }} className="min-h-screen text-[#2D2D2A] font-light transition-colors duration-1000">
      
      {/* NAVIGATION - Dökkari og fágaðri */}
      <nav className="fixed top-0 w-full bg-[#1A1A18]/95 backdrop-blur-md border-b border-white/5 z-[100] px-6 py-6 shadow-2xl">
        <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <h1 className="text-3xl font-serif tracking-[0.2em] uppercase italic text-white">Veitingastaðir<span style={{ color: themeGold }}>.SPM</span></h1>
          </div>

          <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-6 py-3">
            <button onClick={() => setActiveRegion("Ísland")} className={`text-[10px] font-black tracking-widest px-4 transition-all ${activeRegion === "Ísland" ? 'text-[#C5A059]' : 'text-zinc-500'}`}>ÍSLAND</button>
            <div className="w-[1px] h-4 bg-white/10 mx-2" />
            <button onClick={() => setActiveRegion("Bali")} className={`text-[10px] font-black tracking-widest px-4 transition-all ${activeRegion === "Bali" ? 'text-[#C5A059]' : 'text-zinc-500'}`}>BALI</button>
            <div className="w-[1px] h-4 bg-white/10 mx-4" />
            <input type="text" placeholder="Leita..." className="bg-transparent text-white text-sm outline-none w-48 placeholder:text-zinc-600" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex gap-4">
            <button onClick={() => setHhOnly(!hhOnly)} className={`px-6 py-3 rounded-full text-[10px] font-black tracking-widest transition-all ${hhOnly ? 'bg-[#C5A059] text-white' : 'bg-white/5 text-zinc-400 border border-white/10'}`}>
              🍺 HAPPY HOUR
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-[180px] lg:pt-[120px] flex flex-col lg:flex-row h-screen">
        
        <div className="w-full lg:w-[65%] overflow-y-auto px-6 md:px-16 pb-40 no-scrollbar">
          
          {/* FILTER BOX - Mýkri lúxus lúkk */}
          <div className="mb-16 bg-[#FDFCFB]/40 backdrop-blur-sm p-10 rounded-[2rem] border border-black/5 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 block">Andrúmsloft</span>
                <div className="flex flex-wrap gap-4">
                  {["Allt", "Rómantík", "Viðskipti", "Vini"].map(mood => (
                    <button key={mood} onClick={() => setSelectedMood(mood)} className={`text-[10px] font-bold uppercase ${selectedMood === mood ? 'text-[#C5A059] border-b border-[#C5A059]' : 'text-zinc-400'}`}>{mood}</button>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 block">Verðflokkur</span>
                <div className="flex gap-2">
                  {["Allt", "Lágt", "Miðlungs", "Dýrt"].map(p => (
                    <button key={p} onClick={() => setSelectedPrice(p)} className={`px-3 py-1 rounded-md text-[9px] font-bold border ${selectedPrice === p ? 'bg-[#2D2D2A] text-white border-[#2D2D2A]' : 'border-black/10 text-zinc-500'}`}>{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 block">Lágmarks Einkunn</span>
                <div className="flex gap-2">
                  {[0, 4, 4.5].map(r => (
                    <button key={r} onClick={() => setMinRating(r)} className={`px-3 py-1 rounded-md text-[9px] font-bold border ${minRating === r ? 'bg-[#C5A059] text-white border-[#C5A059]' : 'border-black/10 text-zinc-500'}`}>{r === 0 ? 'Allt' : `${r} ★`}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RESTAURANT LIST */}
          <div className="space-y-24">
            <AnimatePresence mode="popLayout">
              {filtered.map((res) => (
                <motion.div key={res.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="group relative" onClick={() => res.lat && map?.flyTo([res.lat, res.lng], 16)}>
                  <div className="flex flex-col md:flex-row gap-12 items-start transition-all duration-500 group-hover:translate-x-2">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-lg p-4 shrink-0 border border-black/5">
                      <img src={res.image} className="w-full h-full object-contain mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity" alt={res.name} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-[#C5A059] font-serif italic text-xl">★ {res.rating}</span>
                        <span className="h-[1px] w-8 bg-black/10" />
                        <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">{res.category}</span>
                      </div>
                      <h2 className="text-4xl font-serif tracking-tight text-[#1A1A18] mb-4 group-hover:text-[#C5A059] transition-colors">{res.name}</h2>
                      <p className="text-[#5A5A54] text-lg font-serif italic leading-relaxed max-w-2xl">"{res.reviews || res.review}"</p>
                      
                      <div className="flex gap-8 mt-8 opacity-0 group-hover:opacity-100 transition-all duration-700">
                        <div className="text-[10px] font-black tracking-tighter">🕒 {res['opening hours']}</div>
                        {res.website && <a href={`https://${res.website.replace('https://', '')}`} target="_blank" className="text-[10px] font-black border-b border-black/20 pb-1 hover:border-[#C5A059] uppercase">Vefsíða</a>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* MAP - Dekkri tónar */}
        <div className="hidden lg:block lg:w-[35%] h-full sticky top-0 border-l border-black/5 shadow-2xl">
          <MapContainer center={[64.1467, -21.9333]} zoom={13} className="h-full w-full grayscale-[0.8] contrast-[1.1]" ref={setMap}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
            {filtered.map((res) => (
              res.lat && (
                <Marker key={res.id} position={[Number(res.lat), Number(res.lng)]} icon={icon}>
                  <Popup><div className="font-serif font-bold p-2">{res.name}</div></Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      </div>
    </main>
  );
}