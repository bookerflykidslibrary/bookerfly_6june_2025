import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [books, setBooks] = useState(Array(10).fill({ isbn: '', copyId: '', data: null }));
  const [customerId, setCustomerId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [adminLocation, setAdminLocation] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: admin } = await supabase
        .from('admininfo')
        .select('AdminLocation')
        .eq('AdminID', user.id)
        .single();
      if (admin) setAdminLocation(admin.AdminLocation);
    };
    fetchAdmin();
  }, []);

  const handleInputChange = (index, key, value) => {
    const updated = [...books];
    updated[index] = { ...updated[index], [key]: value };
    setBooks(updated);
  };

  const handleSearch = async () => {
    const updated = await Promise.all(
      books.map(async (book) => {
        if (book.copyId) {
          const { data: copyInfo } = await supabase
            .from('copyinfo')
            .select('ISBN13')
            .eq('CopyLocationID', book.copyId)
            .single();

          if (copyInfo) {
            const { data: bookInfo } = await supabase
              .from('catalog')
              .select('Title, Authors, Thumbnail')
              .eq('ISBN13', copyInfo.ISBN13)
              .single();

            return { ...book, isbn: copyInfo.ISBN13, data: bookInfo };
          }
        } else if (book.isbn) {
          const { data: bookInfo } = await supabase
            .from('catalog')
            .select('Title, Authors, Thumbnail')
            .eq('ISBN13', book.isbn)
            .single();

          return { ...book, data: bookInfo };
        }
        return book;
      })
    );
    setBooks(updated);
  };

  const handleConfirm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    const inserts = books.filter(b => b.data).map(b => ({
      ISBN13: b.isbn,
      BookingDate: today,
      MemberID: customerId,
      LibraryBranch: adminLocation,
      ReturnDate: null,
      Comment: null,
    }));

    const { error } = await supabase.from('circulationhistory').insert(inserts);

    if (error) {
      setMessage('❌ Error issuing books: ' + error.message);
    } else {
      setConfirmed(true);
      setMessage('✅ Books issued successfully!');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white shadow-md rounded mt-4">
      <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">Issue Books</h1>

      <input
        type="text"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        placeholder="Enter Customer ID"
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />

      {books.map((book, idx) => (
        <div key={idx} className="mb-4 p-3 border rounded bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-1">Book {idx + 1}</h3>
          <input
            type="text"
            value={book.copyId}
            onChange={(e) => handleInputChange(idx, 'copyId', e.target.value)}
            placeholder="Copy Location ID (optional)"
            className="w-full p-2 border border-gray-300 rounded mb-2"
          />
          <input
            type="text"
            value={book.isbn}
            onChange={(e) => handleInputChange(idx, 'isbn', e.target.value)}
            placeholder="ISBN13 (optional)"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      ))}

      <button
        onClick={handleSearch}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Issue Books
      </button>

      {books.some(b => b.data) && !confirmed && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-bold text-green-600">Confirm the following books:</h2>
          {books.map((book, idx) => (
            book.data ? (
              <div key={idx} className="flex items-center border p-2 rounded">
                <img src={book.data.Thumbnail} alt="thumb" className="w-16 h-20 object-cover rounded mr-4" />
                <div>
                  <p className="font-semibold">{book.data.Title}</p>
                  <p className="text-sm text-gray-600">{book.data.Authors}</p>
                </div>
              </div>
            ) : null
          ))}
          <button
            onClick={handleConfirm}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Confirm and Issue
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-center text-lg text-purple-600 font-semibold">{message}</p>}
    </div>
  );
}
