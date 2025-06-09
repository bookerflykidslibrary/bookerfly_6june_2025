import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [bookInputs, setBookInputs] = useState(
    Array(10).fill({ isbn: '', copyLocationID: '' })
  );
  const [customerId, setCustomerId] = useState('');
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
      setIsAdmin(!!admin);
    };
    checkAdmin();
  }, []);

  const handleInputChange = (index, field, value) => {
    const updated = [...bookInputs];
    updated[index][field] = value;
    setBookInputs(updated);
  };

  const fetchBookDetails = async () => {
    setMessage('');
    const details = [];

    for (const input of bookInputs) {
      let data = null;
      if (input.copyLocationID) {
        const { data: copy, error: copyErr } = await supabase
          .from('copyinfo')
          .select('ISBN13')
          .eq('CopyLocationID', input.copyLocationID)
          .single();
        if (copy?.ISBN13) {
          const { data: catalog } = await supabase
            .from('catalog')
            .select('Title, Authors, Thumbnail')
            .eq('ISBN13', copy.ISBN13)
            .single();
          if (catalog) details.push({ ...catalog, CopyLocationID: input.copyLocationID, ISBN13: copy.ISBN13 });
        }
      } else if (input.isbn) {
        const { data: catalog } = await supabase
          .from('catalog')
          .select('Title, Authors, Thumbnail')
          .eq('ISBN13', input.isbn)
          .single();
        if (catalog) details.push({ ...catalog, ISBN13: input.isbn });
      }
    }

    if (details.length === 0) return setMessage('No books found. Please check input.');
    setBookDetails(details);
  };

  const issueBooks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    const updates = bookDetails.map(book => ({
      ISBN13: book.ISBN13,
      MemberID: customerId,
      BookingDate: today,
      LibraryBranch: 'Default',
      Comment: 'Issued from IssueBooks page'
    }));

    const { error } = await supabase.from('circulationhistory').insert(updates);
    if (error) return setMessage('❌ Error issuing books: ' + error.message);

    setConfirmed(true);
    setMessage('✅ Books issued successfully!');
  };

  if (!isAdmin) return <div className="text-center mt-10 text-red-600">Access denied. Admins only.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">Issue Books</h2>
      <input
        type="text"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        placeholder="Enter Customer ID"
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      {bookInputs.map((input, index) => (
        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            value={input.isbn}
            onChange={(e) => handleInputChange(index, 'isbn', e.target.value)}
            placeholder={`Book ${index + 1} ISBN13`}
            className="p-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            value={input.copyLocationID}
            onChange={(e) => handleInputChange(index, 'copyLocationID', e.target.value)}
            placeholder={`Book ${index + 1} CopyLocationID`}
            className="p-2 border border-gray-300 rounded"
          />
        </div>
      ))}
      <button
        onClick={fetchBookDetails}
        className="w-full bg-blue-600 text-white py-2 rounded mt-4"
      >
        Issue Books
      </button>

      {bookDetails.length > 0 && !confirmed && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Confirm Book Details</h3>
          <div className="space-y-4">
            {bookDetails.map((book, i) => (
              <div key={i} className="flex items-start space-x-4">
                {book.Thumbnail && (
                  <img src={book.Thumbnail} alt="thumb" className="w-16 h-24 object-cover rounded" />
                )}
                <div>
                  <p className="font-bold">{book.Title}</p>
                  <p className="text-sm">{book.Authors}</p>
                  <p className="text-sm text-gray-500">{book.ISBN13}</p>
                </div>
              </div>
            ))}
            <button
              onClick={issueBooks}
              className="w-full bg-green-600 text-white py-2 rounded mt-4"
            >
              Confirm & Issue
            </button>
          </div>
        </div>
      )}
      {message && <p className="mt-6 text-center text-lg text-green-700">{message}</p>}
    </div>
  );
}
