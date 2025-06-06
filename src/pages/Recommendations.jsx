import React, { useEffect, useState } from 'react'
import supabase from '../utils/supabaseClient'

export default function Recommendations() {
  const [books, setBooks] = useState([])

  useEffect(() => {
    const fetchRecommendations = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      // Step 1: Get user's reading history
      const { data: history } = await supabase
        .from('circulationhistory')
        .select('ISBN13')
        .eq('MemberID', user.id)

      const isbnList = history.map(h => h.ISBN13)

      const { data: historyBooks } = await supabase
        .from('catalog')
        .select('Authors')
        .in('ISBN13', isbnList)

      const authorKeywords = [...new Set(historyBooks.flatMap(book => book.Authors?.split(', ') || []))]

      const { data: recommended } = await supabase
        .from('catalog')
        .select('*')

      const matches = recommended.filter(b =>
        b.Authors?.split(', ').some(author => authorKeywords.includes(author))
      )

      // Filter by availability
      const { data: customer } = await supabase
        .from('customerinfo')
        .select('CustomerLocation')
        .eq('CustomerID', user.id)
        .single()

      const { data: available } = await supabase
        .from('copyinfo')
        .select('ISBN13')
        .eq('CopyLocation', customer.CustomerLocation)
        .eq('Available', true)

      const availableISBNs = [...new Set(available.map(c => c.ISBN13))]

      const finalList = matches.filter(book => availableISBNs.includes(book.ISBN13))
      setBooks(finalList)
    }

    fetchRecommendations()
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {books.map(book => (
          <div key={book.ISBN13} className="bg-white p-4 rounded shadow">
            <img src={book.Thumbnail} alt={book.Title} className="w-full h-40 object-cover mb-2" />
            <h3 className="font-bold">{book.Title}</h3>
            <p className="text-sm text-gray-600">{book.Authors}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
