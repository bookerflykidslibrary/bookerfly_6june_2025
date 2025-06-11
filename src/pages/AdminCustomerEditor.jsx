import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function AdminCustomerEditor({ user }) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!user) return;

    // 🔐 Log JWT admin flag and API key
    console.log('👤 Logged in as:', user.email);
    console.log('🔑 is_admin:', user.app_metadata?.is_admin);
    console.log('🔑 API KEY present:', !!process.env.REACT_APP_PUBLIC_SUPABASE_ANON_KEY);
  }, [user]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const trimmed = search.trim();
      const isNumeric = /^\d+$/.test(trimmed);

      let orClause = [
        `CustomerName.ilike.*${trimmed}*`,
        `EmailID.ilike.*${trimmed}*`,
        `ContactNo.ilike.*${trimmed}*`,
      ];

      if (isNumeric) {
        orClause.push(`CustomerID.eq.${trimmed}`);
      }

      const orString = orClause.join(',');
      console.log('🔍 Autocomplete OR clause:', orString);

      const { data, error } = await supabase
        .from('customerinfo')
        .select('CustomerID, CustomerName, EmailID, ContactNo')
        .or(`(${orString})`)
        .limit(10);

      if (error) {
        console.error('❌ Autocomplete error:', error.message);
        setSuggestions([]);
      } else {
        console.log('✅ Suggestions:', data.length);
        setSuggestions(data || []);
      }
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
      console.error('❌ Failed to load customer:', error.message);
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

    if (!error) {
      alert('✅ Customer updated successfully!');
    } else {
      console.error('❌ Update failed:', error.message);
      alert('Failed to update.');
    }
  };

  if (!user?.app_metadata?.is_admin) {
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
              #{c.CustomerID} — {c.CustomerName}, {c.EmailID}, {c.ContactNo}
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
