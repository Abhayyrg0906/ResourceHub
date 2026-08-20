import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      }, 1000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-[#161d30]/80 backdrop-blur-md border border-[#242f4c] rounded-3xl p-8 shadow-2xl relative">
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

      <h2 className="text-3xl font-extrabold text-center tracking-tight text-white mb-2">Welcome Back</h2>
      <p className="text-center text-sm text-slate-400 mb-8">Sign in to exchange campus academic resources</p>

      {message && (
        <div className="mb-6 flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm animate-fadeIn">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm animate-fadeIn">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">University Email</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Mail className="h-5 w-5" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@university.edu"
              required
              className="w-full pl-10 pr-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-300">Password</label>
            <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Lock className="h-5 w-5" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-400 border-t border-[#242f4c] pt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Register here</Link>
      </div>
    </div>
  );
}
