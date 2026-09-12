import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { getCategories, createResource } from '../services/resourceService';
import ImageUploader from '../components/ImageUploader';
import CampusLocationPicker from '../components/CampusLocationPicker';

export default function AddResource() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [exchangeType, setExchangeType] = useState('SELL');
  const [price, setPrice] = useState('');
  const [itemCondition, setItemCondition] = useState('GOOD');
  const [meetupLocation, setMeetupLocation] = useState('');
  const [images, setImages] = useState([]);

  const navigate = useNavigate();

  // Load Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getCategories();
        if (res.success) {
          setCategories(res.data);
          if (res.data.length > 0) {
            setCategoryId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load categories:', err.message);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Pre-validations
    if (exchangeType === 'SELL') {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        setError('Price must be a valid positive number for SELL listings.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title,
        description,
        category_id: parseInt(categoryId, 10),
        exchange_type: exchangeType,
        price: exchangeType === 'SELL' ? parseFloat(price) : null,
        item_condition: itemCondition,
        meetup_location: meetupLocation,
        images: images.map(img => ({
          image_url: img.image_url,
          is_primary: Boolean(img.is_primary)
        })),
        image_url: images.find(img => img.is_primary)?.image_url || (images[0]?.image_url || null)
      };

      const res = await createResource(payload);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/resources');
        }, 2000);
      }
    } catch (err) {
      console.error('Create listing failed:', err.message);
      setError(err.response?.data?.message || 'Failed to list resource. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6 bg-[#161d30]/60 border border-[#242f4c] rounded-3xl p-6 md:p-8 shadow-xl relative">
      {/* Back Link */}
      <Link to="/resources" className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Resources</span>
      </Link>

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
          {error && (
            <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm animate-fadeIn">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 text-sm"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none transition-all duration-300 text-sm"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Condition</label>
              <select
                value={itemCondition}
                onChange={(e) => setItemCondition(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none transition-all duration-300 text-sm"
              >
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>

            {/* Exchange Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Exchange Type</label>
              <select
                value={exchangeType}
                onChange={(e) => setExchangeType(e.target.value)}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none transition-all duration-300 text-sm"
              >
                <option value="SELL">Sell (Cash/Points)</option>
                <option value="BORROW">Borrow (Free Loan)</option>
                <option value="SWAP">Swap (Exchange)</option>
                <option value="DONATE">Donate (Gift)</option>
              </select>
            </div>

            {/* Price/Details (Conditional on type) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                {exchangeType === 'SELL' ? 'Price ($)' : 'Exchange Value'}
              </label>
              <input
                type="text"
                disabled={exchangeType !== 'SELL'}
                value={exchangeType !== 'SELL' ? 'Free' : price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={exchangeType === 'SELL' ? 'e.g. 25' : 'Free'}
                required={exchangeType === 'SELL'}
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 disabled:opacity-50 text-sm"
              />
            </div>

            {/* Images Upload / Gallery Selection */}
            <div className="sm:col-span-2">
              <ImageUploader
                images={images}
                onChange={setImages}
                maxImages={5}
              />
            </div>

            {/* Meetup location */}
            <div className="sm:col-span-2">
              <CampusLocationPicker
                value={meetupLocation}
                onChange={setMeetupLocation}
                required={true}
                label="Preferred Handover Location"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Detailed Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="State any details, notes, highlighting, missing components, or meet-up preferences."
                rows="4"
                required
                className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 resize-none text-sm"
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
