import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, BookOpen, Cpu, FlaskConical, Scissors, Info } from 'lucide-react';

const mockResources = [
  {
    id: 1,
    title: 'University Physics (14th Edition)',
    category: 'Textbooks',
    type: 'Sell',
    value: '$45',
    condition: 'Like New',
    owner: 'Sarah Connor',
    trustScore: '99%',
    desc: 'Barely used, no highlights or markings. Standard textbook for Phys 101/102.'
  },
  {
    id: 2,
    title: 'Texas Instruments TI-84 Plus',
    category: 'Electronics',
    type: 'Borrow',
    value: 'Free',
    condition: 'Good',
    owner: 'Jordan Vance',
    trustScore: '95%',
    desc: 'Borrow for up to 3 weeks. Battery cover is missing, but functions perfectly.'
  },
  {
    id: 3,
    title: 'Organic Chemistry Lab Coat (Medium)',
    category: 'Laboratory',
    type: 'Donate',
    value: 'Free',
    condition: 'Fair',
    owner: 'Emily Watson',
    trustScore: '92%',
    desc: 'Washed and ready for use. Small ink stain on the left pocket.'
  },
  {
    id: 4,
    title: 'Arduino Uno Ultimate Starter Kit',
    category: 'Electronics',
    type: 'Swap',
    value: 'Swap',
    condition: 'Excellent',
    owner: 'Michael Scott',
    trustScore: '97%',
    desc: 'Looking to swap for a Raspberry Pi 3/4 or equivalent sensor module packages.'
  },
  {
    id: 5,
    title: 'Organic Chemistry Model Kit',
    category: 'Laboratory',
    type: 'Sell',
    value: '$15',
    condition: 'Like New',
    owner: 'Dwight Schrute',
    trustScore: '98%',
    desc: 'All molecular models intact, includes molecular link remover tool.'
  },
  {
    id: 6,
    title: 'Premium Drafting Stationery Set',
    category: 'Stationery',
    type: 'Donate',
    value: 'Free',
    condition: 'Good',
    owner: 'Pam Beesly',
    trustScore: '94%',
    desc: 'Includes compasses, T-square, and fine-liners. Leftover from design drawing course.'
  }
];

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const categories = ['All', 'Textbooks', 'Electronics', 'Laboratory', 'Stationery'];
  const types = ['All', 'Sell', 'Borrow', 'Swap', 'Donate'];

  // Filter logic
  const filteredResources = mockResources.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesType = selectedType === 'All' || item.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeBadgeStyles = (type) => {
    switch (type) {
      case 'Sell': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'Borrow': return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'Swap': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'Donate': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header and Search */}
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Academic Marketplace</h1>
        <p className="text-sm text-slate-400 max-w-xl">Find textbooks, electronics, and materials listed by verified students in your university campus.</p>
        
        {/* Search Input Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search books, calculators, project parts..."
              className="w-full pl-10 pr-4 py-3 bg-[#161d30]/50 border border-[#242f4c] focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300"
            />
          </div>
          <button className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-xl border border-[#242f4c] transition-all">
            <SlidersHorizontal className="h-5 w-5" />
            <span className="font-semibold text-sm">Filters</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-2">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                    : 'bg-[#161d30]/60 border-[#242f4c] text-slate-400 hover:bg-[#1f2942] hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Type Tabs */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-2">Exchange Type</h3>
          <div className="flex flex-wrap gap-2">
            {types.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-all duration-300 ${
                  selectedType === type
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/15'
                    : 'bg-[#161d30]/60 border-[#242f4c] text-slate-400 hover:bg-[#1f2942] hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resource Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(item => (
            <div key={item.id} className="group bg-[#161d30]/50 hover:bg-[#161d30]/90 border border-[#242f4c] hover:border-slate-700 rounded-2xl overflow-hidden p-6 transition-all duration-300 flex flex-col justify-between h-[280px]">
              
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded border ${getTypeBadgeStyles(item.type)}`}>
                    {item.type}
                  </span>
                  <span className="text-sm font-bold text-slate-100">{item.value}</span>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{item.category} • Condition: {item.condition}</p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {item.desc}
                </p>
              </div>

              <div className="border-t border-[#242f4c] pt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Owner</p>
                  <p className="text-xs font-semibold text-slate-300">{item.owner} <span className="text-emerald-400 font-bold">({item.trustScore})</span></p>
                </div>
                <Link
                  to={`/resource/${item.id}`}
                  className="flex items-center space-x-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Info className="h-3 w-3" />
                  <span>Details</span>
                </Link>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#161d30]/30 border border-[#242f4c] rounded-2xl">
          <p className="text-slate-400 font-medium">No resources found matching the filter criteria.</p>
        </div>
      )}
    </div>
  );
}
