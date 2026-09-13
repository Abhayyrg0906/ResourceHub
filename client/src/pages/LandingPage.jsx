import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Leaf, 
  ShieldCheck, 
  Users, 
  RotateCw, 
  ShoppingBag, 
  HeartHandshake,
  QrCode,
  Sparkles,
  Zap,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import FloatingHeroVisual from '../components/ui/FloatingHeroVisual';
import GradientText from '../components/ui/GradientText';
import SectionHeading from '../components/ui/SectionHeading';
import GlassCard from '../components/ui/GlassCard';
import AnimatedButton from '../components/ui/AnimatedButton';

export default function LandingPage() {
  const stats = [
    { label: 'Verified Students', value: '4,800+', icon: Users, color: 'text-indigo-400', glow: 'purple' },
    { label: 'Resources Exchanged', value: '12,500+', icon: RotateCw, color: 'text-purple-400', glow: 'blue' },
    { label: 'Handover Security', value: '100% QR Verified', icon: ShieldCheck, color: 'text-cyan-400', glow: 'cyan' },
    { label: 'CO2 Offset (Estimated)', value: '6.4 Tonnes', icon: Leaf, color: 'text-emerald-400', glow: 'purple' },
  ];

  const exchangeTypes = [
    {
      title: 'SELL',
      desc: 'Monetize previous semester textbooks, calculators, and lab kits directly to peer students.',
      icon: ShoppingBag,
      tag: 'CASHLESS OR DIRECT',
      accentColor: 'border-blue-500/30 hover:border-blue-500/60',
      badgeBg: 'bg-blue-500/15 text-blue-400',
      glow: 'blue'
    },
    {
      title: 'BORROW',
      desc: 'Need lab gear or expensive reference guides for a single term? Borrow safely from campus classmates.',
      icon: RotateCw,
      tag: 'TEMPORARY DURATION',
      accentColor: 'border-cyan-500/30 hover:border-cyan-500/60',
      badgeBg: 'bg-cyan-500/15 text-cyan-400',
      glow: 'cyan'
    },
    {
      title: 'DONATE',
      desc: 'Give unused study materials, stationery, and drafting sets to juniors. Foster campus sustainability.',
      icon: HeartHandshake,
      tag: 'FREE GIFT',
      accentColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      badgeBg: 'bg-emerald-500/15 text-emerald-400',
      glow: 'purple'
    },
    {
      title: 'SWAP',
      desc: 'Direct item-for-item exchange. Trade your completed course textbooks for next semester’s requirements.',
      icon: Zap,
      tag: 'ITEM-FOR-ITEM',
      accentColor: 'border-purple-500/30 hover:border-purple-500/60',
      badgeBg: 'bg-purple-500/15 text-purple-400',
      glow: 'pink'
    }
  ];

  const trustHighlights = [
    'University Email Domain Verification for all students',
    'Encrypted QR-Code In-Person Handover Verification',
    'Peer Review and Dynamic 100% Trust Scoring System',
    'Campus Safe Meetup Location Directory & Interactive Maps'
  ];

  return (
    <div className="relative overflow-hidden pt-4 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[75vh] mb-24">
        
        {/* Left Editorial Copy */}
        <div className="lg:col-span-7 text-center lg:text-left space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Next-Gen Campus Exchange Platform</span>
          </div>

          {/* Oversized Headline */}
          <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-[1.08] font-heading">
            Exchange What You Have.{' '}
            <br />
            <GradientText gradient="accent">
              Get What You Need.
            </GradientText>
          </h1>

          {/* Supporting Text */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            A smarter way for students to sell, borrow, donate and swap academic resources.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
            <Link to="/resources">
              <AnimatedButton
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className="shadow-[0_0_25px_rgba(124,58,237,0.4)]"
              >
                Explore Resources
              </AnimatedButton>
            </Link>

            <Link to="/resources/create">
              <AnimatedButton
                variant="secondary"
                size="lg"
              >
                Start Sharing
              </AnimatedButton>
            </Link>
          </div>

          {/* Micro Trust Indicators */}
          <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Verified University Students</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <QrCode className="h-4 w-4 text-cyan-400" />
              <span>QR Handover Verification</span>
            </div>
          </div>
        </div>

        {/* Right 3D Visual Composition */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <FloatingHeroVisual />
        </div>

      </section>

      {/* 2. STATS COUNTER STRIP */}
      <section className="max-w-7xl mx-auto mb-28">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => (
            <GlassCard
              key={idx}
              variant="default"
              className="border border-white/10 hover:border-indigo-500/40 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl bg-[#080A12] border border-white/10 ${stat.color} shadow-inner`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-400 font-medium tracking-wide">
                    {stat.label}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 3. EXCHANGE TYPES SECTION */}
      <section className="max-w-7xl mx-auto mb-28">
        <SectionHeading
          badge="4 Flexible Modes"
          badgeIcon={RotateCw}
          title="Designed for Every"
          highlight="Academic Need"
          subtitle="Whether you want to clear shelf space, save hundreds of dollars, or help a junior student, ResourceHub offers the right exchange type."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {exchangeTypes.map((type, idx) => (
            <GlassCard
              key={idx}
              variant="interactive"
              className={`border ${type.accentColor} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl bg-[#080A12] border border-white/10 ${type.badgeBg}`}>
                    <type.icon className="h-6 w-6" />
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${type.badgeBg}`}>
                    {type.tag}
                  </span>
                </div>

                <h3 className="text-2xl font-extrabold text-white mb-2.5 font-heading">
                  {type.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {type.desc}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-indigo-300 font-semibold group-hover:text-white">
                <span>Browse {type.title} Listings</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 4. VERIFIED TRUST & SAFETY SHOWCASE */}
      <section className="max-w-6xl mx-auto mb-24">
        <GlassCard
          variant="neon"
          className="border-indigo-500/30 p-8 sm:p-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Zero Scams • Campus Protected</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading">
                Safe, Transparent &amp; <br />
                <GradientText gradient="cyan">Built for Trust</GradientText>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Campus trading shouldn't be risky. ResourceHub eliminates anonymous interactions with student verified emails, physical campus hub meetups, and cryptographically verified QR handover confirmations.
              </p>

              <div className="space-y-3 pt-2">
                {trustHighlights.map((item, i) => (
                  <div key={i} className="flex items-center space-x-3 text-sm text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-[#080A12]/90 border border-white/10 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <QrCode className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white font-heading">Instant Handover Verification</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Scan the dynamic QR code on handover to finalize exchanges and automatically build peer trust scores.
              </p>
              <Link to="/register" className="w-full">
                <AnimatedButton variant="cyan" size="md" className="w-full">
                  Create Verified Account
                </AnimatedButton>
              </Link>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="max-w-5xl mx-auto text-center">
        <GlassCard
          variant="elevated"
          className="border-indigo-500/40 p-10 sm:p-14 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-cyan-600/10 pointer-events-none" />
          
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 font-heading">
            Ready to Clean Your Desk &amp; <br />
            <GradientText gradient="accent">Save On Academics?</GradientText>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-8">
            Join thousands of verified university students swapping textbooks, calculators, and lab gear today.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <AnimatedButton variant="primary" size="lg">
                Get Started Free
              </AnimatedButton>
            </Link>
            <Link to="/resources">
              <AnimatedButton variant="secondary" size="lg">
                Browse Marketplace
              </AnimatedButton>
            </Link>
          </div>
        </GlassCard>
      </section>

    </div>
  );
}
