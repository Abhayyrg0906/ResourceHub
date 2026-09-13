import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  User, 
  Bell, 
  PlusCircle, 
  FolderHeart, 
  History, 
  ShieldAlert, 
  Menu, 
  X, 
  LogOut,
  GraduationCap,
  MessageSquare,
  Heart,
  ShieldCheck,
  ChevronRight,
  Search,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../services/notificationService';

export default function MainLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getUnreadCount();
      if (res && res.success) {
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      // Ignore background network error
    }
  }, [user]);

  useEffect(() => {
    fetchUnread();

    const handleUpdate = () => fetchUnread();
    window.addEventListener('notificationsUpdated', handleUpdate);
    const interval = setInterval(fetchUnread, 30000);

    return () => {
      window.removeEventListener('notificationsUpdated', handleUpdate);
      clearInterval(interval);
    };
  }, [fetchUnread]);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const baseNavItems = [
    { name: 'Marketplace', path: '/resources', icon: BookOpen },
    { name: 'Dashboard', path: '/dashboard', icon: User },
    { name: 'Wishlist', path: '/wishlist', icon: Heart },
    { name: 'Messages', path: '/chat', icon: MessageSquare },
    { name: 'Add Listing', path: '/resources/create', icon: PlusCircle },
    { name: 'My Listings', path: '/my-listings', icon: FolderHeart },
    { name: 'History', path: '/history', icon: History },
  ];

  const navItems = user && user.role === 'ADMIN'
    ? [...baseNavItems, { name: 'Admin', path: '/admin', icon: ShieldAlert }]
    : baseNavItems;

  const trustScore = user?.trust_score !== undefined ? Math.round(Number(user.trust_score)) : 100;

  return (
    <div className="min-h-screen flex flex-col bg-[#080A12] text-[#F8FAFC] selection:bg-[#7C3AED] selection:text-white">
      
      {/* Floating Glass Navbar */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <nav className="max-w-7xl mx-auto glass-panel-elevated rounded-2xl sm:rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all">
          <div className="px-4 sm:px-6 flex items-center justify-between h-16">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-2.5 group">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 p-0.5 shadow-lg shadow-purple-600/30 group-hover:shadow-purple-600/50 transition-all duration-300">
                  <div className="w-full h-full rounded-2xl bg-[#080A12] flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-purple-300 bg-clip-text text-transparent font-heading">
                  ResourceHub
                </span>
              </Link>
            </div>

            {/* Middle: Desktop Pill Navigation */}
            <div className="hidden lg:flex items-center space-x-1 bg-[#0a0d18]/60 p-1.5 rounded-2xl border border-white/5">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>

            {/* Right: Notification & User Profile Pill */}
            <div className="hidden md:flex items-center space-x-3">
              
              {/* Notification Bell */}
              <Link
                to="/notifications"
                className="relative w-10 h-10 rounded-2xl bg-[#111528] border border-white/10 hover:border-indigo-500/40 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-sm"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-lg shadow-pink-500/50 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Profile Pill */}
              {user ? (
                <div className="flex items-center space-x-2 bg-[#111528] p-1.5 pr-3 rounded-2xl border border-white/10">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="text-left leading-tight hidden xl:block">
                      <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[100px]">
                        {user.name || 'Student'}
                      </p>
                      <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold">
                        <ShieldCheck className="h-3 w-3" />
                        <span>{trustScore}% Trust</span>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center space-x-2">
              <Link
                to="/notifications"
                className="relative w-9 h-9 rounded-xl bg-[#111528] border border-white/10 flex items-center justify-center text-slate-300"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
              
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-2xl bg-[#111528] border border-white/10 flex items-center justify-center text-slate-200 hover:text-white"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

          </div>

          {/* Mobile Drawer Navigation */}
          {isOpen && (
            <div className="lg:hidden px-4 pt-2 pb-5 border-t border-white/10 space-y-2 bg-[#080A12]/95 backdrop-blur-2xl rounded-b-2xl animate-fade-in">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}

              {user && (
                <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between px-2">
                  <Link to="/profile" className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{user.name}</p>
                      <p className="text-[10px] text-emerald-400">{trustScore}% Trust Score</p>
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Futuristic Glass Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#080A12]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-600/30">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-base font-extrabold text-white font-heading">ResourceHub</p>
                <p className="text-xs text-slate-400">Campus Student Resource & Exchange Platform</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <Link to="/resources" className="hover:text-indigo-300 transition-colors">Marketplace</Link>
              <Link to="/dashboard" className="hover:text-indigo-300 transition-colors">Student Dashboard</Link>
              <Link to="/wishlist" className="hover:text-indigo-300 transition-colors">Wishlist</Link>
              <Link to="/history" className="hover:text-indigo-300 transition-colors">Exchange History</Link>
            </div>

            <p className="text-xs text-slate-500 text-center md:text-right">
              &copy; {new Date().getFullYear()} ResourceHub. Built for students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
