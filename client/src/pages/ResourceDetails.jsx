import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  ShieldCheck, 
  Calendar, 
  Shuffle, 
  Leaf, 
  CheckCircle,
  MessageSquare
} from 'lucide-react';

const mockDetails = {
  1: {
    title: 'University Physics (14th Edition)',
    category: 'Textbooks',
    type: 'Sell',
    value: '$45',
    condition: 'Like New',
    owner: 'Sarah Connor',
    trustScore: '99%',
    location: 'Engineering Building Lobby',
    desc: 'Barely used, no highlights or markings. Standard textbook for Phys 101/102. I can meet up during weekdays before 3 PM.',
    dateAdded: '2026-08-18'
  },
  2: {
    title: 'Texas Instruments TI-84 Plus',
    category: 'Electronics',
    type: 'Borrow',
    value: 'Free',
    condition: 'Good',
    owner: 'Jordan Vance',
    trustScore: '95%',
    location: 'Campus Library (Main floor)',
    desc: 'Borrow for up to 3 weeks. Battery cover is missing, but functions perfectly. Useful for Algebra/Statistics.',
    dateAdded: '2026-08-15'
  },
  3: {
    title: 'Organic Chemistry Lab Coat (Medium)',
    category: 'Laboratory',
    type: 'Donate',
    value: 'Free',
    condition: 'Fair',
    owner: 'Emily Watson',
    trustScore: '92%',
    location: 'Student Union Lounge',
    desc: 'Washed and ready for use. Small ink stain on the left pocket. Best fits height 5\'5" - 5\'8".',
    dateAdded: '2026-08-19'
  },
  4: {
    title: 'Arduino Uno Ultimate Starter Kit',
    category: 'Electronics',
    type: 'Swap',
    value: 'Swap',
    condition: 'Excellent',
    owner: 'Michael Scott',
    trustScore: '97%',
    location: 'Science Building Cafeteria',
    desc: 'Looking to swap for a Raspberry Pi 3/4 or equivalent sensor module packages. Included components: breadboard, LCD, wires.',
    dateAdded: '2026-08-14'
  }
};

export default function ResourceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requestSent, setRequestSent] = useState(false);
  const [selectedDays, setSelectedDays] = useState('7');

  // Fallback to item 1 if not found
  const resource = mockDetails[id] || mockDetails[1];

  const handleRequest = (e) => {
    e.preventDefault();
    setRequestSent(true);
    setTimeout(() => {
      // Navigate or show state
    }, 3000);
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'Sell': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'Borrow': return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'Swap': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'Donate': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/marketplace" className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Marketplace</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 md:p-8 space-y-6">
            
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full border ${getBadgeStyle(resource.type)}`}>
                  {resource.type}
                </span>
                <span className="text-xs text-slate-500 font-semibold">Added on {resource.dateAdded}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{resource.title}</h1>
              <p className="text-sm text-indigo-300 font-medium">{resource.category} • Condition: <span className="text-slate-300">{resource.condition}</span></p>
            </div>

            <div className="border-t border-[#242f4c] pt-6 space-y-4">
              <h3 className="font-bold text-slate-200 text-lg">Description</h3>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{resource.desc}</p>
            </div>

            <div className="border-t border-[#242f4c] pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Meetup location */}
              <div className="flex items-start space-x-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                <MapPin className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Preferred Handover Location</h4>
                  <p className="text-sm text-slate-300 mt-1 font-semibold">{resource.location}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Physical meetups must follow campus safety regulations.</p>
                </div>
              </div>

              {/* Sustainability Info */}
              <div className="flex items-start space-x-3 bg-emerald-950/10 p-4 rounded-2xl border border-emerald-500/10">
                <Leaf className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Sustainability Factor</h4>
                  <p className="text-sm text-slate-300 mt-1 font-semibold">CO2 Reuse Credit</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Opting for pre-owned prevents manufacturing carbon emissions.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Owner & Action Form Card */}
        <div className="space-y-6">
          
          {/* Owner details card */}
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6">
            <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-4">Listed By</h3>
            
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md text-lg">
                {resource.owner.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-200">{resource.owner}</h4>
                <div className="flex items-center space-x-1.5 text-xs mt-0.5 text-slate-400 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Verified Student</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0d111c]/60 border border-[#242f4c] rounded-xl p-4 flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Trust Score</span>
                <span className="text-lg font-extrabold text-slate-200">{resource.trustScore}</span>
              </div>
              <span className="text-xs bg-indigo-500/15 text-indigo-300 px-2.5 py-1 rounded font-semibold border border-indigo-500/20">
                Highly Reliable
              </span>
            </div>

            {/* Main Interactive Form Area */}
            {requestSent ? (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-5 text-center space-y-3 animate-fadeIn">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-slate-200">Exchange Proposal Sent!</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We have notified {resource.owner}. Keep an eye on your requests dashboard and notifications panel.
                </p>
                <Link to="/dashboard" className="inline-block text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-white mt-2 transition-colors">
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRequest} className="space-y-4">
                
                {resource.type === 'Borrow' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Borrow Duration</label>
                    <select 
                      value={selectedDays} 
                      onChange={(e) => setSelectedDays(e.target.value)}
                      className="w-full py-2 px-3 bg-[#0d111c]/90 border border-slate-700/60 rounded-xl text-slate-200 text-sm outline-none"
                    >
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days (Full Month)</option>
                    </select>
                  </div>
                )}

                {resource.type === 'Swap' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Propose Swap Item</label>
                    <select className="w-full py-2 px-3 bg-[#0d111c]/90 border border-slate-700/60 rounded-xl text-slate-200 text-sm outline-none">
                      <option>Calculus Textbook (Fair)</option>
                      <option>Engineering Ruler Set (Good)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:scale-[1.02] cursor-pointer"
                >
                  <span>Propose Exchange ({resource.value})</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Chat feature placeholder clicked.')}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl border border-[#242f4c] transition-all hover:text-white"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat with {resource.owner.split(' ')[0]}</span>
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
