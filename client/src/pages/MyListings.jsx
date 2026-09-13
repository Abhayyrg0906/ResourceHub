import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit2, CheckSquare, ArrowRight, Image as ImageIcon, RotateCw, Clock, Archive, PlusCircle, Sparkles } from 'lucide-react';
import { getResources, archiveResource, updateResource, renewResource } from '../services/resourceService';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [renewingId, setRenewingId] = useState(null);

  // Load listings on mount or user change
  useEffect(() => {
    const fetchMyListings = async () => {
      if (!user) return;
      try {
        const res = await getResources({
          owner_id: user.id,
          status: 'ALL_INCLUSIVE'
        });
        if (res.success) {
          setListings(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch user listings:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [user]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to archive this resource?')) {
      try {
        const res = await archiveResource(id);
        if (res.success) {
          setListings(prev => prev.map(item => item.id === id ? { ...item, status: 'ARCHIVED' } : item));
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to archive listing.');
      }
    }
  };

  const handleRenew = async (item) => {
    setRenewingId(item.id);
    try {
      const res = await renewResource(item.id);
      if (res.success) {
        setListings(prev => prev.map(l => {
          if (l.id === item.id) {
            return { ...l, status: 'AVAILABLE', updated_at: new Date().toISOString() };
          }
          return l;
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to renew listing.');
    } finally {
      setRenewingId(null);
    }
  };

  const handleToggleExchanged = async (item) => {
    const nextStatus = item.status === 'AVAILABLE' ? 'EXCHANGED' : 'AVAILABLE';
    try {
      const payload = {
        title: item.title,
        description: item.description,
        category_id: item.category_id,
        exchange_type: item.exchange_type,
        price: item.price,
        item_condition: item.item_condition,
        meetup_location: item.meetup_location,
        status: nextStatus,
        image_url: item.image_url
      };

      const res = await updateResource(item.id, payload);
      if (res.success) {
        setListings(prev => prev.map(l => {
          if (l.id === item.id) {
            return { ...l, status: nextStatus };
          }
          return l;
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update listing status.');
    }
  };

  const filtered = listings.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Active') return item.status === 'AVAILABLE' || item.status === 'RESERVED';
    if (filter === 'Traded') return item.status === 'EXCHANGED';
    if (filter === 'Archived / Expired') return item.status === 'ARCHIVED';
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <SectionHeading
            badge="My Inventory"
            title="Resource Listings"
            subtitle="Manage, renew, and track your active offerings on campus."
          />
        </div>
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <Link
            to="/resources/create"
            className="flex-1 sm:flex-none text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-1.5 cursor-pointer hover:scale-[1.02]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>List Item</span>
          </Link>
          <Link 
            to="/exchange-requests"
            className="text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5"
          >
            <span>Incoming Requests</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-px overflow-x-auto">
        {['All', 'Active', 'Traded', 'Archived / Expired'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-xs sm:text-sm px-4 py-2.5 border-b-2 font-bold transition-all duration-200 -mb-px whitespace-nowrap cursor-pointer ${
              filter === tab
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table grid */}
      <GlassCard glowVariant="none" elevation="flat" className="overflow-hidden p-0 border border-white/10">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#090D18]/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                  <th className="p-4 sm:p-5">Resource Item</th>
                  <th className="p-4 sm:p-5">Category</th>
                  <th className="p-4 sm:p-5">Type</th>
                  <th className="p-4 sm:p-5">Terms</th>
                  <th className="p-4 sm:p-5">Status</th>
                  <th className="p-4 sm:p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 bg-[#090D18] flex items-center justify-center text-slate-500 flex-shrink-0 shadow-md">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <Link 
                            to={`/resources/${item.id}`}
                            className="font-bold text-slate-100 hover:text-indigo-400 transition-colors block truncate max-w-[200px]"
                          >
                            {item.title}
                          </Link>
                          {item.updated_at && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-slate-600" />
                              {new Date(item.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-400 font-medium">{item.category || 'General'}</td>
                    <td className="p-4 sm:p-5">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                        {item.exchange_type}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-200 font-bold">
                      {item.exchange_type === 'SELL' ? `₹${item.price}` : 'Free'}
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        item.status === 'AVAILABLE'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'RESERVED'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : item.status === 'ARCHIVED'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-700'
                      }`}>
                        {item.status === 'ARCHIVED' ? 'ARCHIVED / EXPIRED' : item.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right space-x-2 whitespace-nowrap">
                      {/* Renew / Reactivate button */}
                      <button
                        onClick={() => handleRenew(item)}
                        disabled={renewingId === item.id || item.status === 'EXCHANGED'}
                        title={item.status === 'ARCHIVED' ? 'Reactivate & Renew Listing' : 'Renew Listing (Reset Expiry Timer)'}
                        className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm ${
                          item.status === 'ARCHIVED'
                            ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'border-white/10 bg-[#090D18] text-emerald-400 hover:bg-emerald-500/20'
                        } ${renewingId === item.id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        <RotateCw className={`h-3.5 w-3.5 ${renewingId === item.id ? 'animate-spin' : ''}`} />
                        {item.status === 'ARCHIVED' && <span className="text-[11px] font-bold pr-1">Renew</span>}
                      </button>

                      {item.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleToggleExchanged(item)}
                          title={item.status === 'AVAILABLE' ? 'Mark as Exchanged' : 'Mark as Available'}
                          className="p-2 rounded-xl border border-white/10 bg-[#090D18] text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shadow-sm"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <Link
                        to={`/resources/${item.id}/edit`}
                        title="Edit Listing"
                        className="p-2 rounded-xl border border-white/10 bg-[#090D18] text-indigo-400 hover:text-white hover:bg-indigo-600/30 transition-colors inline-block align-middle shadow-sm"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Link>

                      {item.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Archive Listing"
                          className="p-2 rounded-xl border border-white/10 bg-[#090D18] text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 space-y-3">
            <p className="text-sm font-semibold">You do not have any listings in this category.</p>
            <Link
              to="/resources/create"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-400 hover:underline"
            >
              <span>Publish your first listing now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
