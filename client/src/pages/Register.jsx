import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      }, 2500);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 bg-[#161d30]/80 backdrop-blur-md border border-[#242f4c] rounded-3xl p-8 shadow-2xl relative">
      <h2 className="text-3xl font-extrabold text-center tracking-tight text-white mb-2">Create Account</h2>
      <p className="text-center text-sm text-slate-400 mb-8">Join your campus network to trade resources</p>

      {message && (
        <div className="mb-6 flex items-start space-x-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-xl px-4 py-3 text-sm animate-fadeIn">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-start space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-3 text-sm animate-fadeIn">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <User className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full pl-10 pr-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300"
            />
          </div>
        </div>

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
          <p className="text-[11px] text-indigo-400/80 mt-1.5 flex items-center space-x-1">
            <ShieldCheck className="h-3 w-3 flex-shrink-0 text-emerald-400" />
            <span>Must end with a valid university domain (e.g. .edu, .ac.uk)</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
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

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Computer Science, Physics"
            required
            className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Year of Study</label>
          <select
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(e.target.value)}
            className="w-full px-4 py-3 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-200 outline-none transition-all duration-300 text-sm"
          >
            <option value="1">Year 1 (Freshman)</option>
            <option value="2">Year 2 (Sophomore)</option>
            <option value="3">Year 3 (Junior)</option>
            <option value="4">Year 4 (Senior)</option>
            <option value="5">Year 5</option>
            <option value="6">Year 6</option>
          </select>
        </div>

        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 bg-[#0d111c] border-slate-700 text-indigo-600 rounded focus:ring-indigo-500 focus:ring-offset-[#0d111c]"
          />
          <label htmlFor="terms" className="ml-2 text-xs text-slate-400 leading-relaxed">
            I agree to trade responsibly and abide by the university's academic integrity policies.
          </label>
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
              <ShieldCheck className="h-5 w-5" />
              <span>Register & Verify</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-400 border-t border-[#242f4c] pt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign In</Link>
      </div>
    </div>
  );
}
