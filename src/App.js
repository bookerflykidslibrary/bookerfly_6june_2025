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
import SignupForm from './components/SignupForm';
import AdminCustomerEditor from './pages/AdminCustomerEditor';
import ReviewBooks from './pages/ReviewBooks'; // 👈 Import the new page
import PublicSignup from './pages/PublicSignUp';
import AdminSignUpRequests from './pages/AdminSignUpRequests';
import ReturnBooks from './pages/ReturnBooks'; // ✅ adjust path if needed
import ChangePassword from './pages/ChangePassword';
import CirculationSummary from './pages/CirculationSummary';
import AdminEditBook from './pages/AdminEditBook';



<Routes>
  {/* ...other routes */}
  <Route path="/admin/return-books" element={<ReturnBooks />} />
</Routes>


const supabase = createClient(
  process.env.REACT_APP_PUBLIC_SUPABASE_URL,
  process.env.REACT_APP_PUBLIC_SUPABASE_ANON_KEY
);

// Public routes
const publicPaths = ['/', '/login', '/catalog', '/signup-request'];

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const path = location.pathname.toLowerCase();

      if (!session && !publicPaths.includes(path)) {
        navigate('/login');
      }

      setUser(session?.user || null);
      setLoading(false);
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener?.subscription?.unsubscribe();
  }, [location.pathname]);

  if (loading) return <div className="p-4 text-center text-gray-500">Checking auth...</div>;

  return (
    <>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Catalog user={user} />} />
        <Route path="/catalog" element={<Catalog user={user} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-books" element={<MyBooks user={user} />} />
        <Route path="/recommendations" element={<Recommendations user={user} />} />
        <Route path="/admin/add-book" element={<AdminAddBook user={user} />} />
        <Route path="/admin/edit-book" element={<AdminEditBook user={user} />} />
        <Route path="/admin/issue-books" element={<IssueBooks user={user} />} />
        <Route path="/admin/signup" element={<SignupForm />} />
        <Route path="/admin/circulation-summary" element={<CirculationSummary />} />
        <Route path="/admin/edit-customer" element={<AdminCustomerEditor user={user} />} />
        <Route path="/signup-request" element={<PublicSignup />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route
          path="/admin/review-books"
          element={<ReviewBooks adminLocation={user?.user_metadata?.location || 'Unknown'} />}
        />
        <Route path="/admin/return-books" element={<ReturnBooks adminLocation={user?.user_metadata?.location || 'Unknown'} />} />

        <Route path="/admin/view-signup-requests" element={user?.email === 'vkansal12@gmail.com'? <AdminSignUpRequests /> : <div className="p-4">Access denied</div>}
/>
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
