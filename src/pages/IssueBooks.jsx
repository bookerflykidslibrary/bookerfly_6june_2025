import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [bookIds, setBookIds] = useState(Array(10).fill(''));
  const [customerId, setCustomerId] = useState('');
  const [books, setBooks] = useState([]);
  const [adminLocation, setAdminLocation] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchAdminLocation = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setMessage('❌ Could not get current user.');
        return;
      }
      const userId = userData.user.id;

      const { data: admin, error: adminError } = await supabase
        .from('admininfo')
        .select('AdminLocation')
        .eq('AdminID', userId)
        .maybeSingle();

      if (adminError || !admin) {
        setMessage('❌ You are not authorized to access this page.');
        return;
      }

      setAdminLocation(admin.AdminLocation);
    };
    fetchAdminLocation();
  }, []);

  const handleInputChange = (index, value) => {
    const updated = [...bookIds];
    updated[index] = value;
    setBookIds(updated);
  };

  const handleFetchBooks = async () => {
    const cleanedIds = bookIds.filter((id) => id.trim() !== '');
    const bookDetails = [];

    for (const id of cleanedIds) {
      const { data: catalog, error } = await supabase
        .from('catalog')
        .select('ISBN13, Title, Authors, Thumbnail')
        .or(`ISBN13.eq.${id},BookID.eq.${id}`)
        .maybeSingle();

      if (error || !catalog) continue;
      bookDetails.push(catalog);
    }

    setBooks(bookDetails);
    setStep(2);
  };

  const handleConfirmIssue = async () => {
    const today = new Date().toISOString().split('T')[0];
    const inserts = books.map((book) => ({
      ISBN13: book.ISBN13,
      BookingDate: today,
      MemberID: customerId,
      LibraryBranch: adminLocation,
    }));

    const { error } = await supabase.from('circulationhistory').insert(inserts);
    if (error) {
      setMessage('❌ Failed to issue books: ' + error.message);
    } else {
      setMessage('✅ Books successfully issued!');
      setBooks([]);
      setBookIds(Array(10).fill(''));
      setCustomerId('');
      setStep(1);
    }
  };

  if (!adminLocation) return <p className="text-center p-4">Loading or unauthorized...</p>;

  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded shadow mt-6">
      <h2 className="text-2xl font-bold text-center text-indigo-700 mb-4">Issue Books</h2>

      {step === 1 && (
        <>
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Enter Customer ID"
            className="w-full mb-3 p-2 border border-gray-300 rounded"
          />
          {bookIds.map((id, idx) => (
            <input
              key={idx}
              type="text"
              value={id}
              onChange={(e) => handleInputChange(idx, e.target.value)}
              placeholder={`Book ${idx + 1} ID / ISBN`}
              className="w-full mb-2 p-2 border border-gray-300 rounded"
            />
          ))}
          <button
            onClick={handleFetchBooks}
            className="w-full mt-3 bg-indigo-600 text-white py-2 rounded"
          >
            Fetch Book Details
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-4">
            {books.map((book, idx) => (
              <div key={idx} className="p-2 border rounded bg-gray-50">
                <div className="flex items-center">
                  <img src={book.Thumbnail} alt="thumbnail" className="w-16 h-20 object-cover rounded mr-4" />
                  <div>
                    <p className="font-bold">{book.Title}</p>
                    <p className="text-sm text-gray-600">{book.Authors}</p>
                    <p className="text-xs text-gray-500">ISBN: {book.ISBN13}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleConfirmIssue}
            className="w-full mt-4 bg-green-600 text-white py-2 rounded"
          >
            Confirm & Issue Books
          </button>
        </>
      )}

      {message && (
        <p className="text-center mt-4 text-red-600 font-semibold">{message}</p>
      )}
    </div>
  );
}
