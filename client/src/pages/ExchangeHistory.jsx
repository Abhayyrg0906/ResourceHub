import React, { useState } from 'react';
import { Star, FileText, CheckCircle, ShieldAlert, Sparkles, ArrowRightLeft } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';
import AnimatedButton from '../components/ui/AnimatedButton';

const mockHistory = [
  { id: 401, item: 'Discrete Mathematics Textbook', partner: 'Sarah Connor', type: 'Buy', date: '2026-06-12', value: '₹450', rating: 5 },
  { id: 402, item: 'Raspberry Pi 4 Model B (4GB)', partner: 'Dwight Schrute', type: 'Swap', date: '2026-07-01', value: 'Swapped: Arduino Uno Kit', rating: 4 },
  { id: 403, item: 'Lab Safety Goggles & Coat', partner: 'Pam Beesly', type: 'Donate', date: '2026-05-15', value: 'Free (Donated)', rating: 0 },
];

export default function ExchangeHistory() {
  const [history, setHistory] = useState(mockHistory);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rating, setRating] = useState(5);

  const handleRate = (id) => {
    setHistory(history.map(item => {
      if (item.id === id) {
        return { ...item, rating: rating };
      }
      return item;
    }));
    setSelectedItem(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <GlassCard className="p-6 sm:p-8" glow="indigo">
        <SectionHeading
          badge="Verified Record"
          title="Exchange History"
          description="Review your past physical handovers, trades, borrows, purchases, and peer ratings on campus."
        />
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden" glow="none">
        {history.length > 0 ? (
          <div className="divide-y divide-white/[0.06]">
            {history.map(item => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                      {item.type}
                    </span>
                    <span className="text-xs text-slate-400">Exchanged with <strong className="text-slate-200">{item.partner}</strong> on {item.date}</span>
                  </div>
                  <h3 className="font-bold text-white text-base font-display">{item.item}</h3>
                  <p className="text-xs text-slate-400 font-medium">Terms: <span className="text-slate-300">{item.value}</span></p>
                </div>

                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4.5 w-4.5 ${
                          star <= item.rating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {item.rating === 0 ? (
                    <AnimatedButton
                      onClick={() => setSelectedItem(item.id)}
                      variant="primary"
                      size="sm"
                      icon={Star}
                    >
                      Rate Partner
                    </AnimatedButton>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle className="h-4 w-4" />
                      <span>Rated</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">No previous exchange history found.</div>
        )}
      </GlassCard>

      {/* Rating Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <GlassCard className="p-6 max-w-sm w-full space-y-5" glow="amber">
            <h3 className="font-bold text-white text-lg font-display">Rate Exchange Partner</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Your feedback is used to update the student trust score on campus. Select rating stars:
            </p>
            
            <div className="flex justify-center space-x-2 my-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none transition-transform hover:scale-125"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex space-x-2 pt-2">
              <AnimatedButton
                onClick={() => handleRate(selectedItem)}
                variant="primary"
                className="flex-grow"
              >
                Submit Feedback
              </AnimatedButton>
              <button
                onClick={() => setSelectedItem(null)}
                className="bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-bold px-4 py-2.5 rounded-xl border border-white/[0.08] transition-colors text-xs"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
