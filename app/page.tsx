"use client";
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

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

  const isIsland = activeRegion === "Ísland";
  const themeGold = "#D4AF37";

  useEffect(() => {
    setIsClient(true);
    async function fetchData() {
      const { data } = await supabase.from('restaurants').select('*');
      if (data) setRestaurants(data);
    }
    fetchData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    import('leaflet').then((L) => {
      setIcon(L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [20, 32], iconAnchor: [10, 32] }));
    });
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const checkIfOpen = (hours: string) => {
    if (!hours || hours === "Lokað" || hours === "Nei") return false;
    try {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [start, end] = hours.split('-').map(t => {
        const [h, m] = t.trim().split(':').map(Number);
        return h * 60 + m;
      });
      return currentMin >= start && currentMin <= end;
    } catch { return false; }
  };

  const filtered = useMemo(() => {
    return restaurants.filter(res => {
      const isBali = Number(res.lat) < 0;
      const regionMatch = activeRegion === "Bali" ? isBali : !isBali;
      const searchMatch = res.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const moodData = (res['best for'] || "").toLowerCase();
      const moodMatch = selectedMood === "Allt" || moodData.includes(selectedMood.toLowerCase());
      const catMatch = selectedCat === "Allt" || res.category === selectedCat;
      const priceData = (res.price || res.cost || "").toLowerCase();
      const priceMatch = selectedPrice === "Allt" || priceData.includes(selectedPrice.toLowerCase());
      const ratingMatch = parseFloat(res.rating?.split('/')[0] || "0") >= minRating;
      const hhMatch = !hhOnly || (res['happy hour time'] && res['happy hour time'] !== "Nei");
      const openMatch = !openNow || checkIfOpen(res['opening hours']);

      let distanceMatch = true;
      if (userPos && activeRegion === "Ísland" && res.lat) {
        const dist = calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng);
        distanceMatch = maxDistance === 50 || dist <= maxDistance;
      }
      
      return regionMatch && searchMatch && moodMatch && catMatch && priceMatch && ratingMatch && hhMatch && openMatch && distanceMatch;
    });
  }, [restaurants, activeRegion, searchTerm, selectedCat, selectedMood, selectedPrice, minRating, maxDistance, userPos, hhOnly, openNow]);

  if (!isClient) return null;

  return (
    <main className={`min-h-screen ${isIsland ? 'bg-[#FBFBFA]' : 'bg-[#F9F6F1]'} text-[#1C1C1C] font-light transition-colors duration-1000`}>
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-2xl border-b border-zinc-100 z-[100] px-6 py-8 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center lg:items-start cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <h1 className="text-4xl font-serif tracking-widest uppercase italic">Veitingastaðir<span style={{ color: themeGold }}>.SPM</span></h1>
          </div>

          <div className="flex items-center bg-zinc-50 border border-zinc-100 rounded-full px-8 py-4 shadow-inner">
            <button onClick={() => {setActiveRegion("Ísland"); setSelectedMood("Allt");}} className={`text-xs font-black tracking-widest px-6 transition-all ${isIsland ? 'text-[#D4AF37]' : 'text-zinc-300'}`}>ÍSLAND</button>
            <div className="w-[1px] h-6 bg-zinc-200 mx-4" />
            <button onClick={() => {setActiveRegion("Bali"); setSelectedMood("Allt");}} className={`text-xs font-black tracking-widest px-6 transition-all ${!isIsland ? 'text-[#D4AF37]' : 'text-zinc-300'}`}>BALI</button>
            <div className="w-[1px] h-6 bg-zinc-200 mx-4" />
            <input type="text" placeholder="Leita að stað..." className="bg-transparent text-sm font-medium outline-none w-64" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex gap-6">
            <button onClick={() => setOpenNow(!openNow)} className={`flex items-center gap-4 px-10 py-5 rounded-full text-xs font-black tracking-widest transition-all shadow-xl ${openNow ? 'bg-green-600 text-white' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
              <span className={`w-3 h-3 rounded-full ${openNow ? 'bg-white animate-pulse' : 'bg-green-500'}`} /> OPIÐ NÚNA
            </button>
            <button onClick={() => setHhOnly(!hhOnly)} className={`flex items-center gap-4 px-10 py-5 rounded-full text-xs font-black tracking-widest transition-all shadow-xl ${hhOnly ? 'bg-[#D4AF37] text-white' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
              🍺 HAPPY HOUR
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-[220px] lg:pt-[150px] flex flex-col lg:flex-row h-screen overflow-hidden">
        
        {/* SIDEBAR - 70% WIDTH */}
        <div className="w-full lg:w-[70%] overflow-y-auto px-8 md:px-20 pb-40 no-scrollbar">
          
          {/* ADVANCED CONCIERGE FILTERS */}
          <div className="space-y-12 mb-20 bg-white/50 p-10 rounded-[3rem] border border-zinc-100 shadow-sm">
            
            {/* Best Fyrir Selector */}
            <div>
              <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 mb-6 block">Best fyrir</span>
              <div className="flex gap-8 overflow-x-auto no-scrollbar py-2">
                {["Allt", "Rómantík", "Viðskipti", "Vini", "Fjölskylda", "Skyndibiti"].map(mood => (
                  <button key={mood} onClick={() => setSelectedMood(mood)} className={`text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedMood === mood ? 'text-[#D4AF37] border-b-4 border-[#D4AF37] pb-2' : 'text-zinc-300 hover:text-zinc-500'}`}>{mood}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Category */}
              <div>
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 mb-4 block">Tegund</span>
                <select onChange={(e) => setSelectedCat(e.target.value)} className="w-full bg-transparent border-b-2 border-zinc-200 text-sm font-bold py-2 outline-none">
                  <option value="Allt">Allt</option>
                  {Array.from(new Set(restaurants.map(r => r.category))).filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Rating */}
              <div>
                <span className="text-xs font-black uppercase tracking-[0.3em] mb-4 block" style={{ color: themeGold }}>Lágmarks Einkunn</span>
                <div className="flex gap-3">
                  {[0, 3, 4, 4.5].map(r => (
                    <button key={r} onClick={() => setMinRating(r)} className={`text-[10px] font-black px-4 py-2 rounded-xl border-2 transition-all ${minRating === r ? 'bg-zinc-900 text-white' : 'border-zinc-100 text-zinc-300'}`}>{r === 0 ? 'Allt' : `${r} ★`}</button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 mb-4 block">Verðflokkur</span>
                <div className="flex gap-3">
                  {["Allt", "Lágt", "Miðlungs", "Dýrt"].map(p => (
                    <button key={p} onClick={() => setSelectedPrice(p)} className={`text-[10px] font-black px-4 py-2 rounded-xl border-2 transition-all ${selectedPrice === p ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'border-zinc-100 text-zinc-300'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Distance Slider */}
            {userPos && isIsland && (
              <div className="pt-4">
                <span className="text-xs font-black uppercase tracking-[0.3em] mb-6 block" style={{ color: themeGold }}>Fjarlægð frá þér: {maxDistance === 50 ? "Öll svæði" : `${maxDistance} km`}</span>
                <input type="range" min="1" max="50" value={maxDistance} onChange={(e) => setMaxDistance(parseInt(e.target.value))} className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]" />
              </div>
            )}
          </div>

          {/* LIST */}
          <div className="space-y-36">
            <AnimatePresence mode="popLayout">
              {filtered.map((res) => (
                <motion.div key={res.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-16 items-center group cursor-pointer" onClick={() => res.lat && map?.flyTo([res.lat, res.lng], 16)}>
                  <div className="relative w-32 h-32 rounded-full border border-zinc-100 p-6 bg-white shrink-0 shadow-sm group-hover:shadow-2xl transition-all">
                    <img src={res.image} className="w-full h-full object-contain filter grayscale-[0.2] group-hover:grayscale-0 transition-all" alt={res.name} />
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center gap-6 mb-6 justify-center md:justify-start">
                      <span className="text-[#D4AF37] text-2xl font-serif italic font-bold">★ {res.rating}</span>
                      {userPos && res.lat && activeRegion === "Ísland" && (
                        <span className="text-[10px] font-black bg-zinc-100 px-3 py-1 rounded-full text-zinc-400">📍 {calculateDistance(userPos.lat, userPos.lng, res.lat, res.lng).toFixed(1)} km</span>
                      )}
                    </div>
                    <h2 className="text-5xl md:text-6xl font-serif tracking-tight group-hover:text-[#D4AF37] transition-colors duration-500 mb-8">{res.name}</h2>
                    <p className="text-zinc-600 text-xl md:text-2xl font-serif italic mb-10 opacity-80 leading-relaxed">"{res.reviews || res.review}"</p>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-12 pt-10 border-t border-zinc-50 opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-bold">💰 {res.price || res.cost}</span>
                      <span className="text-lg font-black text-zinc-900">🕒 {res['opening hours']}</span>
                      {res.website && <a href={`https://${res.website.replace('https://', '')}`} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs font-black border-b-2 border-zinc-200 pb-1 hover:border-zinc-900 uppercase">Vefsíða</a>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* MAP */}
        <div className="hidden lg:block lg:w-[30%] h-full sticky top-0 border-l border-zinc-100">
          <MapContainer center={[64.1467, -21.9333]} zoom={13} className="h-full w-full grayscale-[0.5]" ref={setMap}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
            {filtered.map((res) => (
              res.lat && (
                <Marker key={res.id} position={[Number(res.lat), Number(res.lng)]} icon={icon}>
                  <Popup><div className="font-serif font-bold text-center">{res.name}</div></Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      </div>
    </main>
  );
}