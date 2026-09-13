import React, { useState, useEffect } from 'react';
import { MapPin, Search, ShieldCheck, Check, ChevronDown, Sparkles, Building, Clock } from 'lucide-react';
import { getCampusLocations } from '../services/locationService';

export default function CampusLocationPicker({
  value = '',
  onChange = () => {},
  required = false,
  label = "Preferred Handover Location"
}) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLocs = async () => {
      setLoading(true);
      try {
        const res = await getCampusLocations();
        if (isMounted && res && res.success) {
          setLocations(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load campus locations:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLocs();
    return () => { isMounted = false; };
  }, []);

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLocation = locations.find(loc => loc.name === value);

  const handleSelect = (locName) => {
    onChange(locName);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Verified Safe Zones Available</span>
        </span>
      </div>

      {/* Main Input / Selector Box */}
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3.5 bg-[#090D18]/90 border rounded-2xl text-slate-200 text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all duration-200 shadow-inner ${
            isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/25 bg-[#0e1424]' : 'border-white/10 hover:border-indigo-500/40 hover:bg-[#0e1424]/60'
          }`}
        >
          <div className="flex items-center space-x-2.5 truncate">
            <MapPin className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            {value ? (
              <span className="font-semibold text-slate-100 truncate">{value}</span>
            ) : (
              <span className="text-slate-500">Select or search a campus handover hub...</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#101626]/95 border border-indigo-500/30 rounded-2xl shadow-2xl z-50 p-3.5 space-y-3 animate-fadeIn backdrop-blur-2xl">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campus buildings, libraries, student hubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#080B14] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
            </div>

            {/* Quick Suggestions / Preset List */}
            <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                Verified Campus Exchange Hubs
              </div>

              {filteredLocations.map(loc => (
                <div
                  key={loc.id}
                  onClick={() => handleSelect(loc.name)}
                  className={`p-2.5 rounded-xl text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    value === loc.name 
                      ? 'bg-indigo-600/25 border border-indigo-500/40 text-indigo-200' 
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100 truncate">{loc.name}</span>
                      <span className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full ${
                        loc.safety_level === 'HIGH' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-300'
                      }`}>
                        {loc.safety_level} Safety
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <Building className="h-3 w-3 text-slate-500 flex-shrink-0" />
                      <span>{loc.building} • {loc.floor}</span>
                    </p>
                  </div>
                  {value === loc.name && (
                    <Check className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}

              {filteredLocations.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching preset hubs found. Use custom text below.
                </div>
              )}
            </div>

            {/* Custom Location Input */}
            <div className="pt-2.5 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                placeholder="Or type custom campus location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    e.preventDefault();
                    handleSelect(searchQuery.trim());
                  }
                }}
                className="flex-grow px-3 py-2 bg-[#080B14] border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  if (searchQuery.trim()) handleSelect(searchQuery.trim());
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Select Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-400 mr-1">Popular:</span>
        {['Central Library Lobby', 'Student Union Hub (1st Floor)', 'Engineering Block A Lobby', 'Main Campus Cafeteria Entrance'].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
              value === preset
                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                : 'bg-[#090D18]/80 border-white/10 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {preset.split('(')[0].trim()}
          </button>
        ))}
      </div>

      {/* Selected Location Safety Advice Banner */}
      {selectedLocation && (
        <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/25 rounded-2xl text-xs space-y-1 mt-2 shadow-inner">
          <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Campus Safety Rating: {selectedLocation.safety_level}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {selectedLocation.safety_features?.join(' • ')} (Recommended: {selectedLocation.recommended_hours})
          </p>
        </div>
      )}
    </div>
  );
}
