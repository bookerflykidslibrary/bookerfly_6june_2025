import { useEffect, useState } from 'react'
import supabase from '../utils/supabaseClient'

const fetchGoogleBooksData = async (isbn13) => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}`
    )
    const data = await res.json()
    if (!data.items || data.items.length === 0) return null

    const book = data.items[0].volumeInfo
    return {
      Title: book.title,
      Authors: book.authors?.join(', '),
      Description: book.description,
      Thumbnail: book.imageLinks?.thumbnail
    }
  } catch (err) {
    console.error('Error fetching Google Books API:', err)
    return null
  }
}

export default function CatalogPage() {
  const [books, setBooks] = useState([])
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    author: '',
    title: '',
    useFilters: false
  })

  const loadBooks = async () => {
    const { data: catalogData, error } = await supabase
      .from('catalog')
      .select('*')
      .limit(100)

    if (error) return console.error('Catalog fetch error:', error)

    const validBooks = []

    for (const book of catalogData) {
      const { data: copies, error: copyErr } = await supabase
        .from('copyinfo')
        .select('CopyBooked')
        .eq('ISBN13', book.ISBN13)

      if (copyErr) continue
      if (!copies || copies.length === 0) continue

      const hasAvailableCopy = copies.some((c) => c.CopyBooked === false)
      if (!hasAvailableCopy) continue

      // Filter based on optional user input
      if (filters.useFilters) {
        if (
          (filters.minAge && book.MinAge < filters.minAge) ||
          (filters.maxAge && book.MaxAge > filters.maxAge) ||
          (filters.author && !book.Authors?.toLowerCase().includes(filters.author.toLowerCase())) ||
          (filters.title && !book.Title?.toLowerCase().includes(filters.title.toLowerCase()))
        ) {
          continue
        }
      }

      // Enrich with Google Books API if missing
      if (!book.Thumbnail || !book.Description || !book.Authors) {
        const enriched = await fetchGoogleBooksData(book.ISBN13)
        if (enriched) {
          await supabase.from('catalog').update(enriched).eq('ISBN13', book.ISBN13)
          Object.assign(book, enriched)
        }
      }

      validBooks.push(book)
      if (validBooks.length >= 50) break
    }

    // Shuffle
    setBooks(validBooks.sort(() => 0.5 - Math.random()))
  }

  useEffect(() => {
    loadBooks()
  }, [filters])

  return (
    <div className="p-4 bg-gradient-to-b from-purple-100 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-center text-purple-700 mb-6">
        Bookerfly Kids Library - Book Catalog
      </h1>

      <div className="bg-white p-4 rounded-xl shadow mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <input
          type="number"
          placeholder="Min Age"
          className="border px-3 py-2 rounded shadow-sm"
          onChange={(e) => setFilters({ ...filters, minAge: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max Age"
          className="border px-3 py-2 rounded shadow-sm"
          onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
        />
        <input
          type="text"
          placeholder="Author"
          className="border px-3 py-2 rounded shadow-sm"
          onChange={(e) => setFilters({ ...filters, author: e.target.value })}
        />
        <input
          type="text"
          placeholder="Title"
          className="border px-3 py-2 rounded shadow-sm"
          onChange={(e) => setFilters({ ...filters, title: e.target.value })}
        />
        <button
          onClick={() => setFilters({ ...filters, useFilters: !filters.useFilters })}
          className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
        >
          {filters.useFilters ? 'Clear Filters' : 'Apply Filters'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <div
            key={book.BookID}
            className="bg-white border rounded-xl p-4 shadow hover:shadow-lg transition"
          >
            <img
              src={book.Thumbnail || 'https://via.placeholder.com/100x150'}
              alt={book.Title}
              className="w-full h-48 object-cover mb-3 rounded"
	      loading="lazy"
            />
            <h2 className="text-lg font-semibold text-purple-800">{book.Title}</h2>
            <p className="text-sm text-gray-700 italic mb-1">by {book.Authors}</p>
            <p className="text-sm text-gray-600">
              {book.Description?.slice(0, 150)}...
            </p>
            <p className="text-sm mt-2 text-gray-800">
              Age Group: {book.MinAge} to {book.MaxAge}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Book for me
              </button>
              <a
                href={`https://www.amazon.in/s?k=${book.ISBN13}&tag=123432543556`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Buy on Amazon
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
