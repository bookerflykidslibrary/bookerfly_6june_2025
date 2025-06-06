import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../utils/supabaseClient'

export default function Navbar() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <nav className="flex justify-between items-center p-4 bg-blue-600 text-white">
      <h1 className="text-xl font-bold">📚 Booker</h1>
      <div className="space-x-4">
        <Link to="/catalog">Catalog</Link>
        <Link to="/my-books">My Books</Link>
        <Link to="/recommendations">Recommendations</Link>
        {user?.email === 'admin@example.com' && <Link to="/admin/add-book">Admin</Link>}
        {user ? (
          <button onClick={handleLogout}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
