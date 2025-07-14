// Updated Download Collage Button to open a new window for screenshot

import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';
import ScannerDialog from '../components/ScannerDialog';

export default function IssueBooks() {
  const [bookInputs, setBookInputs] = useState(Array(10).fill({ value: '', type: 'ISBN13' }));
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [books, setBooks] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLocation, setAdminLocation] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState(null);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(null);

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

  useEffect(() => {
    if (customerSearch.trim().length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      const trimmed = customerSearch.trim();
      const orClause = [
        `CustomerName.ilike.*${trimmed}*`,
        `EmailID.ilike.*${trimmed}*`
      ];
      const { data, error } = await supabase
          .from('customerinfo')
          .select('CustomerID, CustomerName, EmailID')
          .or(orClause.join(','))
          .limit(10);
      if (!error) setCustomerSuggestions(data || []);
      else setCustomerSuggestions([]);
    };
    fetchSuggestions();
  }, [customerSearch]);

  const handleSelectCustomer = async (customerId) => {
    const { data: customer } = await supabase
        .from('customerinfo')
        .select('*')
        .eq('CustomerID', customerId)
        .single();

    if (customer) {
      setSelectedCustomer(customer);
      setCustomerSearch(`${customer.CustomerName} (${customer.EmailID})`);
      setCustomerSuggestions([]);
      const { data: plan } = await supabase
          .from('membershipplans')
          .select('NumberOfBooks')
          .eq('PlanName', customer.SubscriptionPlan)
          .single();

      const bookLimit = parseInt(plan?.NumberOfBooks || '0', 10);
      const { data: wishlist } = await supabase
          .from('circulationfuture')
          .select('ISBN13')
          .eq('userid', customer.userid)
          .order('SerialNumberOfIssue')
          .limit(bookLimit);

      const inputs = Array(10).fill({ value: '', type: 'ISBN13' });
      wishlist?.forEach((w, i) => {
        if (i < 10) inputs[i] = { value: w.ISBN13, type: 'ISBN13' };
      });
      setBookInputs(inputs);
    }
  };

  const fetchBookTitleSuggestions = async (text) => {
    const { data } = await supabase
        .from('catalog')
        .select('Title, ISBN13')
        .ilike('Title', `%${text}%`)
        .limit(20);

    setTitleSuggestions(data || []);
  };

  const handleInputChange = (index, field, value) => {
    const updated = [...bookInputs];
    updated[index] = { ...updated[index], [field]: value };
    setBookInputs(updated);
    if (field === 'value' && updated[index].type === 'ISBN13' && value.length >= 3) {
      setFocusedIndex(index);
      fetchBookTitleSuggestions(value);
    } else {
      setTitleSuggestions([]);
    }
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
      const isbn = entry.value;
      if (entry.type === 'ISBN13') {
        const { data: copy } = await supabase
            .from('copyinfo')
            .select('CopyID, ISBN13, CopyNumber')
            .eq('ISBN13', isbn)
            .eq('CopyLocation', adminLocation)
            .eq('CopyBooked', false)
            .limit(1)
            .maybeSingle();

        if (!copy) {
          allBooks.push({ error: `No available copy for ISBN: ${isbn}` });
          continue;
        }

        const { data: book } = await supabase
            .from('catalog')
            .select('Title, Authors, ISBN13, Thumbnail')
            .eq('ISBN13', isbn)
            .single();

        allBooks.push({ ...book, CopyID: copy.CopyID, CopyNumber: copy.CopyNumber });
      }
    }
    setBooks(allBooks);
    setConfirming(true);
    setMessage('');
  };

  const handleOpenCollagePage = () => {
    const thumbnails = books.filter(b => !b.error && b.Thumbnail).map(b => b.Thumbnail);
    const customer = selectedCustomer?.CustomerName || 'customer';
    const url = `/collage-viewer?images=${encodeURIComponent(JSON.stringify(thumbnails))}&name=${encodeURIComponent(customer)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-md mx-auto p-4">
      {/* ... existing form elements ... */}

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
          <button onClick={handleConfirm} className="w-full mt-4 bg-green-600 text-white py-2 rounded">
            Confirm Issue
          </button>
          <button onClick={handleOpenCollagePage} className="w-full mt-2 bg-blue-500 text-white py-2 rounded">
            📸 Open Collage Page
          </button>
        </div>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-blue-700 font-semibold">
          DEBUG MESSAGE: {message || 'No message'}
        </p>
      )}
    </div>
  );
}
