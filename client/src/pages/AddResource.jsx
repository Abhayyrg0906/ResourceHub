import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowLeft, CheckCircle, AlertCircle, Sparkles, Tag, DollarSign, Layers } from 'lucide-react';
import { getCategories, createResource } from '../services/resourceService';
import ImageUploader from '../components/ImageUploader';
import CampusLocationPicker from '../components/CampusLocationPicker';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';
import GradientText from '../components/ui/GradientText';

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
        }, 1800);
      }
    } catch (err) {
      console.error('Create listing failed:', err.message);
      setError(err.response?.data?.message || 'Failed to list resource. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-8 px-4 sm:px-0">
      {/* Back Navigation */}
      <Link 
        to="/resources" 
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 text-indigo-400 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Marketplace</span>
      </Link>

      <GlassCard glowVariant="purple" elevation="elevated" className="p-6 sm:p-10 relative overflow-hidden">
        {/* Glow ambient circle */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="mb-8 space-y-2">
          <SectionHeading
            badge="List New Item"
            title="Publish a Campus Resource"
            subtitle="Make textbooks, electronics, lab equipment, or calculators available for verified peers."
          />
        </div>

        {success ? (
          <div className="text-center py-16 space-y-5 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 animate-bounce">
              <CheckCircle className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Listing Published!</h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                Your resource is now live on the student marketplace. Redirecting you to browse listings...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 text-xs animate-fadeIn">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Title */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                  Resource Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. TI-84 Plus CE Graphing Calculator, Chemistry Lab Coat (L)"
                  required
                  className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 text-sm shadow-inner"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-200 outline-none transition-all duration-300 text-sm cursor-pointer shadow-inner"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                  Condition *
                </label>
                <select
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-200 outline-none transition-all duration-300 text-sm cursor-pointer shadow-inner"
                >
                  <option value="NEW">New (Unopened / Pristine)</option>
                  <option value="LIKE_NEW">Like New (Barely used)</option>
                  <option value="GOOD">Good (Minor wear)</option>
                  <option value="FAIR">Fair (Noticeable wear)</option>
                  <option value="POOR">Poor (Functional only)</option>
                </select>
              </div>

              {/* Exchange Type */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                  Exchange Mode *
                </label>
                <select
                  value={exchangeType}
                  onChange={(e) => setExchangeType(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-200 outline-none transition-all duration-300 text-sm cursor-pointer shadow-inner font-semibold text-indigo-300"
                >
                  <option value="SELL">SELL (Campus Cash)</option>
                  <option value="BORROW">BORROW (Temporary Loan)</option>
                  <option value="SWAP">SWAP (Item for Item)</option>
                  <option value="DONATE">DONATE (Free Gift)</option>
                </select>
              </div>

              {/* Price/Details */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                  {exchangeType === 'SELL' ? 'Price (₹) *' : 'Exchange Value'}
                </label>
                <input
                  type="text"
                  disabled={exchangeType !== 'SELL'}
                  value={exchangeType !== 'SELL' ? 'Free Transfer' : price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={exchangeType === 'SELL' ? 'e.g. 450' : 'Free Transfer'}
                  required={exchangeType === 'SELL'}
                  className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 disabled:opacity-50 text-sm shadow-inner font-semibold"
                />
              </div>

              {/* Images Upload */}
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
                  label="Preferred Campus Handover Hub"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                  Detailed Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="State any details, notes, edition info, highlighting, missing accessories, or preferred meetup hours."
                  rows="4"
                  required
                  className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 resize-none text-sm shadow-inner"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-600/25 hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 cursor-pointer text-sm uppercase tracking-wider"
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
      </GlassCard>
    </div>
  );
}
