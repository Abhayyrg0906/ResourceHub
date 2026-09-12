import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Info, 
  Image, 
  MapPin, 
  AlertTriangle, 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Star, 
  ArrowUpDown, 
  Filter, 
  Check,
  Heart
} from 'lucide-react';
import { getCategories, getResources } from '../services/resourceService';
import wishlistService from '../services/wishlistService';
import { useAuth } from '../context/AuthContext';
import RecommendationsSection from '../components/RecommendationsSection';

export default function Marketplace() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Primary Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Advanced Filter States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('AVAILABLE');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [debouncedMinPrice, setDebouncedMinPrice] = useState('');
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');
  const [sort, setSort] = useState('latest');

  // UI Panel Toggle
  const [showFilters, setShowFilters] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Debounce price and location inputs (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
      setDebouncedMaxPrice(maxPrice);
      setDebouncedLocation(locationTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [minPrice, maxPrice, locationTerm]);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState(new Set());

  // Fetch Wishlist IDs when user is authenticated
  useEffect(() => {
    const loadWishlistIds = async () => {
      if (!user) return;
      try {
        const res = await wishlistService.getWishlistIds();
        if (res && res.success) {
          setWishlistIds(new Set(res.ids || []));
        }
      } catch (e) {
        // Ignore background fetch errors
      }
    };
    loadWishlistIds();
  }, [user]);

  const handleToggleWishlist = async (resourceId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user) {
      navigate('/login');
      return;
    }

    // Optimistic UI update
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });

    try {
      const res = await wishlistService.toggleWishlist(resourceId);
      if (res && res.success) {
        setWishlistIds(prev => {
          const next = new Set(prev);
          if (res.inWishlist) next.add(resourceId);
          else next.delete(resourceId);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
      // Rollback on error
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (next.has(resourceId)) next.delete(resourceId);
        else next.add(resourceId);
        return next;
      });
    }
  };

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

  // Fetch Resources when parameters change
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page: currentPage,
          limit: 9,
          sort
        };

        if (debouncedSearch.trim() !== '') params.search = debouncedSearch.trim();
        if (selectedCategory !== 'All') params.category_id = selectedCategory;
        if (selectedType !== 'All') params.exchange_type = selectedType;
        if (selectedCondition !== 'All') params.item_condition = selectedCondition;
        if (selectedStatus !== 'All') params.status = selectedStatus;
        if (debouncedMinPrice !== '' && !isNaN(parseFloat(debouncedMinPrice))) params.min_price = debouncedMinPrice;
        if (debouncedMaxPrice !== '' && !isNaN(parseFloat(debouncedMaxPrice))) params.max_price = debouncedMaxPrice;
        if (debouncedLocation.trim() !== '') params.location = debouncedLocation.trim();

        const res = await getResources(params);
        if (res.success) {
          setResources(res.data);
          setPagination(res.pagination);
        }
      } catch (err) {
        console.error('Failed to load resources:', err.message);
        setError('Something went wrong while fetching resources. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [
    selectedCategory, 
    selectedType, 
    selectedCondition, 
    selectedStatus, 
    sort, 
    currentPage, 
    debouncedSearch,
    debouncedMinPrice,
    debouncedMaxPrice,
    debouncedLocation
  ]);

  // Reset page to 1 on filter changes
  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  // Clear all filters action
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedType('All');
    setSelectedCondition('All');
    setSelectedStatus('AVAILABLE');
    setMinPrice('');
    setMaxPrice('');
    setDebouncedMinPrice('');
    setDebouncedMaxPrice('');
    setLocationTerm('');
    setDebouncedLocation('');
    setSort('latest');
    setCurrentPage(1);
  };

  // Calculate active filter count (excluding default AVAILABLE status and sort)
  const activeFilterCount = [
    debouncedSearch.trim() !== '',
    selectedCategory !== 'All',
    selectedType !== 'All',
    selectedCondition !== 'All',
    selectedStatus !== 'AVAILABLE',
    debouncedMinPrice !== '',
    debouncedMaxPrice !== '',
    debouncedLocation.trim() !== ''
  ].filter(Boolean).length;

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

  const getCategoryName = (id) => {
    const cat = categories.find(c => String(c.id) === String(id));
    return cat ? cat.name : 'Category';
  };

  return (
    <div className="space-y-6">
      {/* Marketplace Header */}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Academic Marketplace</h1>
            <p className="text-sm text-slate-400 mt-1">
              Find textbooks, electronics, lab kits, and materials listed by verified students across campus.
            </p>
          </div>

          <Link
            to="/resources/create"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/20 w-fit"
          >
            <span>+ List Resource</span>
          </Link>
        </div>
      </div>

      {/* Primary Search & Control Bar */}
      <div className="bg-[#161d30]/70 border border-[#242f4c] rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box with instant clear icon */}
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              placeholder="Search by title, author, keyword, or description..."
              className="w-full pl-10 pr-10 py-3 bg-[#0d111c]/70 border border-[#242f4c] focus:border-indigo-500 rounded-xl text-slate-100 placeholder-slate-500 outline-none text-sm transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => handleFilterChange(setSearchTerm, '')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Controls: Filter Toggle & Sort */}
          <div className="flex items-center gap-2.5">
            {/* Filter Panel Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                showFilters || activeFilterCount > 0
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-[#0d111c]/60 border-[#242f4c] text-slate-300 hover:bg-[#1f2942] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-indigo-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative min-w-[170px]">
              <select
                value={sort}
                onChange={(e) => handleFilterChange(setSort, e.target.value)}
                className="w-full bg-[#0d111c]/60 border border-[#242f4c] text-slate-200 px-3.5 py-3 rounded-xl outline-none font-semibold text-sm cursor-pointer focus:border-indigo-500 transition-all appearance-none pr-8"
              >
                <option value="latest">Latest (Newest First)</option>
                <option value="oldest">Oldest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="trust_score">Highest Trust Score</option>
                <option value="relevant">Most Relevant</option>
              </select>
              <ArrowUpDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear Filters Button (shown when any filter is active) */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="flex items-center space-x-1 px-3 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                title="Reset all search & filter criteria"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-[#242f4c] space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
                  className="w-full bg-[#0d111c]/80 border border-[#242f4c] text-slate-200 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Exchange Type Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Exchange Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => handleFilterChange(setSelectedType, e.target.value)}
                  className="w-full bg-[#0d111c]/80 border border-[#242f4c] text-slate-200 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="All">All Types</option>
                  <option value="SELL">Sell</option>
                  <option value="BORROW">Borrow</option>
                  <option value="DONATE">Donate</option>
                  <option value="SWAP">Swap</option>
                </select>
              </div>

              {/* Condition Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Item Condition</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => handleFilterChange(setSelectedCondition, e.target.value)}
                  className="w-full bg-[#0d111c]/80 border border-[#242f4c] text-slate-200 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="All">All Conditions</option>
                  <option value="NEW">New</option>
                  <option value="LIKE_NEW">Like New</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>

              {/* Resource Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Availability Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
                  className="w-full bg-[#0d111c]/80 border border-[#242f4c] text-slate-200 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="AVAILABLE">Available Only</option>
                  <option value="All">All Active (Available + Reserved + Exchanged)</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="EXCHANGED">Exchanged</option>
                </select>
              </div>
            </div>

            {/* Price Range & Location Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Min Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Min Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => handleFilterChange(setMinPrice, e.target.value)}
                  placeholder="₹ Min (e.g. 50)"
                  className="w-full bg-[#0d111c]/80 border border-[#242f4c] text-slate-200 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all placeholder-slate-600"
                />
              </div>

              {/* Max Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Max Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => handleFilterChange(setMaxPrice, e.target.value)}
                  placeholder="₹ Max (e.g. 500)"
                  className="w-full bg-[#0d111c]/80 border border-[#242f4c] text-slate-200 px-3 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all placeholder-slate-600"
                />
              </div>

              {/* Campus Meetup Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meetup Location</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={locationTerm}
                    onChange={(e) => handleFilterChange(setLocationTerm, e.target.value)}
                    placeholder="e.g. Library, Lab 4, Block C..."
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0d111c]/80 border border-[#242f4c] text-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all placeholder-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips / Pills */}
        {activeFilterCount > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[#242f4c]/60">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Active:
            </span>

            {debouncedSearch && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs">
                <span>Search: &ldquo;{debouncedSearch}&rdquo;</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-white cursor-pointer ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs">
                <span>Category: {getCategoryName(selectedCategory)}</span>
                <button onClick={() => setSelectedCategory('All')} className="hover:text-white cursor-pointer ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedType !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs">
                <span>Type: {selectedType}</span>
                <button onClick={() => setSelectedType('All')} className="hover:text-white cursor-pointer ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedCondition !== 'All' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                <span>Condition: {selectedCondition}</span>
                <button onClick={() => setSelectedCondition('All')} className="hover:text-white cursor-pointer ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {(debouncedMinPrice !== '' || debouncedMaxPrice !== '') && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                <span>
                  Price: {debouncedMinPrice ? `₹${debouncedMinPrice}` : '₹0'} - {debouncedMaxPrice ? `₹${debouncedMaxPrice}` : '∞'}
                </span>
                <button 
                  onClick={() => { setMinPrice(''); setMaxPrice(''); }} 
                  className="hover:text-white cursor-pointer ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {debouncedLocation && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs">
                <span>Location: {debouncedLocation}</span>
                <button onClick={() => setLocationTerm('')} className="hover:text-white cursor-pointer ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedStatus !== 'AVAILABLE' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-500/20 border border-slate-500/40 text-slate-300 text-xs">
                <span>Status: {selectedStatus}</span>
                <button onClick={() => setSelectedStatus('AVAILABLE')} className="hover:text-white cursor-pointer ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 ml-auto cursor-pointer underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm max-w-lg mx-auto shadow-lg">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recommended for You Section (M20) */}
      {currentPage === 1 && !debouncedSearch && selectedCategory === 'All' && selectedType === 'All' && (
        <RecommendationsSection 
          title="✨ Recommended for You"
          subtitle="Smart explainable recommendations based on your wishlist, trades, and campus activity"
          type="personalized"
          limit={3}
          className="mb-8"
        />
      )}

      {/* Results Count & Meta */}
      {!loading && !error && pagination && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Showing <strong className="text-slate-200">{resources.length}</strong> of{' '}
            <strong className="text-slate-200">{pagination.total}</strong> resources
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Page <strong className="text-slate-200">{pagination.page}</strong> of{' '}
              <strong className="text-slate-200">{pagination.totalPages}</strong>
            </span>
          )}
        </div>
      )}

      {/* Resource Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-24 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading resources matching your criteria...</p>
        </div>
      ) : resources.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map(item => (
              <div 
                key={item.id} 
                className="group bg-[#161d30]/60 hover:bg-[#161d30]/95 border border-[#242f4c] hover:border-slate-600/80 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-[430px] shadow-lg hover:shadow-2xl hover:shadow-indigo-950/20"
              >
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

                  {/* Wishlist Bookmark Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleWishlist(item.id, e)}
                    className={`absolute top-3 left-3 p-1.5 rounded-full backdrop-blur-md transition-all shadow-md z-10 cursor-pointer ${
                      wishlistIds.has(item.id)
                        ? 'bg-rose-950/70 text-rose-400 hover:bg-rose-900/80 ring-1 ring-rose-500/50'
                        : 'bg-black/50 text-slate-300 hover:text-rose-400 hover:bg-black/70'
                    }`}
                    title={wishlistIds.has(item.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
                  >
                    <Heart className={`h-4 w-4 transition-transform active:scale-125 ${
                      wishlistIds.has(item.id) ? 'fill-rose-500 text-rose-500' : ''
                    }`} />
                  </button>

                  {/* Availability Badge */}
                  <span className={`absolute top-3 right-3 text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded shadow-sm ${getStatusBadgeStyle(item.status)}`}>
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
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.category} • Condition: <span className="text-slate-400 font-medium">{item.item_condition}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Meetup location */}
                  <div className="flex items-center space-x-1.5 text-slate-400 text-xs mt-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{item.meetup_location}</span>
                  </div>
                </div>

                {/* Footer Details: Owner & Trust Score */}
                <div className="px-5 pb-5 pt-3 border-t border-[#242f4c] flex items-center justify-between bg-[#121828]/40">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">
                        {item.owner.name}
                      </p>
                      {/* Owner Trust Score Badge */}
                      <span 
                        title={`Verified Campus Trust Score: ${item.owner.trust_score}%`}
                        className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-bold"
                      >
                        <Star className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                        <span>{Math.round(item.owner.trust_score)}%</span>
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Resource Owner</p>
                  </div>

                  <Link
                    to={`/resources/${item.id}`}
                    className="flex items-center space-x-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition-all cursor-pointer shadow-sm"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/60 transition-all cursor-pointer shadow-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty Results State */
        <div className="text-center py-20 bg-[#161d30]/40 border border-[#242f4c] rounded-2xl p-8 space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Search className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-200">No matching resources found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              We couldn&apos;t find any resources matching your search or active filter criteria. Try adjusting your filters or search with different keywords.
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAllFilters}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear All Active Filters</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
