import React from 'react';
import { 
  BookOpen, 
  Laptop, 
  Headphones, 
  Calculator, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  RotateCw, 
  Zap,
  GraduationCap,
  HeartHandshake
} from 'lucide-react';

/**
 * 3D-styled floating academic & technology visual composition for hero section.
 * Uses pure CSS transforms, layered glass surfaces, perspective, and micro-floating animations.
 */
export default function FloatingHeroVisual() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square flex items-center justify-center select-none">
      {/* Deep Ambient Background Glow Spheres */}
      <div className="absolute w-72 h-72 rounded-full bg-purple-600/25 blur-3xl -top-6 -left-6 animate-pulse-glow" />
      <div className="absolute w-72 h-72 rounded-full bg-blue-600/25 blur-3xl -bottom-6 -right-6 animate-pulse-glow delay-1000" />
      <div className="absolute w-56 h-56 rounded-full bg-cyan-500/20 blur-2xl top-1/3 right-1/4 animate-pulse-glow delay-500" />

      {/* Outer 3D Perspective Canvas */}
      <div className="relative w-full h-full [perspective:1200px] flex items-center justify-center">
        
        {/* Main Center Floating Glass Core Panel */}
        <div className="relative z-20 w-80 sm:w-96 rounded-3xl p-6 bg-[#111528]/85 backdrop-blur-2xl border border-indigo-500/30 shadow-[0_20px_60px_-15px_rgba(124,58,237,0.35)] transform [transform-style:preserve-3d] [transform:rotateY(-6deg)_rotateX(8deg)] hover:[transform:rotateY(0deg)_rotateX(0deg)] transition-transform duration-700 ease-out">
          
          {/* Card Top Pill */}
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide">Campus Resource</p>
                <p className="text-[10px] text-slate-400">Verified Peer Exchange</p>
              </div>
            </div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </span>
          </div>

          {/* Main Visual Display (Simulated High-End Academic Resource) */}
          <div className="relative h-40 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-[#182038] to-[#0d1224] border border-white/10 flex flex-col items-center justify-center p-4 overflow-hidden group">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#7C3AED_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* 3D Stacked Floating Icons */}
            <div className="relative z-10 flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 backdrop-blur-md flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-600/30 transform -rotate-6 group-hover:rotate-0 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-purple-600/40 border border-purple-400/50 backdrop-blur-md flex items-center justify-center text-purple-200 shadow-xl shadow-purple-600/40 transform scale-110 z-10">
                <Laptop className="h-7 w-7 text-white" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 backdrop-blur-md flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-600/30 transform rotate-6 group-hover:rotate-0 transition-transform">
                <Calculator className="h-6 w-6" />
              </div>
            </div>

            <p className="relative z-10 text-xs font-semibold text-slate-200 text-center">
              Algorithms & Embedded Systems Kit
            </p>
            <p className="relative z-10 text-[10px] text-indigo-300 font-mono mt-0.5">
              Available for Borrow & Swap
            </p>
          </div>

          {/* Card Bottom Meta */}
          <div className="mt-4 flex items-center justify-between text-xs pt-1">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-white">99% Trust</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Library Meetup</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              FREE / SWAP
            </span>
          </div>
        </div>

        {/* Floating Satellite 1: Top-Right Trust Badge */}
        <div className="absolute -top-3 -right-3 sm:-right-6 z-30 animate-float-slow">
          <div className="glass-panel-elevated rounded-2xl p-3.5 flex items-center space-x-3 border border-purple-500/40 shadow-[0_10px_30px_rgba(124,58,237,0.3)]">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Verified Peer</p>
              <p className="text-[10px] text-emerald-400 font-semibold">100% Secure Trade</p>
            </div>
          </div>
        </div>

        {/* Floating Satellite 2: Bottom-Left QR Handover Pill */}
        <div className="absolute -bottom-4 -left-3 sm:-left-6 z-30 animate-float-reverse">
          <div className="glass-panel-elevated rounded-2xl p-3.5 flex items-center space-x-3 border border-cyan-500/40 shadow-[0_10px_30px_rgba(6,182,212,0.25)]">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Zap className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Instant Handover</p>
              <p className="text-[10px] text-cyan-300 font-semibold">QR Code Verified</p>
            </div>
          </div>
        </div>

        {/* Floating Satellite 3: Floating Headphone / Audio Gadget Pill */}
        <div className="absolute top-1/4 -left-8 z-10 hidden sm:flex animate-float-slow delay-700">
          <div className="w-12 h-12 rounded-2xl bg-[#111528]/80 backdrop-blur-md border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-lg shadow-pink-500/20">
            <Headphones className="h-6 w-6" />
          </div>
        </div>

        {/* Floating Satellite 4: Floating Note / Stationery Pill */}
        <div className="absolute bottom-1/4 -right-8 z-10 hidden sm:flex animate-float-reverse delay-500">
          <div className="w-12 h-12 rounded-2xl bg-[#111528]/80 backdrop-blur-md border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/20">
            <FileText className="h-6 w-6" />
          </div>
        </div>

      </div>
    </div>
  );
}
