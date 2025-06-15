import { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../utils/supabaseClient';

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <Link to="/catalog" className="hover:underline font-semibold">Catalog</Link>
            {user && <Link to="/my-books" className="hover:underline">My Books</Link>}
            {user && <Link to="/recommendations" className="hover:underline">Test Page</Link>}

            {user?.email === 'vkansal12@gmail.com' && (
              <>
                <Link to="/admin/add-book" className="hover:underline">Add a Book</Link>
                <Link to="/admin/issue-books" className="hover:underline">Issue Books</Link>
                <Link to="/admin/signup" className="hover:underline">Sign Up</Link>
                <Link to="/admin/edit-customer" className="hover:underline">View Customer</Link>
                <Link to="/admin/review-books" className="hover:underline">Review Books</Link>
              </>
            )}

            {!user && (
              <>
                <Link
                  to="/signup-request"
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-3 py-1 rounded"
                >
                  Join the Library
                </Link>
                <Link
                  to="/login"
                  className="bg-white text-blue-700 font-semibold px-3 py-1 rounded hover:bg-gray-100"
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm italic">
                Logged in as <strong>{user.user_metadata?.name || user.email}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 px-2 py-1 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          )}

          <div className="sm:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white focus:outline-none"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden px-4 pb-4">
          <div className="flex flex-col space-y-2">
            <Link to="/catalog" className="hover:underline">Catalog</Link>
            {!user && <Link to="/signup-request" className="hover:underline">Join the Library</Link>}
            {!user && <Link to="/login" className="hover:underline">Login</Link>}
            {user && <Link to="/my-books" className="hover:underline">My Books</Link>}
            {user && <Link to="/recommendations" className="hover:underline">Test Page</Link>}
            {user?.email === 'vkansal12@gmail.com' && (
              <>
                <Link to="/admin/add-book" className="hover:underline">Add a Book</Link>
                <Link to="/admin/issue-books" className="hover:underline">Issue Books</Link>
                <Link to="/admin/signup" className="hover:underline">Sign Up</Link>
                <Link to="/admin/edit-customer" className="hover:underline">View Customer</Link>
                <Link to="/admin/review-books" className="hover:underline">Review Books</Link>
              </>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="bg-red-500 px-2 py-1 rounded hover:bg-red-600"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
