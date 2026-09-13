import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { getCategories, getResourceById, updateResource } from '../services/resourceService';
import { useAuth } from '../context/AuthContext';
import ImageUploader from '../components/ImageUploader';
import CampusLocationPicker from '../components/CampusLocationPicker';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';

export default function EditResource() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [status, setStatus] = useState('AVAILABLE');
  const [images, setImages] = useState([]);

  // Fetch categories and resource details
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch categories
        const catRes = await getCategories();
        if (catRes.success) {
          setCategories(catRes.data);
        }

        // Fetch resource details
        const resourceRes = await getResourceById(id);
        if (resourceRes.success) {
          const resData = resourceRes.data;
          
          // Ownership verification
          if (user && resData.owner.id !== user.id) {
            setError('Access Denied. You do not own this resource listing.');
            setLoading(false);
            return;
          }

          setTitle(resData.title);
          setDescription(resData.description);
          setCategoryId(resData.category_id);
          setExchangeType(resData.exchange_type);
          setPrice(resData.price !== null ? resData.price.toString() : '');
          setItemCondition(resData.item_condition);
          setMeetupLocation(resData.meetup_location);
          setStatus(resData.status);
          
          setImages(resData.images || []);
        }
      } catch (err) {
        console.error('Failed to initialize edit screen:', err.message);
        if (err.response && err.response.status === 403) {
          setError('You do not have permission to edit this resource.');
        } else {
          setError(err.response?.data?.message || 'Failed to load resource data.');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [id, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Pre-validations
    if (exchangeType === 'SELL') {
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        setError('Price must be a valid positive number for SELL listings.');
        setSaving(false);
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
        status,
        images: images.map(img => ({
          image_url: img.image_url,
          is_primary: Boolean(img.is_primary)
        })),
        image_url: images.find(img => img.is_primary)?.image_url || (images[0]?.image_url || null)
      };

      const res = await updateResource(id, payload);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/resources/${id}`);
        }, 1800);
      }
    } catch (err) {
      console.error('Update listing failed:', err.message);
      if (err.response && err.response.status === 403) {
        setError('You do not have permission to edit this resource.');
      } else {
        setError(err.response?.data?.message || 'Failed to update resource.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-8 px-4 sm:px-0">
      {/* Back button */}
      <Link 
        to={`/resources/${id}`} 
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 text-indigo-400 group-hover:-translate-x-1 transition-transform" />
        <span>Cancel & Go Back</span>
      </Link>

      <GlassCard glowVariant="purple" elevation="elevated" className="p-6 sm:p-10 relative overflow-hidden">
        <div className="mb-8 space-y-2">
          <SectionHeading
            badge="Edit Listing"
            title="Update Resource Details"
            subtitle="Modify terms, pricing, meetup hub, images, or availability status."
          />
        </div>

        {success ? (
          <div className="text-center py-16 space-y-5 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 animate-bounce">
              <CheckCircle className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Listing Updated!</h2>
              <p className="text-slate-300 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                Your changes have been saved. Redirecting to resource details page...
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

            {/* Form fields only render if user is authorized */}
            {(!error || !error.includes('Denied')) && (
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
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
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

                {/* Price */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                    {exchangeType === 'SELL' ? 'Price (₹) *' : 'Exchange Value'}
                  </label>
                  <input
                    type="text"
                    disabled={exchangeType !== 'SELL'}
                    value={exchangeType !== 'SELL' ? 'Free Transfer' : price}
                    onChange={(e) => setPrice(e.target.value)}
                    required={exchangeType === 'SELL'}
                    className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 disabled:opacity-50 text-sm shadow-inner font-semibold"
                  />
                </div>

                {/* Status Select */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                    Listing Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-200 outline-none transition-all duration-300 text-sm cursor-pointer shadow-inner"
                  >
                    <option value="AVAILABLE">AVAILABLE (Active in Marketplace)</option>
                    <option value="RESERVED">RESERVED (Exchange in Progress)</option>
                    <option value="EXCHANGED">EXCHANGED (Completed)</option>
                    <option value="ARCHIVED">ARCHIVED (Inactive)</option>
                  </select>
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
                    rows="4"
                    required
                    className="w-full px-4 py-3.5 bg-[#090D18]/90 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 resize-none text-sm shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="sm:col-span-2 w-full mt-2 flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-600/25 hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 cursor-pointer text-sm uppercase tracking-wider"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>

              </div>
            )}
          </form>
        )}
      </GlassCard>
    </div>
  );
}
