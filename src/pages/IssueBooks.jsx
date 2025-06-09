import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [bookInputs, setBookInputs] = useState(Array(10).fill(''));
  const [customerId, setCustomerId] = useState('');
  const [books, setBooks] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLocation, setAdminLocation] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: admin, error } = await supabase
        .from('admininfo')
        .select('AdminLocation')
        .eq('AdminID', user.id)
        .single();

      if (admin) {
        setIsAdmin(true);
        setAdminLocation(admin.AdminLocation);
      }
    };
    checkAdmin();
  }, []);

  const handleInputChange = (index, value) => {
    const updated = [...bookInputs];
    updated[index] = value;
    setBookInputs(updated);
  };

  const handleReview = async () => {
    const filtered = bookInputs.map(i => i.trim()).filter(Boolean);
    if (!customerId || filtered.length === 0) {
      setMessage('Please enter Customer ID and at least one Book ID/CopyLocationID.');
      return;
    }

    const bookResults = [];

    for (let id of filtered) {
      let copyData = null;

      // Try using CopyLocationID first
      const { data: copyByLoc } = await supabase
        .from('copyinfo')
        .select('CopyID, ISBN13')
        .eq('CopyLocationID', id)
        .eq('CopyBooked', false)
        .single();

      if (copyByLoc) {
        copyData = copyByLoc;
      } else {
        // Else treat it as ISBN13
        const { data: copyByISBN } = await supabase
          .from('copyinfo')
          .select('CopyID, ISBN13')
          .eq('ISBN13', id)
          .eq('CopyLocation', adminLocation)
          .eq('CopyBooked', false)
          .limit(1)
          .maybeSingle();

        if (copyByISBN) copyData = copyByISBN;
      }

      if (!copyData) {
        bookResults.push({ error: `❌ No available copy for ID: ${id}` });
        continue;
      }

      const { data: bookInfo } = await supabase
        .from('catalog')
        .select('Title, Authors, Thumbnail')
        .eq('ISBN13', copyData.ISBN13)
        .single();

      if (bookInfo) {
        bookResults.push({
          ...bookInfo,
          ISBN13: copyData.ISBN13,
          CopyID: copyData.CopyID,
        });
      }
    }

    setBooks(bookResults);
    setConfirming(true);
    setMessage('');
  };

  const handleConfirm = async () => {
    const today = new Date().toISOString();

    const records = books
      .filter(b => b.CopyID)
      .map(book => ({
        LibraryBranch: adminLocation,
        ISBN13: book.ISBN13,
        BookingDate: today,
        MemberID: customerId,
        ReturnDate: null,
        Comment: '',
        CopyID: book.CopyID,
      }));

    const { error: insertError } = await supabase
      .from('circulationhistory')
      .insert(records);

    if (insertError) {
      setMessage('Error issuing books: ' + insertError.message);
      return;
    }

    await Promise.all(
      books.map(b =>
        b.CopyID
          ? supabase
              .from('copyinfo')
              .update({ CopyBooked: true })
              .eq('CopyID', b.CopyID)
          : null
      )
    );

    setMessage('✅ Books issued successfully!');
    setConfirming(false);
    setBooks([]);
    setBookInputs(Array(10).fill(''));
    setCustomerId('');
  };

  if (!isAdmin) {
    return <div className="text-center p-4 text-red-600 font-bold">Access Denied: Admins Only</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8">
      <h2 className="text-2xl font-bold text-center text-purple-700 mb-4">Issue Books</h2>

      <input
        type="text"
        placeholder="Enter Customer ID"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded"
      />

      {bookInputs.map((value, index) => (
        <input
          key={index}
          type="text"
          placeholder={`Book ${index + 1} ID/ISBN or CopyLocationID`}
          value={value}
          onChange={(e) => handleInputChange(index, e.target.value)}
          className="w-full p-2 mb-2 border border-gray-300 rounded"
        />
      ))}

      <button
        onClick={handleReview}
        className="w-full mt-2 bg-purple-600 text-white py-2 rounded"
      >
        Review Books
      </button>

      {confirming && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-700">Confirm Issue:</h3>
          {books.map((b, i) => (
            <div key={i} className="flex items-center gap-2 py-2 border-b">
              {b.error ? (
                <p className="text-red-600 text-sm">{b.error}</p>
              ) : (
                <>
                  {b.Thumbnail && (
                    <img
                      src={b.Thumbnail}
                      alt="thumb"
                      className="w-12 h-auto rounded"
                    />
                  )}
                  <div>
                    <p className="text-sm font-bold">{b.Title}</p>
                    <p className="text-xs text-gray-600">{b.Authors}</p>
                    <p className="text-xs text-gray-500">Copy ID: {b.CopyID}</p>
                  </div>
                </>
              )}
            </div>
          ))}
          <button
            onClick={handleConfirm}
            className="w-full mt-4 bg-green-600 text-white py-2 rounded"
          >
            Confirm Issue
          </button>
        </div>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-blue-700 font-semibold">{message}</p>
      )}
    </div>
  );
}
