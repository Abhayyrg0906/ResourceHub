import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit2, CheckSquare, ArrowRight, Image } from 'lucide-react';
import { getResources, archiveResource, updateResource } from '../services/resourceService';
import { useAuth } from '../context/AuthContext';

export default function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  // Load listings on mount or user change
  useEffect(() => {
    const fetchMyListings = async () => {
      if (!user) return;
      try {
        const res = await getResources({
          owner_id: user.id,
          status: 'ALL'
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
          setListings(prev => prev.filter(item => item.id !== id));
          alert('Resource archived successfully.');
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete listing.');
      }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Resource Listings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and track items you have made available for the campus community.</p>
        </div>
        <Link 
          to="/exchange-requests"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1"
        >
          <span>Incoming Requests</span>
          <ArrowRight className="h-4.5 w-4.5" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#242f4c] pb-px">
        {['All', 'Active', 'Traded'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`text-sm px-4 py-2 border-b-2 font-semibold transition-all duration-200 -mb-px ${
              filter === tab
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table grid */}
      <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl overflow-hidden shadow-lg">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#242f4c] bg-[#0d111c]/40 text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  <th className="p-4 sm:p-5">Resource Item</th>
                  <th className="p-4 sm:p-5">Category</th>
                  <th className="p-4 sm:p-5">Type</th>
                  <th className="p-4 sm:p-5">Price/Terms</th>
                  <th className="p-4 sm:p-5">Status</th>
                  <th className="p-4 sm:p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242f4c] text-sm">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-[#161d30]/80 transition-colors">
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900 flex items-center justify-center text-slate-600 flex-shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Image className="h-4 w-4" />
                          )}
                        </div>
                        <span className="font-semibold text-slate-200 block truncate max-w-[200px]">{item.title}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-400">{item.category}</td>
                    <td className="p-4 sm:p-5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-indigo-300">
                        {item.exchange_type}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-300 font-medium">
                      {item.exchange_type === 'SELL' ? `₹${item.price}` : 'Free'}
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'RESERVED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right space-x-2">
                      <button
                        onClick={() => handleToggleExchanged(item)}
                        title={item.status === 'AVAILABLE' ? 'Mark as Exchanged' : 'Mark as Available'}
                        className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/resources/${item.id}/edit`}
                        title="Edit Listing"
                        className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 text-indigo-400 hover:text-indigo-300 transition-colors inline-block align-middle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete Listing"
                        className="p-1.5 rounded-lg border border-slate-700/80 bg-[#1f1922] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <p>You do not have any listings in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
