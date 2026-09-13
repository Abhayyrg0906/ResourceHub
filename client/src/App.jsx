import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';

// Auth Provider
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import MainLayout from './layouts/MainLayout';

// Direct import for immediate landing
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy-loaded application routes
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const ResourceDetails = lazy(() => import('./pages/ResourceDetails'));
const AddResource = lazy(() => import('./pages/AddResource'));
const EditResource = lazy(() => import('./pages/EditResource'));
const MyListings = lazy(() => import('./pages/MyListings'));
const MyRequests = lazy(() => import('./pages/MyRequests'));
const ExchangeHistory = lazy(() => import('./pages/ExchangeHistory'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const Wishlist = lazy(() => import('./pages/Wishlist'));

// Route Loading Spinner
function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-slate-400 text-sm animate-pulse">Loading module...</p>
    </div>
  );
}

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d111c] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Redirect Helper Components for Backwards Compatibility
function NavigateToResourceDetails() {
  const { id } = useParams();
  return <Navigate to={`/resources/${id}`} replace />;
}

function NavigateToEditResource() {
  const { id } = useParams();
  return <Navigate to={`/resources/${id}/edit`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          {/* Public Landing & Authentication */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth Forms (Outside main layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Core App (Wrapped in MainLayout and ProtectedRoute) */}
          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<StudentDashboard />} />
            
            {/* Redirects for legacy routes */}
            <Route path="/marketplace" element={<Navigate to="/resources" replace />} />
            <Route path="/add-resource" element={<Navigate to="/resources/create" replace />} />
            <Route path="/resource/:id" element={<NavigateToResourceDetails />} />
            <Route path="/edit-resource/:id" element={<NavigateToEditResource />} />

            {/* RESTful Resource Management Routes */}
            <Route path="/resources" element={<Marketplace />} />
            <Route path="/resources/:id" element={<ResourceDetails />} />
            <Route path="/resources/create" element={<AddResource />} />
            <Route path="/resources/:id/edit" element={<EditResource />} />

            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/my-requests" element={<Navigate to="/exchange-requests" replace />} />
            <Route path="/exchange-requests" element={<MyRequests />} />
            <Route path="/history" element={<ExchangeHistory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
