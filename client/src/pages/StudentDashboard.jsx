import React from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  ArrowRight, 
  TrendingUp, 
  Leaf, 
  ShieldCheck, 
  Clock, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const userStats = [
    { label: 'Active Listings', value: '3 Items', icon: PlusCircle, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Completed Swaps', value: '14 Trades', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Trust Rating', value: '98%', icon: ShieldCheck, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Carbon Saved', value: '18.4 kg', icon: Leaf, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  ];

  const recentListings = [
    { id: 1, title: 'Calculus: Early Transcendentals 8th Ed', type: 'Sell', price: '$35', date: '2 days ago' },
    { id: 2, title: 'Arduino Uno Starter Kit', type: 'Borrow', price: 'Free', date: '5 days ago' },
  ];

  const pendingRequests = [
    { id: 101, item: 'TI-84 Plus CE Graphing Calculator', requester: 'Jordan Vance', type: 'Borrow', duration: '14 days' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-indigo-950/40 to-slate-900/40 border border-[#242f4c] rounded-2xl p-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Hello, {user ? user.name : 'Student'}!</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your active campus resources, exchanges, and community impact.</p>
        </div>
        <Link 
          to="/resources/create"
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-indigo-600/15"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Resource</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {userStats.map((stat, index) => (
          <div key={index} className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl p-5 flex items-center space-x-4">
            <div className={`p-3.5 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Requests & Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pending Action Items */}
          <div className="bg-[#161d30]/50 border border-[#242f4c] rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-indigo-400" />
              <span>Pending Exchange Requests</span>
            </h2>
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-[#0d111c]/60 border border-[#242f4c] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded mb-2">
                    {req.type} Request
                  </span>
                  <h3 className="font-bold text-slate-200">{req.item}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Requested by <span className="text-slate-300 font-medium">{req.requester}</span> • Duration: {req.duration}</p>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button className="flex-grow sm:flex-none text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg transition-colors">
                    Accept
                  </button>
                  <button className="flex-grow sm:flex-none text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-colors">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Listings */}
          <div className="bg-[#161d30]/50 border border-[#242f4c] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-400" />
                <span>Your Active Listings</span>
              </h2>
              <Link to="/my-listings" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5">
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentListings.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b border-[#242f4c] last:border-b-0">
                  <div>
                    <h4 className="font-semibold text-slate-300 text-sm">{item.title}</h4>
                    <span className="text-xs text-slate-500">{item.date}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {item.type}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Mini Dashboard widgets */}
        <div className="space-y-6">
          
          {/* Trust Score Box */}
          <div className="bg-[#161d30]/50 border border-[#242f4c] rounded-2xl p-6">
            <h3 className="text-md font-bold text-slate-200 mb-3">Campus Badge System</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 bg-indigo-950/20 p-3 rounded-xl border border-indigo-500/10">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-400">
                  🌱
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Carbon Crusader</h4>
                  <p className="text-[11px] text-slate-400">Exchanged 10+ items instead of buying new.</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-indigo-950/20 p-3 rounded-xl border border-indigo-500/10">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center font-bold text-purple-400">
                  🤝
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Super Swapper</h4>
                  <p className="text-[11px] text-slate-400">Achieved a 95%+ trade response speed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 rounded-2xl p-6 text-center">
            <h3 className="font-extrabold text-slate-200 mb-2">Sustainability Insight</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              By borrowing or swapping components instead of purchasing new ones, you have prevented approximately 18.4 kg of electronic and paper waste this semester. Keep it up!
            </p>
            <Link to="/resources" className="inline-block text-xs font-semibold bg-[#0d111c] hover:bg-slate-900 border border-slate-700/60 hover:border-slate-600 px-4 py-2 rounded-xl text-slate-300 hover:text-white transition-all">
              Browse More Items
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
