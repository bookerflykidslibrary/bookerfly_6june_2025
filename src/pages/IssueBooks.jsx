import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [bookInputs, setBookInputs] = useState(Array(10).fill({ value: '', type: 'ISBN13' }));
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

  const handleInputChange = (index, field, value) => {
    const updated = [...bookInputs];
    updated[index] = { ...updated[index], [field]: value };
    setBookInputs(updated);
  };

  const handleReview = async () => {
    const filtered = bookInputs.filter(entry => entry.value.trim() !== '');
    if (!customerId || filtered.length === 0) {
      setMessage('Please enter Customer ID and at least one Book ID/ISBN.');
      return;
    }

    let allBooks = [];

    for (let entry of filtered) {
      if (entry.type === 'ISBN13') {
        const { data, error } = await supabase
          .from('catalog')
          .select('Title, Authors, ISBN13, Thumbnail')
          .eq('ISBN13', entry.value)
          .single();

        if (data) allBooks.push(data);
      } else if (entry.type === 'CopyLocationID') {
        const { data: copy, error: copyErr } = await supabase
          .from('copyinfo')
          .select('ISBN13')
          .eq('CopyLocationID', entry.value)
          .single();

        if (copy?.ISBN13) {
          const { data: book } = await supabase
            .from('catalog')
            .select('Title, Authors, ISBN13, Thumbnail')
            .eq('ISBN13', copy.ISBN13)
            .single();
          if (book) allBooks.push(book);
        }
      }
    }

    setBooks(allBooks);
    setConfirming(true);
    setMessage('');
  };

  const handleConfirm = async () => {
    const today = new Date().toISOString();
    const records = books.map(book => ({
      LibraryBranch: adminLocation,
      ISBN13: book.ISBN13,
      BookingDate: today,
      MemberID: customerId,
      ReturnDate: null,
      Comment: '',
    }));

    const { error } = await supabase.from('circulationhistory').insert(records);

    if (error) {
      setMessage('Error issuing books: ' + error.message);
    } else {
      setMessage('✅ Books issued successfully!');
      setConfirming(false);
      setBooks([]);
      setBookInputs(Array(10).fill({ value: '', type: 'ISBN13' }));
      setCustomerId('');
    }
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

      {bookInputs.map((entry, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select
            value={entry.type}
            onChange={(e) => handleInputChange(index, 'type', e.target.value)}
            className="p-2 border rounded w-1/3"
          >
            <option value="ISBN13">ISBN13</option>
            <option value="CopyLocationID">CopyLocationID</option>
          </select>
          <input
            type="text"
            placeholder={`Book ${index + 1}`}
            value={entry.value}
            onChange={(e) => handleInputChange(index, 'value', e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded"
          />
        </div>
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
              {b.Thumbnail && <img src={b.Thumbnail} alt="thumb" className="w-12 h-auto rounded" />}
              <div>
                <p className="text-sm font-bold">{b.Title}</p>
                <p className="text-xs text-gray-600">{b.Authors}</p>
              </div>
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

      {message && <p className="mt-4 text-center text-sm text-blue-700 font-semibold">{message}</p>}
    </div>
  );
}
