import React from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 text-white flex space-x-4">
      <Link to="/">Catalog</Link>
      <Link to="/my-books">My Books</Link>
      <Link to="/recommendations">Recommendations</Link>
      <Link to="/admin/add-book">Admin</Link>
      <Link to="/login">Login</Link>
    </nav>
  )
}
