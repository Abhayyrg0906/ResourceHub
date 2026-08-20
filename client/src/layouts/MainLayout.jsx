import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  GraduationCap
} from 'lucide-react';

export default function MainLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Marketplace', path: '/marketplace', icon: BookOpen },
    { name: 'Dashboard', path: '/dashboard', icon: User },
    { name: 'Add Resource', path: '/add-resource', icon: PlusCircle },
    { name: 'My Listings', path: '/my-listings', icon: FolderHeart },
    { name: 'History', path: '/history', icon: History },
    { name: 'Admin', path: '/admin', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0d111c] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-[#161d30]/90 backdrop-blur-md border-b border-[#242f4c] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 group">
                <GraduationCap className="h-8 w-8 text-indigo-400 group-hover:text-indigo-300 transition-colors duration-300" />
                <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:opacity-95">
                  ResourceHub
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-1 items-center">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border-b-2 border-indigo-500 rounded-b-none'
                        : 'text-slate-300 hover:bg-[#1f2942] hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>

            {/* Right Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/notifications" className="relative p-1.5 rounded-full text-slate-300 hover:bg-[#1f2942] hover:text-white transition-colors duration-300">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-pink-500 ring-2 ring-[#0d111c]" />
              </Link>

              <Link to="/profile" className="flex items-center space-x-2 p-1.5 rounded-lg text-slate-300 hover:bg-[#1f2942] hover:text-white transition-colors duration-300">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md">
                  S
                </div>
              </Link>

              <button 
                onClick={() => navigate('/login')} 
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1f2942]/60 hover:bg-rose-600/20 hover:text-rose-300 border border-slate-600/30 rounded-lg transition-all duration-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-3">
              <Link to="/notifications" className="relative p-1.5 text-slate-300">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-pink-500 ring-2 ring-[#0d111c]" />
              </Link>

              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-[#1f2942] focus:outline-none"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-[#161d30] border-b border-[#242f4c] animate-fadeIn">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-indigo-600/30 text-indigo-300'
                        : 'text-slate-300 hover:bg-[#1f2942] hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
              <NavLink
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-[#1f2942]"
              >
                <User className="h-5 w-5" />
                <span>My Profile</span>
              </NavLink>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/login');
                }}
                className="w-full text-left flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#0b0e17] border-t border-[#1f293d] py-8 mt-auto text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <GraduationCap className="h-6 w-6 text-indigo-400" />
              <span className="font-bold text-slate-200">ResourceHub</span>
            </div>
            <div className="flex space-x-6 text-sm mb-4 md:mb-0">
              <Link to="/marketplace" className="hover:text-indigo-400 transition-colors">Marketplace</Link>
              <Link to="/about" className="hover:text-indigo-400 transition-colors">About Sustainability</Link>
              <Link to="/admin" className="hover:text-indigo-400 transition-colors">Administration</Link>
            </div>
            <div className="text-xs">
              &copy; {new Date().getFullYear()} ResourceHub. Empowering smart campus sharing & sustainability.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
