import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

export default function AddResource() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Textbooks');
  const [type, setType] = useState('Sell');
  const [value, setValue] = useState('');
  const [condition, setCondition] = useState('Good');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate('/marketplace');
      }, 2000);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto my-6 bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 md:p-8 shadow-xl relative">
      <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">List a Resource</h1>
      <p className="text-sm text-slate-400 mb-8">Share your academic items with verified campus peers to earn credits, sell, swap, or donate.</p>

      {success ? (
        <div className="text-center py-12 space-y-4 animate-fadeIn">
          <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-100">Listing Published!</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Your item has been successfully added to the campus marketplace. Redirecting you to the marketplace...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Resource Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. TI-84 Plus Calculator, Chemistry Lab Coat (L)"
                required
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none transition-all duration-300"
              >
                <option value="Textbooks">Textbooks</option>
                <option value="Electronics">Electronics</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Stationery">Stationery</option>
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none transition-all duration-300"
              >
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            {/* Exchange Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Exchange Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none transition-all duration-300"
              >
                <option value="Sell">Sell (Cash/Points)</option>
                <option value="Borrow">Borrow (Free Loan)</option>
                <option value="Swap">Swap (Exchange)</option>
                <option value="Donate">Donate (Gift)</option>
              </select>
            </div>

            {/* Price/Details (Conditional on type) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                {type === 'Sell' && 'Price ($)'}
                {type === 'Borrow' && 'Max Duration (Days)'}
                {type === 'Swap' && 'Swap Requirements'}
                {type === 'Donate' && 'Value'}
              </label>
              <input
                type="text"
                disabled={type === 'Donate'}
                value={type === 'Donate' ? 'Free' : value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  type === 'Sell' ? 'e.g. 25' : 
                  type === 'Borrow' ? 'e.g. 14' : 
                  type === 'Swap' ? 'e.g. Raspberry Pi' : 'Free'
                }
                required={type !== 'Donate'}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 disabled:opacity-50"
              />
            </div>

            {/* Meetup location */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Preferred Handover Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Library 2nd floor, Student Union lobby"
                required
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Detailed Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="State any details, notes, highlighting, missing components, or meet-up preferences."
                rows="4"
                required
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 resize-none"
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <PlusCircle className="h-5 w-5" />
                <span>Publish Resource Listing</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
