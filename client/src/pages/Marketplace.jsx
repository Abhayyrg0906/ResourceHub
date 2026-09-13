import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  AlertTriangle, 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Sparkles,
  ArrowUpDown, 
  Filter, 
  PlusCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getCategories, getResources } from '../services/resourceService';
import wishlistService from '../services/wishlistService';
import { useAuth } from '../context/AuthContext';
import RecommendationsSection from '../components/RecommendationsSection';
import ResourceCard from '../components/ui/ResourceCard';
import FilterPills from '../components/ui/FilterPills';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';
import AnimatedButton from '../components/ui/AnimatedButton';

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
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Debounce price and location inputs (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
      setDebouncedMaxPrice(maxPrice);
      setDebouncedLocation(locationTerm);
      setCurrentPage(1);
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

    const inWish = wishlistIds.has(resourceId);
    try {
      if (inWish) {
        await wishlistService.removeFromWishlist(resourceId);
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
      } else {
        await wishlistService.addToWishlist(resourceId);
        setWishlistIds(prev => new Set(prev).add(resourceId));
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  // 1. Fetch Categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await getCategories();
        if (res && res.success) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCats();
  }, []);

  // 2. Fetch Resources
  const fetchResourceList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 12,
        sort
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedType !== 'All') params.exchange_type = selectedType;
      if (selectedCondition !== 'All') params.condition = selectedCondition;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (debouncedMinPrice.trim()) params.min_price = debouncedMinPrice.trim();
      if (debouncedMaxPrice.trim()) params.max_price = debouncedMaxPrice.trim();
      if (debouncedLocation.trim()) params.location = debouncedLocation.trim();

      const res = await getResources(params);
      if (res && res.success) {
        setResources(res.data);
        setPagination(res.pagination);
      } else {
        setError(res?.message || 'Failed to retrieve marketplace resources.');
      }
    } catch (err) {
      console.error('Marketplace fetch error:', err);
      setError(err.response?.data?.message || 'Network error while fetching listings.');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    selectedCategory,
    selectedType,
    selectedCondition,
    selectedStatus,
    debouncedMinPrice,
    debouncedMaxPrice,
    debouncedLocation,
    sort
  ]);

  useEffect(() => {
    fetchResourceList();
  }, [fetchResourceList]);

  // Reset Filters Handler
  const handleResetFilters = () => {
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

  const exchangeTypeOptions = [
    { value: 'All', label: 'All Modes' },
    { value: 'SELL', label: 'Sell' },
    { value: 'BORROW', label: 'Borrow' },
    { value: 'DONATE', label: 'Donate' },
    { value: 'SWAP', label: 'Swap' }
  ];

  const categoryOptions = [
    { value: 'All', label: 'All Categories' },
    ...categories.map(c => ({ value: c.slug || c.name, label: c.name }))
  ];

  return (
    <div className="space-y-10 pb-16">
      
      {/* 1. HERO SEARCH & TITLE */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <SectionHeading
          badge="Live Campus Marketplace"
          badgeIcon={BookOpen}
          title="Explore Peer"
          highlight="Academic Listings"
          subtitle="Discover textbooks, calculators, test equipment, and notes shared by verified peers on your campus."
        />

        {/* Large Prominent Glass Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-5 h-5 w-5 text-indigo-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, author, edition, or course code (e.g. Physics, TI-84)..."
              className="w-full pl-13 pr-12 py-4 rounded-2xl bg-[#111528]/80 backdrop-blur-2xl border border-white/10 hover:border-indigo-500/40 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-white placeholder-slate-400 text-sm sm:text-base outline-none transition-all shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MODERN FILTER PILLS STRIP */}
      <div className="space-y-4 max-w-7xl mx-auto">
        
        {/* Exchange Type Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Type:</span>
            <FilterPills
              options={exchangeTypeOptions}
              selected={selectedType}
              onSelect={(val) => {
                setSelectedType(val);
                setCurrentPage(1);
              }}
              size="sm"
            />
          </div>

          <div className="flex items-center space-x-3">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showFilters
                  ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/30'
                  : 'bg-[#111528] text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 bg-[#111528] px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300">
              <ArrowUpDown className="h-3.5 w-3.5 text-indigo-400" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="latest" className="bg-[#111528] text-white">Latest Listings</option>
                <option value="price_asc" className="bg-[#111528] text-white">Price: Low to High</option>
                <option value="price_desc" className="bg-[#111528] text-white">Price: High to Low</option>
                <option value="oldest" className="bg-[#111528] text-white">Oldest Listings</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="overflow-x-auto pb-2">
          <FilterPills
            options={categoryOptions}
            selected={selectedCategory}
            onSelect={(val) => {
              setSelectedCategory(val);
              setCurrentPage(1);
            }}
            size="sm"
          />
        </div>

        {/* Expandable Advanced Filters Tray */}
        {showFilters && (
          <GlassCard variant="default" className="border-indigo-500/30 p-5 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Item Condition</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => {
                    setSelectedCondition(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#080A12] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                >
                  <option value="All">All Conditions</option>
                  <option value="NEW">Brand New</option>
                  <option value="LIKE_NEW">Like New</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Availability Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#080A12] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                >
                  <option value="AVAILABLE">Available Only</option>
                  <option value="All">All Statuses</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="EXCHANGED">Exchanged</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Price Range ($)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 rounded-xl bg-[#080A12] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 rounded-xl bg-[#080A12] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Location Term */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Campus Location</label>
                <input
                  type="text"
                  value={locationTerm}
                  onChange={(e) => setLocationTerm(e.target.value)}
                  placeholder="e.g. Library, Union..."
                  className="w-full px-3 py-2 rounded-xl bg-[#080A12] border border-white/10 text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

            </div>

            {/* Clear Filters Action */}
            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1.5 text-xs text-indigo-300 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </GlassCard>
        )}

      </div>

      {/* 3. RECOMMENDATIONS SECTION (Personalized AI-Assisted) */}
      <RecommendationsSection onToggleWishlist={handleToggleWishlist} />

      {/* 4. RESOURCE GRID */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white font-heading">
            {pagination ? `${pagination.total} Available Listings` : 'Marketplace Resources'}
          </h3>
          <Link to="/resources/create">
            <AnimatedButton variant="primary" size="sm" icon={PlusCircle}>
              List Resource
            </AnimatedButton>
          </Link>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 rounded-3xl bg-[#111528]/50 border border-white/5" />
            ))}
          </div>
        ) : error ? (
          <GlassCard variant="default" className="text-center py-12 max-w-lg mx-auto border-rose-500/30">
            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-white mb-1">Failed to Load Resources</h4>
            <p className="text-xs text-slate-400 mb-4">{error}</p>
            <AnimatedButton variant="secondary" size="sm" onClick={fetchResourceList}>
              Retry Query
            </AnimatedButton>
          </GlassCard>
        ) : resources.length === 0 ? (
          <GlassCard variant="default" className="text-center py-16 max-w-lg mx-auto border-white/10">
            <BookOpen className="h-12 w-12 text-indigo-400/50 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-white mb-2">No Matching Resources Found</h4>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              We couldn't find any listings matching your search or filters. Try adjusting your query or be the first to share!
            </p>
            <div className="flex justify-center gap-3">
              <AnimatedButton variant="secondary" size="sm" onClick={handleResetFilters}>
                Clear Filters
              </AnimatedButton>
              <Link to="/resources/create">
                <AnimatedButton variant="primary" size="sm">
                  Create Listing
                </AnimatedButton>
              </Link>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                inWishlist={wishlistIds.has(resource.id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center space-x-2 pt-10">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl bg-[#111528] border border-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {[...Array(pagination.pages)].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-[#111528] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={currentPage === pagination.pages}
              className="p-2.5 rounded-xl bg-[#111528] border border-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
