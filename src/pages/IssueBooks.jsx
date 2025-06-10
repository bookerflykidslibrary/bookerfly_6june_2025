import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

function CustomerSelector({ onCustomerSelect }) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerOptions([]);
        return;
      }

      const { data, error } = await supabase
        .from('customerinfo')
        .select('CustomerID, Name, EmailID, ChildName, ChildAge')
        .or(`Name.ilike.%${customerSearch}%,EmailID.ilike.%${customerSearch}%`)
        .limit(10);

      if (!error && data) {
        setCustomerOptions(data);
      }
    };

    fetchCustomers();
  }, [customerSearch]);

  const handleSelect = (cust) => {
    setSelectedCustomer(cust);
    setCustomerSearch(`${cust.Name} <${cust.EmailID}>`);
    setCustomerOptions([]);
    onCustomerSelect(cust);
  };

  return (
    <div className="mb-6 relative z-50">
      <label className="block font-semibold text-gray-700 mb-1">Search Customer:</label>
      <input
        type="text"
        className="w-full p-2 border rounded shadow-sm"
        placeholder="Type name or email"
        value={customerSearch}
        onChange={(e) => {
          setCustomerSearch(e.target.value);
          setSelectedCustomer(null);
          onCustomerSelect(null);
        }}
      />
      {customerOptions.length > 0 && (
        <ul className="absolute w-full bg-white border rounded shadow max-h-60 overflow-y-auto mt-1">
          {customerOptions.map((cust) => (
            <li
              key={cust.CustomerID}
              className="px-3 py-2 hover:bg-purple-100 cursor-pointer"
              onClick={() => handleSelect(cust)}
            >
              {cust.Name} &lt;{cust.EmailID}&gt; | 👶 {cust.ChildName} (Age {cust.ChildAge})
            </li>
          ))}
        </ul>
      )}
      {selectedCustomer && (
        <div className="mt-2 text-sm text-green-700">
          Selected: <strong>{selectedCustomer.Name}</strong> – Child: <strong>{selectedCustomer.ChildName}</strong> (Age {selectedCustomer.ChildAge})
        </div>
      )}
    </div>
  );
}

export default CustomerSelector;
