import { Link } from 'react-router-dom'
import supabase from '../utils/supabaseClient'

export default function Navbar({ user }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login' // Better UX than reload
  }

  return (
    <nav className="flex flex-col sm:flex-row justify-between items-center p-4 bg-blue-600 text-white space-y-2 sm:space-y-0">
      <div className="space-x-4" className="hover:underline">
        <Link to="/catalog">Catalog</Link>
      </div>
      <div className="space-x-4" className="hover:underline">
        <Link to="/my-books">My Books</Link>
      </div>
      <div className="space-x-4" className="hover:underline">
        <Link to="/recommendations">Recommendations</Link>
      </div>
      <div  className="space-x-4">
        {user?.email === 'vkansal12@gmail.com' && <Link to="/admin/add-book" className="hover:underline">Add a Book</Link>}
      </div>
      <div className="space-x-4">
        {user?.email === 'vkansal12@gmail.com' && <Link to="/admin/issue-books" className="hover:underline">Issue Books</Link>}
      </div>
      <div className="space-x-4">
        {user?.email === 'vkansal12@gmail.com' && <Link to="/admin/signup" className="hover:underline">Sign Up</Link>}
      </div>
      <div  className="space-x-4">
        {user?.email === 'vkansal12@gmail.com' && <Link to="/admin/edit-customer" className="hover:underline">View Customer</Link>}
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <span className="text-sm italic">
            You are logged in as <strong>{user.user_metadata?.name || user.email}</strong>
          </span>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            className="bg-red-500 px-2 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="hover:underline">Login</Link>
        )}

      </div>
    </nav>
  )
}
