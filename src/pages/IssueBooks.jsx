import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [bookInputs, setBookInputs] = useState(Array(10).fill({ isbn: '', copyLocationID: '' }));
  const [customerID, setCustomerID] = useState('');
  const [bookDetails, setBookDetails] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: admin } = await supabase
        .from('admininfo')
        .select('AdminLocation')
        .eq('AdminID', user.id)
        .single();

      if (admin) setIsAdmin(true);
    };

    checkAdmin();
  }, []);

  const handleInputChange = (index, field, value) => {
    const updatedInputs = [...bookInputs];
    updatedInputs[index][field] = value;
    setBookInputs(updatedInputs);
  };

  const fetchBookDetails = async () => {
    setMessage('');
    const details = [];

    for (const { isbn, copyLocationID } of bookInputs) {
      if (!isbn && !copyLocationID) continue;

      let book = null;
      if (copyLocationID) {
        const { data: copyInfo } = await supabase
          .from('copyinfo')
          .select('ISBN13')
          .eq('CopyLocationID', copyLocationID)
          .single();

        if (copyInfo?.ISBN13) {
          const { data } = await supabase
            .from('catalog')
            .select('Title, Authors, Thumbnail')
            .eq('ISBN13', copyInfo.ISBN13)
            .single();
          if (data) book = { ...data, ISBN13: copyInfo.ISBN13 };
        }
      } else if (isbn) {
        const { data } = await supabase
          .from('catalog')
          .select('Title, Authors, Thumbnail')
          .eq('ISBN13', isbn)
          .single();
        if (data) book = { ...data, ISBN13: isbn };
      }

      if (book) details.push(book);
    }

    setBookDetails(details);
  };

  const confirmIssue = async () => {
    const today = new Date().toISOString().split('T')[0];

    for (const book of bookDetails) {
      await supabase.from('circulationhistory').insert({
        LibraryBranch: 'Main',
        ISBN13: book.ISBN13,
        BookingDate: today,
        MemberID: customerID,
        Comment: 'Issued via Admin UI'
      });
    }

    setMessage('✅ Books successfully issued!');
    setConfirmed(true);
  };

  if (!isAdmin) return <div className="p-4 text-red-500">Access denied. Admins only.</div>;

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow mt-6">
      <h2 className="text-2xl font-bold text-blue-700 text-center mb-4">Issue Books</h2>

      <input
        type="text"
        value={customerID}
        onChange={(e) => setCustomerID(e.target.value)}
        placeholder="Enter Customer ID"
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />

      {bookInputs.map((input, index) => (
        <div key={index} className="mb-2">
          <label className="block font-semibold mb-1">Book {index + 1}</label>
          <input
            type="text"
            placeholder="Enter ISBN13"
            value={input.isbn}
            onChange={(e) => handleInputChange(index, 'isbn', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-1"
          />
          <input
            type="text"
            placeholder="or Enter CopyLocationID"
            value={input.copyLocationID}
            onChange={(e) => handleInputChange(index, 'copyLocationID', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      ))}

      {!bookDetails.length ? (
        <button
          onClick={fetchBookDetails}
          className="w-full bg-blue-600 text-white py-2 mt-4 rounded"
        >
          Issue Books
        </button>
      ) : (
        <>
          <h3 className="text-lg font-semibold mt-4 mb-2">Confirm Book Details</h3>
          {bookDetails.map((book, idx) => (
            <div key={idx} className="flex items-center gap-4 border p-2 rounded mb-2">
              {book.Thumbnail && <img src={book.Thumbnail} alt="Thumb" className="w-16 h-auto rounded" />}
              <div>
                <p className="font-bold">{book.Title}</p>
                <p className="text-sm">{book.Authors}</p>
              </div>
            </div>
          ))}

          <button
            onClick={confirmIssue}
            className="w-full bg-green-600 text-white py-2 mt-4 rounded"
          >
            Confirm & Issue
          </button>
        </>
      )}

      {message && <p className="mt-4 text-center text-green-700 font-semibold">{message}</p>}
    </div>
  );
}
