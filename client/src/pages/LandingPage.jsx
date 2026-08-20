import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Leaf, 
  ShieldCheck, 
  Users, 
  RotateCw,
  ShoppingBag,
  HeartHandshake
} from 'lucide-react';

export default function LandingPage() {
  const stats = [
    { label: 'Verified Students', value: '4,800+', icon: Users, color: 'text-indigo-400' },
    { label: 'Resources Exchanged', value: '12,500+', icon: RotateCw, color: 'text-purple-400' },
    { label: 'CO2 Offset (Estimated)', value: '6.4 Tonnes', icon: Leaf, color: 'text-emerald-400' },
  ];

  const features = [
    { title: 'Buy & Sell', desc: 'Find discounted textbooks, calculators, and lab gear directly from peers.', icon: ShoppingBag, color: 'bg-indigo-500/10 text-indigo-400' },
    { title: 'Borrow & Swap', desc: 'Exchange components or books for a semester. Save money and storage space.', icon: RotateCw, color: 'bg-purple-500/10 text-purple-400' },
    { title: 'Donate & Support', desc: 'Pass along unused school supplies, stationery, and lab coats to junior students.', icon: HeartHandshake, color: 'bg-pink-500/10 text-pink-400' },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse delay-700" />

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center pt-8 pb-16">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-3 py-1 mb-6 text-sm text-indigo-300 font-medium">
          <Leaf className="h-4 w-4 text-emerald-400" />
          <span>Eco-Friendly Campus Exchange</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          The Smart Way to Source <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Campus Academics
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          ResourceHub is a campus-focused platform where verified college students buy, sell, borrow, swap, or donate academic items—from textbooks and calculators to laboratory gear and project parts.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link 
            to="/resources" 
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:scale-105"
          >
            <span>Explore Marketplace</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link 
            to="/register" 
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 hover:scale-105"
          >
            <span>Join ResourceHub</span>
          </Link>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#161d30]/60 backdrop-blur-sm border border-[#242f4c] rounded-2xl p-6 flex items-center space-x-4">
            <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center text-slate-100 mb-12">
          Designed for Smart Student Exchanges
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="group bg-[#161d30]/40 hover:bg-[#161d30]/80 border border-[#242f4c] hover:border-indigo-500/40 rounded-2xl p-6 transition-all duration-300">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 font-bold ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-indigo-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Verification Trust */}
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 mt-1">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">Verified Student-Only Workspace</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Only students with valid university email addresses can list or trade. Physical exchanges occur right on campus with QR-code based trade verification for extra safety.
            </p>
          </div>
        </div>
        <Link 
          to="/register" 
          className="whitespace-nowrap bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-3 rounded-xl font-semibold transition-colors shadow-md"
        >
          Verify Email
        </Link>
      </div>
    </div>
  );
}
