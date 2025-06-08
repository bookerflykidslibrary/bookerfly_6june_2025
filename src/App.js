// src/App.js
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import MyBooks from './pages/MyBooks';
import Recommendations from './pages/Recommendations';
import AdminAddBook from './pages/AdminAddBook';
import IssueBooks from './pages/IssueBooks';

const supabase = createClient(
  process.env.REACT_APP_PUBLIC_SUPABASE_URL,
  process.env.REACT_APP_PUBLIC_SUPABASE_ANON_KEY
);

// Public routes
const publicPaths = ['/', '/login', '/catalog'];

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const path = location.pathname.toLowerCase();
      if (!session && !publicPaths.includes(path)) {
        navigate('/login');
      }

      setLoading(false);
    };

    checkAuth();
  }, [location.pathname]);

  if (loading) return <div className="p-4 text-center text-gray-500">Checking auth...</div>;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-books" element={<MyBooks />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/admin/add-book" element={<AdminAddBook />} />
        <Route path="/admin/issue-books" element={<IssueBooks />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
