import React, { useEffect, useState } from 'react'
import supabase from '../utils/supabaseClient'

export default function MyBooks() {
  const [books, setBooks] = useState([])

  useEffect(() => {
    const fetchMyBooks = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: history } = await supabase
        .from('circulationhistory')
        .select('ISBN13, BookingDate, ReturnDate, Comment')
        .eq('MemberID', user.id)

      const isbnList = history.map(h => h.ISBN13)

      const { data: catalog } = await supabase
        .from('catalog')
        .select('*')
        .in('ISBN13', isbnList)

      // Combine catalog and history
      const combined = history.map(h => ({
        ...catalog.find(c => c.ISBN13 === h.ISBN13),
        BookingDate: h.BookingDate,
        ReturnDate: h.ReturnDate,
        Comment: h.Comment
      }))

      setBooks(combined)
    }

    fetchMyBooks()
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Borrowed Books</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {books.map(book => (
          <div key={book.ISBN13} className="bg-white p-4 rounded shadow">
            <img src={book.Thumbnail} alt={book.Title} className="w-full h-40 object-cover mb-2" />
            <h3 className="font-bold">{book.Title}</h3>
            <p>Rented: {new Date(book.BookingDate).toLocaleDateString()}</p>
            <p>Returned: {book.ReturnDate ? new Date(book.ReturnDate).toLocaleDateString() : 'Not Returned'}</p>
            <p className="text-sm mt-1 text-gray-600">{book.Comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
