import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Building, 
  Navigation, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  Info,
  ExternalLink
} from 'lucide-react';
import { getCampusLocations } from '../services/locationService';

export default function CampusMeetupMapModal({
  locationName = '',
  resourceTitle = '',
  onClose = () => {}
}) {
  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);

  useEffect(() => {
    getCampusLocations().then(res => {
      if (res && res.success) {
        setLocations(res.data || []);
        const match = res.data.find(loc => 
          loc.name.toLowerCase() === locationName.toLowerCase() ||
          locationName.toLowerCase().includes(loc.name.toLowerCase()) ||
          loc.name.toLowerCase().includes(locationName.toLowerCase())
        );
        setActiveLocation(match || null);
      }
    }).catch(err => {
      console.error('Failed to load map locations:', err);
    });
  }, [locationName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#141b2d] border border-slate-700/80 rounded-3xl max-w-3xl w-full relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-700/60 flex items-center justify-between bg-gradient-to-r from-[#141b2d] to-[#192238]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <MapPin className="h-4 w-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Campus Meetup & Handover Map
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Exchange coordinates for: <strong className="text-slate-200">{resourceTitle || 'Resource Handover'}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-grow">
          
          {/* Interactive Campus Map Visualizer */}
          <div className="relative rounded-2xl bg-[#0a0e1a] border border-slate-800 h-64 sm:h-80 overflow-hidden flex items-center justify-center p-4">
            
            {/* Campus Grid Background Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="campus-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#campus-grid)" />
            </svg>

            {/* Campus Schematic Vector Layers */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Campus Roads & Walkways */}
              <path d="M 10 50 Q 50 45 90 50" stroke="#312e81" strokeWidth="2.5" fill="none" strokeDasharray="2,2" />
              <path d="M 50 10 Q 48 50 50 90" stroke="#312e81" strokeWidth="2.5" fill="none" strokeDasharray="2,2" />
              
              {/* Campus Building Zones */}
              <rect x="25" y="15" width="20" height="15" rx="2" fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8" opacity="0.6" />
              <text x="35" y="24" fill="#a5b4fc" fontSize="3" textAnchor="middle">Academic</text>

              <rect x="65" y="15" width="22" height="15" rx="2" fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8" opacity="0.6" />
              <text x="76" y="24" fill="#a5b4fc" fontSize="3" textAnchor="middle">Sciences</text>

              <rect x="40" y="38" width="24" height="20" rx="3" fill="#1e293b" stroke="#6366f1" strokeWidth="1.2" opacity="0.8" />
              <text x="52" y="49" fill="#c7d2fe" fontSize="3.5" fontWeight="bold" textAnchor="middle">Library Plaza</text>

              <rect x="15" y="65" width="25" height="18" rx="2" fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8" opacity="0.6" />
              <text x="27.5" y="75" fill="#a5b4fc" fontSize="3" textAnchor="middle">Labs & Tech</text>

              <rect x="60" y="65" width="25" height="20" rx="2" fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8" opacity="0.6" />
              <text x="72.5" y="76" fill="#a5b4fc" fontSize="3" textAnchor="middle">Student Union</text>
            </svg>

            {/* Interactive Campus Map Pins */}
            {locations.map((loc) => {
              const isSelected = activeLocation && activeLocation.id === loc.id;
              const xPos = loc.coordinates?.x || 50;
              const yPos = loc.coordinates?.y || 50;

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setActiveLocation(loc)}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-20 group cursor-pointer ${
                    isSelected ? 'scale-125' : 'hover:scale-110 opacity-75 hover:opacity-100'
                  }`}
                  title={loc.name}
                >
                  <div className={`relative flex items-center justify-center p-2 rounded-full shadow-lg transition-colors ${
                    isSelected 
                      ? 'bg-rose-500 text-white ring-4 ring-rose-500/40 animate-bounce' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap shadow-md pointer-events-none ${
                    isSelected ? 'bg-rose-950/90 text-rose-200 border border-rose-500/40' : 'bg-slate-900/90 text-slate-300'
                  }`}>
                    {loc.name.split('(')[0].trim()}
                  </span>
                </button>
              );
            })}

            {/* Custom Location Marker if not matching preset */}
            {!activeLocation && locationName && (
              <div 
                style={{ left: '50%', top: '50%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              >
                <div className="p-2.5 rounded-full bg-amber-500 text-slate-950 ring-4 ring-amber-500/30 animate-pulse shadow-xl">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="mt-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-950/90 text-amber-200 border border-amber-500/40 whitespace-nowrap shadow-lg">
                  {locationName}
                </span>
              </div>
            )}

            {/* Map Controls / Compass Tag */}
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 font-semibold flex items-center gap-1">
              <Navigation className="h-3 w-3 text-indigo-400" />
              <span>Campus Map View (Main Quad)</span>
            </div>
          </div>

          {/* Location Details Card */}
          <div className="p-5 rounded-2xl bg-[#0d111c]/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Designated Handover Hub</span>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>{activeLocation ? activeLocation.name : locationName}</span>
                </h3>
              </div>

              {activeLocation && (
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
                  activeLocation.safety_level === 'HIGH'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                }`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{activeLocation.safety_level} Safety Level</span>
                </span>
              )}
            </div>

            {activeLocation ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1 text-slate-400 font-medium">
                    <Building className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Building & Floor</span>
                  </div>
                  <p className="font-bold text-slate-200">{activeLocation.building}</p>
                  <p className="text-[11px] text-slate-400">{activeLocation.floor}</p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1 text-slate-400 font-medium">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Recommended Hours</span>
                  </div>
                  <p className="font-bold text-slate-200">{activeLocation.recommended_hours}</p>
                  <p className="text-[11px] text-emerald-400">Peak Security Hours</p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1 text-slate-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Safety Precautions</span>
                  </div>
                  <p className="font-bold text-slate-200">{activeLocation.safety_features?.[0]}</p>
                  <p className="text-[11px] text-slate-400">{activeLocation.safety_features?.slice(1).join(', ')}</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 space-y-2">
                <p>This resource specifies a custom meetup location on campus: <strong className="text-slate-200">{locationName}</strong>.</p>
                <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Ensure physical meetups are conducted in public, well-lit campus areas.</span>
                </p>
              </div>
            )}
          </div>

          {/* Campus Handover Safety Checklist */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-xs space-y-2">
            <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>Campus Safety Guidelines for In-Person Handovers</span>
            </h4>
            <ul className="text-slate-400 space-y-1 pl-5 list-disc text-[11px] leading-relaxed">
              <li>Meet in public campus areas during recommended daytime hours.</li>
              <li>Inspect physical item condition thoroughly before completing QR verification.</li>
              <li>Scan the owner's Handover QR code only after you have confirmed the item transfer.</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-700/60 bg-[#101626] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
