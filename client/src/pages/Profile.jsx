import React, { useState } from 'react';
import { ShieldCheck, Mail, MapPin, Award, User, Save, CheckCircle } from 'lucide-react';

export default function Profile() {
  const [name, setName] = useState('Alex Rivera');
  const [major, setMajor] = useState('Computer Science & Engineering');
  const [location, setLocation] = useState('North Campus Dorms');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }, 1000);
  };

  const badges = [
    { title: 'Eco Ambassador', desc: 'Prevented over 15kg of carbon waste.', icon: '🌱', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    { title: 'Top Swapper', desc: 'Successfully exchanged 10+ items.', icon: '🤝', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
    { title: 'Honor Code Student', desc: 'Maintained 95%+ ratings.', icon: '🛡️', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Profile Banner */}
      <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl -z-10" />
        
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-extrabold text-white text-3xl shadow-xl ring-4 ring-[#161d30]">
            AR
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{name}</h1>
            <p className="text-sm text-slate-400">{major}</p>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3">
              <span className="flex items-center space-x-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified student@university.edu</span>
              </span>
              <span className="text-xs bg-[#0d111c] border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full font-semibold">
                Trust Score: 98%
              </span>
            </div>
          </div>
        </div>

        <div className="text-center md:text-right bg-slate-900/50 p-4 rounded-2xl border border-slate-800 md:min-w-[150px]">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Carbon Offset</span>
          <span className="text-3xl font-black text-indigo-400">18.4 kg</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">CO2 equivalence</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 space-y-6">
            <h3 className="font-bold text-slate-200 text-lg">Account Profile Details</h3>
            
            {success && (
              <div className="mb-4 flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm animate-fadeIn">
                <CheckCircle className="h-4 w-4" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Major / Department</label>
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Primary Pickup Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-indigo-600/15 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Badges */}
        <div className="space-y-6">
          <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-slate-200 text-lg flex items-center space-x-2">
              <Award className="h-5 w-5 text-indigo-400" />
              <span>Campus Badges</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Earn badges by trading items, maintaining rapid response rates, and recycling products within the community.
            </p>

            <div className="space-y-3">
              {badges.map((badge, idx) => (
                <div key={idx} className={`p-3 rounded-2xl flex items-start space-x-3 bg-slate-900/40 border border-slate-800`}>
                  <div className="text-2xl mt-0.5">{badge.icon}</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{badge.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
