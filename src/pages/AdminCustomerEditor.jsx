import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function CustomerSelector({ onCustomerSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('customerinfo')
        .select('CustomerID, Name, EmailID, ChildName, ChildAge, MobileNumber')
        .ilike('Name', `%${query}%`)  // only filter by Name

      if (!error) {
        setResults(data || []);
      }
    };

    fetch();
  }, [query]);

  const handleSelect = (cust) => {
    setSelected(cust);
    setQuery(`${cust.Name}, ${cust.EmailID}, ${cust.ChildName}, ${cust.MobileNumber}`);
    setResults([]);
    onCustomerSelect(cust);
  };

  return (
    <div className="relative mb-4">
      <label className="block font-semibold text-gray-700 mb-1">Search by Customer Name:</label>
      <input
        type="text"
        placeholder="Type name"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          onCustomerSelect(null);
        }}
        className="w-full p-2 border border-gray-300 rounded"
      />
      {results.length > 0 && (
        <ul className="absolute w-full bg-white border rounded shadow max-h-60 overflow-y-auto z-10">
          {results.map((cust) => (
            <li
              key={cust.CustomerID}
              className="px-3 py-2 text-sm hover:bg-purple-100 cursor-pointer"
              onClick={() => handleSelect(cust)}
            >
              {cust.Name}, {cust.EmailID}, {cust.ChildName}, {cust.MobileNumber}
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <p className="text-green-700 text-sm mt-2">
          ✅ Selected: {selected.Name} – 👶 {selected.ChildName} (Age {selected.ChildAge})
        </p>
      )}
    </div>
  );
}
