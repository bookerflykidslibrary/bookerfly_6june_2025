import React, { useState } from 'react'
import supabase from '../utils/supabaseClient'

export default function AdminAddBook() {
  const [isbn, setIsbn] = useState('')
  const [book, setBook] = useState(null)
  const [message, setMessage] = useState('')

  const fetchFromGoogleBooks = async (isbn) => {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
    const json = await res.json()
    return json.items?.[0]?.volumeInfo
  }

  const handleSearch = async () => {
    const { data } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single()
    if (data) {
      setBook(data)
    } else {
      const info = await fetchFromGoogleBooks(isbn)
      if (info) {
        setBook({
          ISBN13: isbn,
          Title: info.title,
          Authors: info.authors?.join(', '),
          Description: info.description,
          Thumbnail: info.imageLinks?.thumbnail,
        })
      } else {
        setMessage('Book not found')
      }
    }
  }

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    // Get admin location
    const { data: admin } = await supabase
      .from('admininfo')
      .select('AdminLocation')
      .eq('AdminID', user.id)
      .single()

    await supabase.from('catalog').upsert(book)

    const { data: copies } = await supabase
      .from('copyinfo')
      .select('CopyID')
      .eq('ISBN13', book.ISBN13)

    const nextCopyID = Math.max(0, ...copies.map(c => parseInt(c.CopyID))) + 1

    await supabase.from('copyinfo').insert({
      CopyID: nextCopyID.toString(),
      ISBN13: book.ISBN13,
      CopyNumber: nextCopyID,
      CopyLocation: admin.AdminLocation,
      Available: true
    })

    setMessage('Book and copy added successfully!')
    setBook(null)
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Add Book by ISBN</h2>
      <input
        type="text"
        value={isbn}
        onChange={(e) => setIsbn(e.target.value)}
        placeholder="Enter ISBN13"
        className="p-2 border rounded w-full max-w-md mb-2"
      />
      <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>

      {book && (
        <div className="bg-white p-4 mt-4 shadow rounded max-w-md">
          <h3 className="text-lg font-bold">{book.Title}</h3>
          <p>{book.Authors}</p>
          <img src={book.Thumbnail} alt={book.Title} className="w-32 h-40 object-cover my-2" />
          <p className="text-sm">{book.Description?.slice(0, 200)}...</p>
          <button onClick={handleAdd} className="mt-2 bg-green-600 text-white px-4 py-2 rounded">Add to Catalog</button>
        </div>
      )}

      {message && <p className="mt-4 text-green-700 font-semibold">{message}</p>}
    </div>
  )
}
