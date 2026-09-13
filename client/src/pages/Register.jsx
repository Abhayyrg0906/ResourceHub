import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, CheckCircle, AlertCircle, GraduationCap, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/ui/GlassCard';
import GradientText from '../components/ui/GradientText';
import AnimatedButton from '../components/ui/AnimatedButton';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await register({
      name,
      email,
      password,
      department,
      year_of_study: parseInt(yearOfStudy, 10)
    });
    setLoading(false);

    if (result.success) {
      setMessage(result.message || 'Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-10 relative">
      {/* Ambient Glows */}
      <div className="absolute w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div className="w-full max-w-lg relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2.5 group mb-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-2xl bg-[#080A12] flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-extrabold text-white font-heading">
            Join <GradientText gradient="accent">ResourceHub</GradientText>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Create a verified peer exchange account with your student email</p>
        </div>

        {/* Glass Register Card */}
        <GlassCard variant="elevated" className="border-indigo-500/30 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          
          {message && (
            <div className="mb-6 flex items-start space-x-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-xs font-semibold animate-fade-in">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-start space-x-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-xs font-semibold animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#080A12] border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                />
              </div>
            </div>

            {/* University Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                University Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.m@university.edu"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#080A12] border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>Verified academic domains required</span>
              </p>
            </div>

            {/* Department & Year of Study */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Department / Major
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                    <Building className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Computer Science"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#080A12] border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Year of Study
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#080A12] border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl text-white text-sm outline-none transition-all cursor-pointer"
                >
                  <option value="1" className="bg-[#111528] text-white">Year 1 (Freshman)</option>
                  <option value="2" className="bg-[#111528] text-white">Year 2 (Sophomore)</option>
                  <option value="3" className="bg-[#111528] text-white">Year 3 (Junior)</option>
                  <option value="4" className="bg-[#111528] text-white">Year 4 (Senior)</option>
                  <option value="5" className="bg-[#111528] text-white">Graduate / Masters</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#080A12] border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <AnimatedButton
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-3 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              Create Student Account
            </AnimatedButton>
          </form>

          <div className="mt-5 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
                Sign in here
              </Link>
            </p>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
