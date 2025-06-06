import React, { useEffect, useState } from 'react'
import supabase from '../utils/supabaseClient'

export default function Catalog() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBooks = async () => {
      const { data, error } = await supabase
        .from('catalog')
        .select('*')
        .order('Title', { ascending: true })

      if (error) {
        console.error('Error fetching catalog:', error)
      } else {
        setBooks(data)
      }

      setLoading(false)
    }

    fetchBooks()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Book Catalog</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {books.map((book) => (
            <div key={book.ISBN13} className="border p-2 rounded shadow">
              <img src={book.Thumbnail} alt={book.Title} className="w-full h-48 object-cover" />
              <h2 className="font-semibold mt-2">{book.Title}</h2>
              <p className="text-sm">{book.Authors}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
