import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Info, Image, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { getCategories, getResources } from '../services/resourceService';

export default function Marketplace() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [sort, setSort] = useState('latest');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Search input debounce handler (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getCategories();
        if (res.success) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err.message);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Resources on parameter changes
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page: currentPage,
          limit: 6,
          sort
        };

        if (debouncedSearch.trim() !== '') params.search = debouncedSearch;
        if (selectedCategory !== 'All') params.category_id = selectedCategory;
        if (selectedType !== 'All') params.exchange_type = selectedType;
        if (selectedCondition !== 'All') params.item_condition = selectedCondition;

        const res = await getResources(params);
        if (res.success) {
          setResources(res.data);
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error('Failed to load resources:', err.message);
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [selectedCategory, selectedType, selectedCondition, sort, currentPage, debouncedSearch]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const getBadgeStyle = (type) => {
    switch (type.toUpperCase()) {
      case 'SELL': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'BORROW': return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'SWAP': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'DONATE': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'RESERVED': return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case 'EXCHANGED': return 'bg-slate-500/10 text-slate-400 border border-slate-700';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header and Search */}
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Academic Marketplace</h1>
        <p className="text-sm text-slate-400 max-w-xl">Find textbooks, electronics, and materials listed by verified students in your university campus.</p>
        
        {/* Search & Sorting bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              placeholder="Search books, calculators, project parts..."
              className="w-full pl-10 pr-4 py-3 bg-[#161d30]/50 border border-[#242f4c] focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 text-sm"
            />
          </div>

          <div className="flex gap-3">
            {/* Condition Filter */}
            <select
              value={selectedCondition}
              onChange={(e) => handleFilterChange(setSelectedCondition, e.target.value)}
              className="bg-[#161d30]/50 border border-[#242f4c] text-slate-300 px-4 py-3 rounded-xl outline-none font-semibold text-sm cursor-pointer focus:border-indigo-500/80 transition-all text-sm"
            >
              <option value="All">All Conditions</option>
              <option value="NEW">New</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>

            {/* Sort Select */}
            <select
              value={sort}
              onChange={(e) => handleFilterChange(setSort, e.target.value)}
              className="bg-[#161d30]/50 border border-[#242f4c] text-slate-300 px-4 py-3 rounded-xl outline-none font-semibold text-sm cursor-pointer focus:border-indigo-500/80 transition-all text-sm"
            >
              <option value="latest">Latest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="title">Title: A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-2">Categories</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange(setSelectedCategory, 'All')}
              className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-all duration-300 ${
                selectedCategory === 'All'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                  : 'bg-[#161d30]/60 border-[#242f4c] text-slate-400 hover:bg-[#1f2942] hover:text-slate-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleFilterChange(setSelectedCategory, cat.id)}
                className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                    : 'bg-[#161d30]/60 border-[#242f4c] text-slate-400 hover:bg-[#1f2942] hover:text-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Type Tabs */}
        <div>
          <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-2">Exchange Type</h3>
          <div className="flex flex-wrap gap-2">
            {['All', 'SELL', 'BORROW', 'SWAP', 'DONATE'].map(type => (
              <button
                key={type}
                onClick={() => handleFilterChange(setSelectedType, type)}
                className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-all duration-300 ${
                  selectedType === type
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/15'
                    : 'bg-[#161d30]/60 border-[#242f4c] text-slate-400 hover:bg-[#1f2942] hover:text-slate-200'
                }`}
              >
                {type === 'All' ? 'All' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resource Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : resources.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map(item => (
              <div key={item.id} className="group bg-[#161d30]/50 hover:bg-[#161d30]/90 border border-[#242f4c] hover:border-slate-700 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-[420px] shadow-lg">
                
                {/* Image Display */}
                <div className="h-44 bg-[#0d111c]/60 overflow-hidden relative border-b border-[#242f4c] flex items-center justify-center text-slate-600">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/20 to-purple-950/20">
                      <Image className="h-10 w-10 text-slate-700 mb-2" />
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">No Image Provided</span>
                    </div>
                  )}

                  {/* Availability Badge */}
                  <span className={`absolute top-3 right-3 text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded ${getStatusBadgeStyle(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                {/* Resource Info */}
                <div className="p-5 flex-grow space-y-2.5">
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded border ${getBadgeStyle(item.exchange_type)}`}>
                      {item.exchange_type}
                    </span>
                    <span className="text-sm font-bold text-slate-100">
                      {item.exchange_type === 'SELL' ? `₹${item.price}` : 'Free'}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.category} • Condition: <span className="text-slate-400">{item.item_condition}</span></p>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Meetup location */}
                  <div className="flex items-center space-x-1 text-slate-400 text-xs mt-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{item.meetup_location}</span>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="px-5 pb-5 pt-3 border-t border-[#242f4c] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Owner</p>
                    <p className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">{item.owner.name}</p>
                  </div>
                  <Link
                    to={`/resources/${item.id}`}
                    className="flex items-center space-x-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Info className="h-3 w-3" />
                    <span>Details</span>
                  </Link>
                </div>

              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-3 pt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 border border-slate-700/60 transition-all cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 border border-slate-700/60 transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#161d30]/30 border border-[#242f4c] rounded-2xl">
          <p className="text-slate-400 font-medium">No resources found matching the filter criteria.</p>
        </div>
      )}
    </div>
  );
}
