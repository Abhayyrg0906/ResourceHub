import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';

// Auth Provider
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import MainLayout from './layouts/MainLayout';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import Marketplace from './pages/Marketplace';
import ResourceDetails from './pages/ResourceDetails';
import AddResource from './pages/AddResource';
import EditResource from './pages/EditResource';
import MyListings from './pages/MyListings';
import MyRequests from './pages/MyRequests';
import ExchangeHistory from './pages/ExchangeHistory';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';

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
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
