import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, CheckCircle, AlertCircle, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/ui/GlassCard';
import GradientText from '../components/ui/GradientText';
import AnimatedButton from '../components/ui/AnimatedButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      setMessage('Login successful! Loading dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Ambient Glows */}
      <div className="absolute w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2.5 group mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-2xl bg-[#080A12] flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-extrabold text-white font-heading">
            Welcome <GradientText gradient="accent">Back</GradientText>
          </h1>
          <p className="text-sm text-slate-400">Sign in to your verified student exchange account</p>
        </div>

        {/* Glass Login Card */}
        <GlassCard variant="elevated" className="border-indigo-500/30 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          
          {message && (
            <div className="mb-6 flex items-center space-x-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-xs font-semibold animate-fade-in">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center space-x-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-xs font-semibold animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                  placeholder="student@university.edu"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#080A12] border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Forgot?</a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#080A12] border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <AnimatedButton
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-2 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              Sign In to Account
            </AnimatedButton>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-slate-400">
              New to ResourceHub?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
                Register with campus email
              </Link>
            </p>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
