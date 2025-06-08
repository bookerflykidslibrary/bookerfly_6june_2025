import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../utils/supabaseClient'

export default function Navbar() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav className="flex flex-col sm:flex-row justify-between items-center p-4 bg-blue-600 text-white space-y-2 sm:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
        <h1 className="text-xl font-bold">📚 Bookerfly Kids Library</h1>
        {user && (
          <span className="text-sm">You are logged in as <strong>{user.user_metadata?.name || user.email}</strong></span>
        )}
      </div>
      <div className="space-x-4">
        <Link to="/catalog">Catalog</Link>
        <Link to="/my-books">My Books</Link>
        <Link to="/recommendations">Recommendations</Link>
        {user?.email === 'admin@example.com' && <Link to="/admin/add-book">Admin</Link>}
        {user ? (
          <button onClick={handleLogout} className="bg-red-500 px-2 py-1 rounded hover:bg-red-600">Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
