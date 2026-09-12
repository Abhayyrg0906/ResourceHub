import React, { useState } from 'react';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';
import CampusMeetupMapModal from './CampusMeetupMapModal';

export default function MeetupLocationCard({
  meetupLocation = '',
  resourceTitle = '',
  className = ''
}) {
  const [showMapModal, setShowMapModal] = useState(false);

  if (!meetupLocation) return null;

  return (
    <>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 mt-0.5 flex-shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Handover Location</h4>
              <span className="inline-flex items-center gap-0.5 text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <ShieldCheck className="h-2.5 w-2.5" />
                <span>Verified Zone</span>
              </span>
            </div>
            <p className="text-sm text-slate-200 mt-0.5 font-bold">{meetupLocation}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Campus public exchange point</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMapModal(true)}
          className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-shrink-0 self-start sm:self-auto"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>View on Campus Map</span>
        </button>
      </div>

      {showMapModal && (
        <CampusMeetupMapModal
          locationName={meetupLocation}
          resourceTitle={resourceTitle}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </>
  );
}
