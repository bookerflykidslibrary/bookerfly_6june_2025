import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [customerID, setCustomerID] = useState('');
  const [bookIDs, setBookIDs] = useState(Array(10).fill(''));
  const [bookDetails, setBookDetails] = useState([]);
  const [step, setStep] = useState('input'); // input, confirm, done
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check admin from JWT claims
  useEffect(() => {
    async function checkAdmin() {
      setCheckingAdmin(true);
      const user = supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }
      const session = supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      // Decode JWT token manually or use supabase helper
      // Supabase client does not expose claims directly, so decode JWT payload:
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      try {
        const payload = JSON.parse(jsonPayload);
        console.log('Decoded JWT payload:', payload);
        const isAdminClaim = payload?.app_metadata?.is_admin;
        setIsAdmin(isAdminClaim === 'true');
      } catch (e) {
        setIsAdmin(false);
      }
      setCheckingAdmin(false);
    }
    checkAdmin();
  }, []);

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-700 text-lg">Checking access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
        <p className="text-red-700 text-xl font-semibold">Access denied. Admins only.</p>
      </div>
    );
  }

  // --- rest of your IssueBooks component below ---

  const handleBookIDChange = (index, value) => {
    const newBookIDs = [...bookIDs];
    newBookIDs[index] = value.trim();
    setBookIDs(newBookIDs);
  };

  async function fetchBookDetails() {
    setError('');
    setLoading(true);
    try {
      const filteredBookIDs = bookIDs.filter((id) => id !== '');
      if (!customerID.trim()) {
        setError('Please enter Customer ID.');
        setLoading(false);
        return;
      }
      if (filteredBookIDs.length === 0) {
        setError('Please enter at least one Book ID or ISBN.');
        setLoading(false);
        return;
      }

      let orCondition = filteredBookIDs
        .map((id) => `ISBN13.eq.${id}`)
        .concat(filteredBookIDs.map((id) => `BookID.eq.${id}`))
        .join(',');

      const { data, error: fetchError } = await supabase
        .from('catalog')
        .select('BookID, ISBN13, Title, Authors, Thumbnail')
        .or(orCondition);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError('No books found for given IDs/ISBNs.');
        setLoading(false);
        return;
      }

      setBookDetails(data);
      setStep('confirm');
    } catch (err) {
      setError('Error fetching book details: ' + err.message);
    }
    setLoading(false);
  }

  async function confirmIssue() {
    setError('');
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      const inserts = bookDetails.map((book) => ({
        LibraryBranch: 'Main',
        ISBN13: book.ISBN13,
        BookingDate: today,
        ReturnDate: null,
        MemberID: customerID.trim(),
        Comment: null,
      }));

      const { error: insertError } = await supabase
        .from('circulationhistory')
        .insert(inserts);

      if (insertError) throw insertError;

      setStep('done');
    } catch (err) {
      setError('Error issuing books: ' + err.message);
    }
    setLoading(false);
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-green-300 p-6">
        <h1 className="text-3xl font-bold mb-4 text-green-900">Issue Books</h1>
        <p className="text-lg text-green-800">Books successfully issued to customer ID <span className="font-semibold">{customerID}</span>.</p>
        <button
          onClick={() => {
            setCustomerID('');
            setBookIDs(Array(10).fill(''));
            setBookDetails([]);
            setStep('input');
            setError('');
          }}
          className="mt-6 bg-green-700 text-white px-6 py-2 rounded shadow hover:bg-green-800 transition"
        >
          Issue More Books
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-6 mb-10">
      <h1 className="text-3xl font-bold mb-6 text-blue-900 border-b border-blue-300 pb-2">Issue Books</h1>

      {step === 'input' && (
        <>
          <label className="block mb-4">
            <span className="text-gray-700 font-medium mb-1 block">Customer ID</span>
            <input
              type="text"
              value={customerID}
              onChange={(e) => setCustomerID(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Customer ID"
            />
          </label>

          {[...Array(10)].map((_, idx) => (
            <label key={idx} className="block mb-3">
              <span className="text-gray-700 font-medium mb-1 block">Book {idx + 1} ID/ISBN</span>
              <input
                type="text"
                value={bookIDs[idx]}
                onChange={(e) => handleBookIDChange(idx, e.target.value)}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter Book ${idx + 1} ID or ISBN`}
              />
            </label>
          ))}

          {error && <p className="text-red-600 font-semibold mb-3">{error}</p>}

          <button
            onClick={fetchBookDetails}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold shadow transition disabled:opacity-60"
          >
            {loading ? 'Fetching...' : 'Issue Books'}
          </button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <h2 className="text-2xl font-semibold mb-4 text-blue-900">Confirm Issue</h2>
          <p className="mb-3 text-gray-700">Customer ID: <span className="font-semibold">{customerID}</span></p>

          <ul className="space-y-4 max-h-96 overflow-y-auto mb-6">
            {bookDetails.map((book) => (
              <li
                key={book.ISBN13}
                className="flex items-center space-x-4 p-3 border rounded shadow-sm hover:shadow-md transition bg-blue-50"
              >
                <img
                  src={book.Thumbnail || '/placeholder-book.png'}
                  alt={book.Title}
                  className="w-16 h-20 object-cover rounded border"
                  loading="lazy"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg text-blue-900">{book.Title}</p>
                  <p className="text-sm text-blue-700">{book.Authors}</p>
                  <p className="text-xs text-blue-600">ISBN: {book.ISBN13}</p>
                </div>
              </li>
            ))}
          </ul>

          {error && <p className="text-red-600 font-semibold mb-3">{error}</p>}

          <div className="flex space-x-4">
            <button
              onClick={() => setStep('input')}
              disabled={loading}
              className="flex-1 bg-gray-400 text-gray-900 py-3 rounded font-semibold hover:bg-gray-500 transition disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              onClick={confirmIssue}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 transition disabled:opacity-60"
            >
              {loading ? 'Issuing...' : 'Confirm'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
