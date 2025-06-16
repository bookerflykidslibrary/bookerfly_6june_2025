// Updated IssueBooks page with plan-based issuing limit and serial fix
import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function IssueBooks() {
  const [wishlist, setWishlist] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLocation, setAdminLocation] = useState('');

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

  const fetchWishlist = async (customerId) => {
    const { data, error } = await supabase
      .from('circulationfuture')
      .select('*')
      .eq('userid', customerId)
      .order('SerialNumberOfIssue');

    if (!error) setWishlist(data);
    else setWishlist([]);
  };

  const handleSelectCustomer = async (customerId) => {
    const { data, error } = await supabase
      .from('customerinfo')
      .select('*')
      .eq('CustomerID', customerId)
      .single();

    if (!error) {
      setSelectedCustomer(data);
      setCustomerSearch('');
      setCustomerSuggestions([]);
      fetchWishlist(data.userid);
    }
  };

  const handleConfirmIssue = async () => {
    if (!selectedCustomer) return;

    const today = new Date().toISOString();
    const toIssue = [];

    for (const item of wishlist) {
      const { data: copy } = await supabase
        .from('copyinfo')
        .select('CopyID, CopyBooked, CopyNumber')
        .eq('ISBN13', item.ISBN13)
        .eq('CopyBooked', false)
        .eq('CopyLocation', adminLocation)
        .limit(1)
        .maybeSingle();

      if (copy) {
        toIssue.push({
          ISBN13: item.ISBN13,
          CopyID: copy.CopyID,
          CopyNumber: copy.CopyNumber,
          CirculationID: item.CirculationID
        });
      }
    }

    if (toIssue.length === 0) {
      setMessage('❌ No available books found to issue.');
      return;
    }

    // STEP 1: Get user subscription plan name
    const { data: customerInfo } = await supabase
      .from('customerinfo')
      .select('SubscriptionPlan')
      .eq('CustomerID', selectedCustomer.CustomerID)
      .single();

    const planName = customerInfo?.SubscriptionPlan;

    // STEP 2: Get NumberOfBooks limit from membershipplans
    const { data: planData } = await supabase
      .from('membershipplans')
      .select('NumberOfBooks')
      .eq('PlanName', planName)
      .single();

    const maxBooksAllowed = parseInt(planData?.NumberOfBooks || '0');

    const booksToIssue = toIssue.slice(0, maxBooksAllowed);

    const insertRecords = booksToIssue.map(b => ({
      LibraryBranch: adminLocation,
      ISBN13: b.ISBN13,
      CopyID: b.CopyID,
      BookingDate: today,
      ReturnDate: null,
      MemberID: selectedCustomer.CustomerID,
      Comment: ''
    }));

    const { error: issueError } = await supabase
      .from('circulationhistory')
      .insert(insertRecords);

    if (issueError) {
      setMessage('Error issuing books: ' + issueError.message);
      return;
    }

    await supabase
      .from('copyinfo')
      .update({ CopyBooked: true })
      .in('CopyID', booksToIssue.map(b => b.CopyID));

    await supabase
      .from('circulationfuture')
      .delete()
      .in('CirculationID', booksToIssue.map(b => b.CirculationID));

    const remaining = wishlist.filter(w =>
      !booksToIssue.some(t => t.CirculationID === w.CirculationID)
    );

    // Fix serial numbers starting from 1
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from('circulationfuture')
        .update({ SerialNumberOfIssue: i + 1 })
        .eq('CirculationID', remaining[i].CirculationID);
    }

    setMessage(`✅ ${booksToIssue.length} book(s) issued successfully!`);
    fetchWishlist(selectedCustomer.userid);
  };

  useEffect(() => {
    if (customerSearch.trim().length < 2) {
      setCustomerSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const term = customerSearch.trim();
      const { data, error } = await supabase
        .from('customerinfo')
        .select('CustomerID, CustomerName, EmailID')
        .or(`CustomerName.ilike.*${term}*,EmailID.ilike.*${term}*`)
        .limit(10);

      if (!error) setCustomerSuggestions(data || []);
      else setCustomerSuggestions([]);
    };

    fetchSuggestions();
  }, [customerSearch]);

  if (!isAdmin) {
    return <div className="text-center p-4 text-red-600 font-bold">Access Denied: Admins Only</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-center text-purple-700 mb-4">Issue from Wishlist</h2>

      <input
        type="text"
        placeholder="Search by Name or Email"
        className="w-full p-2 mb-2 border border-gray-300 rounded"
        value={customerSearch}
        onChange={(e) => setCustomerSearch(e.target.value)}
      />

      {customerSuggestions.length > 0 && (
        <ul className="bg-white border mt-1 max-h-48 overflow-auto shadow rounded z-10 relative">
          {customerSuggestions.map((c) => (
            <li
              key={c.CustomerID}
              onClick={() => handleSelectCustomer(c.CustomerID)}
              className="p-2 hover:bg-blue-100 cursor-pointer"
            >
              #{c.CustomerID} — {c.CustomerName}, {c.EmailID}
            </li>
          ))}
        </ul>
      )}

      {selectedCustomer && (
        <>
          <p className="text-sm mb-4">
            Selected Customer: <strong>{selectedCustomer.CustomerID}</strong> — {selectedCustomer.CustomerName}
          </p>
          <h3 className="text-lg font-semibold mb-2">Books in Wishlist:</h3>
          <ul className="space-y-2">
            {wishlist.map((w, idx) => (
              <li key={w.CirculationID} className="border p-2 rounded bg-gray-50">
                #{idx + 1}. ISBN: <strong>{w.ISBN13}</strong> (Serial #{w.SerialNumberOfIssue})
              </li>
            ))}
          </ul>
          <button
            onClick={handleConfirmIssue}
            className="w-full mt-4 bg-green-600 text-white py-2 rounded"
          >
            ✅ Confirm Issue from Wishlist
          </button>
        </>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-blue-700 font-semibold">{message}</p>
      )}
    </div>
  );
}
