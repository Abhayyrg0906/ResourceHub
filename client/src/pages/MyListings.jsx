import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit2, CheckSquare, ListFilter, ArrowRight } from 'lucide-react';

const initialListings = [
  { id: 1, title: 'Calculus: Early Transcendentals 8th Ed', category: 'Textbooks', type: 'Sell', value: '$35', status: 'Active' },
  { id: 2, title: 'Arduino Uno Starter Kit', category: 'Electronics', type: 'Borrow', value: 'Free', status: 'Active' },
  { id: 3, title: 'Organic Chemistry Lab Manual', category: 'Textbooks', type: 'Donate', value: 'Free', status: 'Traded' }
];

export default function MyListings() {
  const [listings, setListings] = useState(initialListings);
  const [filter, setFilter] = useState('All');

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      setListings(listings.filter(item => item.id !== id));
    }
  };

  const handleMarkTraded = (id) => {
    setListings(listings.map(item => {
      if (item.id === id) {
        return { ...item, status: item.status === 'Active' ? 'Traded' : 'Active' };
      }
      return item;
    }));
  };

  const filtered = listings.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Active') return item.status === 'Active';
    if (filter === 'Traded') return item.status === 'Traded';
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Resource Listings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and track items you have made available for the campus community.</p>
        </div>
        <Link 
          to="/my-requests"
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
                      <span className="font-semibold text-slate-200 block">{item.title}</span>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-400">{item.category}</td>
                    <td className="p-4 sm:p-5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-indigo-300">
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-300 font-medium">{item.value}</td>
                    <td className="p-4 sm:p-5">
                      <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-700/30 text-slate-500 border border-slate-700/40'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleMarkTraded(item.id)}
                          title="Toggle Exchanged Status"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-[#1f2942] border border-slate-700/60 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => alert('Mock editing layout.')}
                          title="Edit Listing"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-[#1f2942] border border-slate-700/60 hover:border-slate-500 text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete Listing"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/15 border border-slate-700/60 hover:border-rose-500/40 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">No listings found matching this status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
