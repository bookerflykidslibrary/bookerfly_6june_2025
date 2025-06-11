import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [bookInputs, setBookInputs] = useState(Array(10).fill({ value: '', type: 'ISBN13' }));
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [books, setBooks] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLocation, setAdminLocation] = useState('');
  const [scanning, setScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: admin } = await supabase
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

  const handleScannedISBN = (isbn) => {
    setBookInputs((prevInputs) => {
      const indexToFill = prevInputs.findIndex(entry => entry.value.trim() === '');
      if (indexToFill === -1) {
        setMessage('All input boxes are full! Stopping scanner.');
        stopScanner();
        return prevInputs;
      }
      const updated = [...prevInputs];
      updated[indexToFill] = { value: isbn, type: 'ISBN13' };
      setMessage(`✅ Scanned ISBN: ${isbn}`);
      return updated;
    });
  };

  const startScanner = async () => {
    if (scanning) return;
    setScanning(true);
    html5QrCodeRef.current = new Html5Qrcode("scanner");
    html5QrCodeRef.current.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        handleScannedISBN(decodedText);
      },
      (error) => {}
    );
  };

  const stopScanner = () => {
    html5QrCodeRef.current?.stop().then(() => {
      html5QrCodeRef.current.clear();
      setScanning(false);
    });
  };

  const handleReview = async () => {
    if (!selectedCustomer?.CustomerID) {
      setMessage('Please select a customer.');
      return;
    }

    const filtered = bookInputs.filter(entry => entry.value.trim() !== '');
    if (filtered.length === 0) {
      setMessage('Please enter at least one Book ID or scan.');
      return;
    }

    let allBooks = [];

    for (let entry of filtered) {
      if (entry.type === 'ISBN13') {
        const { data: copy } = await supabase
          .from('copyinfo')
          .select('CopyID, ISBN13, CopyNumber')
          .eq('ISBN13', entry.value)
          .eq('CopyLocation', adminLocation)
          .eq('CopyBooked', false)
          .limit(1)
          .maybeSingle();

        if (!copy) {
          allBooks.push({ error: `No available copy found for ${entry.value}` });
          continue;
        }

        const { data: book } = await supabase
          .from('catalog')
          .select('Title, Authors, ISBN13, Thumbnail')
          .eq('ISBN13', copy.ISBN13)
          .single();

        if (book) {
          allBooks.push({ ...book, CopyID: copy.CopyID, CopyNumber: copy.CopyNumber });
        }

      } else if (entry.type === 'CopyLocationID') {
        const { data: copy } = await supabase
          .from('copyinfo')
          .select('CopyID, ISBN13, CopyBooked, CopyNumber')
          .eq('CopyLocationID', entry.value)
          .maybeSingle();

        if (!copy) {
          allBooks.push({ error: `Invalid CopyLocationID: ${entry.value}` });
          continue;
        }

        if (copy.CopyBooked) {
          allBooks.push({ error: `Copy ${entry.value} is already booked.` });
          continue;
        }

        const { data: book } = await supabase
          .from('catalog')
          .select('Title, Authors, ISBN13, Thumbnail')
          .eq('ISBN13', copy.ISBN13)
          .single();

        if (book) {
          allBooks.push({ ...book, CopyID: copy.CopyID, CopyNumber: copy.CopyNumber });
        }
      }
    }

    setBooks(allBooks);
    setConfirming(true);
    setMessage('');
  };

  const handleConfirm = async () => {
    const today = new Date().toISOString();
    const validBooks = books.filter(b => !b.error);

    const records = validBooks.map(book => ({
      LibraryBranch: adminLocation,
      ISBN13: book.ISBN13,
      CopyID: book.CopyID,
      BookingDate: today,
      ReturnDate: null,
      MemberID: selectedCustomer.CustomerID,
      Comment: '',
    }));

    const { error } = await supabase.from('circulationhistory').insert(records);

    if (error) {
      setMessage('Error issuing books: ' + error.message);
    } else {
      await supabase
        .from('copyinfo')
        .update({ CopyBooked: true })
        .in('CopyID', validBooks.map(b => b.CopyID));

      setMessage('✅ Books issued successfully!');
      setConfirming(false);
      setBooks([]);
      setBookInputs(Array(10).fill({ value: '', type: 'ISBN13' }));
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
        placeholder="Customer ID"
        className="w-full p-2 mb-4 border border-gray-300 rounded"
        onChange={(e) => setSelectedCustomer({ CustomerID: e.target.value })}
      />

      {bookInputs.map((entry, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select
            value={entry.type}
            onChange={(e) => handleInputChange(index, 'type', e.target.value)}
            className="p-2 border rounded w-1/3"
          >
            <option value="ISBN13">ISBN13</option>
            <option value="CopyLocationID">CopyLocation</option>
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
        onClick={startScanner}
        className="w-full mb-2 bg-blue-600 text-white py-2 rounded"
      >
        📷 Start Scanner
      </button>

      {scanning && (
        <div className="mb-4">
          <div id="scanner" className="w-full h-64 bg-gray-100 rounded" />
          <button
            onClick={stopScanner}
            className="mt-2 text-sm text-red-600 underline"
          >
            Stop Scanning
          </button>
        </div>
      )}

      <button
        onClick={handleReview}
        className="w-full mt-2 bg-purple-600 text-white py-2 rounded"
      >
        Review Books
      </button>

      <button
        onClick={() => {
          setBookInputs(Array(10).fill({ value: '', type: 'ISBN13' }));
          setMessage('');
        }}
        className="w-full mt-2 bg-gray-300 text-black py-2 rounded"
      >
        🔄 Reset Book Entries
      </button>

      {confirming && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-700">Confirm Issue:</h3>
          {books.map((b, i) =>
            b.error ? (
              <p key={i} className="text-red-600 text-sm">❌ {b.error}</p>
            ) : (
              <div key={i} className="flex items-center gap-2 py-2 border-b">
                {b.Thumbnail && <img src={b.Thumbnail} alt="thumb" className="w-12 h-auto rounded" />}
                <div>
                  <p className="text-sm font-bold">{b.Title}</p>
                  <p className="text-xs text-gray-600">{b.Authors}</p>
                  <p className="text-xs text-green-600">Copy number <strong>{b.CopyNumber}</strong> will be issued</p>
                </div>
              </div>
            )
          )}
          {books.some(b => !b.error) && (
            <button
              onClick={handleConfirm}
              className="w-full mt-4 bg-green-600 text-white py-2 rounded"
            >
              Confirm Issue
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-blue-700 font-semibold">{message}</p>
      )}
    </div>
  );
}
