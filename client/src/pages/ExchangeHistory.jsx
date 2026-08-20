import React, { useState } from 'react';
import { Star, FileText, CheckCircle, ShieldAlert } from 'lucide-react';

const mockHistory = [
  { id: 401, item: 'Discrete Mathematics Textbook', partner: 'Sarah Connor', type: 'Buy', date: '2026-06-12', value: '$20', rating: 5 },
  { id: 402, item: 'Raspberry Pi 3 Model B', partner: 'Dwight Schrute', type: 'Swap', date: '2026-07-01', value: 'Swapped: Arduino Uno', rating: 4 },
  { id: 403, item: 'Lab Safety Goggles', partner: 'Pam Beesly', type: 'Donate', date: '2026-05-15', value: 'Free', rating: 0 }, // 0 means unrated
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Exchange History</h1>
        <p className="text-sm text-slate-400 mt-1">Review your completed trades, borrows, purchases, and donations on campus.</p>
      </div>

      <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl overflow-hidden shadow-lg">
        {history.length > 0 ? (
          <div className="divide-y divide-[#242f4c]">
            {history.map(item => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#161d30]/80 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-indigo-300">
                      {item.type}
                    </span>
                    <span className="text-xs text-slate-500">Exchanged with {item.partner} on {item.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-200 text-base">{item.item}</h3>
                  <p className="text-xs text-slate-400 font-medium">Terms: {item.value}</p>
                </div>

                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4.5 w-4.5 ${
                          star <= item.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  {item.rating === 0 ? (
                    <button
                      onClick={() => setSelectedItem(item.id)}
                      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap"
                    >
                      Rate Partner
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Rated</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">No previous exchange history found.</div>
        )}
      </div>

      {/* Mock Rating Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-[#0d111c]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#161d30] border border-[#242f4c] rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white text-lg">Rate Exchange Partner</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your feedback is used to update the student trust rating score on campus. Please select rating stars:
            </p>
            
            <div className="flex justify-center space-x-2 my-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleRate(selectedItem)}
                className="flex-grow bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Submit Feedback
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
