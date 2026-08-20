import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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
import MyListings from './pages/MyListings';
import MyRequests from './pages/MyRequests';
import ExchangeHistory from './pages/ExchangeHistory';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Landing & Authentication */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Forms (Outside main layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard and Core App (Wrapped in MainLayout) */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/resource/:id" element={<ResourceDetails />} />
          <Route path="/add-resource" element={<AddResource />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/history" element={<ExchangeHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
