import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

function buildSafeOrClause(search) {
  const trimmed = search.trim();
  const isNumeric = /^\d+$/.test(trimmed);

  const conditions = [
    `Name.ilike.*${trimmed}*`,
    `EmailID.ilike.*${trimmed}*`,
    `MobileNumber.ilike.*${trimmed}*`,
  ];

  if (isNumeric) {
    conditions.push(`CustomerID.eq.${trimmed}`);
  }

  return encodeURIComponent(`(${conditions.join(',')})`);
}

export default function AdminCustomerEditor({ user }) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const orEncoded = buildSafeOrClause(search);
      const url = `https://sawufgyypmprtnuwvgnd.supabase.co/rest/v1/customerinfo?select=CustomerID,Name,EmailID,MobileNumber&or=${orEncoded}&limit=10`;

      console.log('🔍 Fetching:', url);

      const response = await fetch(url, {
        headers: {
          apikey: process.env.REACT_APP_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.REACT_APP_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Bad request:', errorText);
        setSuggestions([]);
        return;
      }

      const data = await response.json();
      setSuggestions(data);
    };

    fetchSuggestions();
  }, [search]);

  const handleSelect = async (customerId) => {
    const { data, error } = await supabase
      .from('customerinfo')
      .select('*')
      .eq('CustomerID', customerId)
      .single();

    if (!error) {
      setSelectedCustomer(data);
      setFormData(data);
      setSuggestions([]);
      setSearch('');
    } else {
      alert('Customer not found');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('customerinfo')
      .update(formData)
      .eq('CustomerID', formData.CustomerID);

    if (!error) alert('✅ Customer updated successfully!');
    else alert('❌ Failed to update.');
  };

  if (user?.email !== 'vkansal12@gmail.com') {
    return <div className="p-4 text-red-600">Access Denied</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Admin: Edit Customer Info</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by ID, Name, Email or Phone"
        className="border p-2 rounded w-full"
      />

      {suggestions.length > 0 && (
        <ul className="bg-white border mt-1 max-h-48 overflow-auto shadow rounded z-10 relative">
          {suggestions.map((c) => (
            <li
              key={c.CustomerID}
              onClick={() => handleSelect(c.CustomerID)}
              className="p-2 hover:bg-blue-100 cursor-pointer"
            >
              #{c.CustomerID} — {c.Name}, {c.EmailID}, {c.MobileNumber}
            </li>
          ))}
        </ul>
      )}

      {selectedCustomer && (
        <div className="mt-6 space-y-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-semibold">{key}</label>
              <input
                type="text"
                value={value ?? ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full border px-2 py-1 rounded"
              />
            </div>
          ))}

          <button
            onClick={handleSave}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Confirm Update
          </button>
        </div>
      )}
    </div>
  );
}
