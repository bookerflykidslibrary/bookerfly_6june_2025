import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

const Catalog = ({ user }) => {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [readISBNs, setReadISBNs] = useState([]);
  const [hideReadMessage, setHideReadMessage] = useState(false);

  useEffect(() => {
    if (user) fetchReadISBNs();
  }, [user]);

  useEffect(() => {
    loadBooks();
  }, [page, appliedFilters]);

  const fetchReadISBNs = async () => {
    const { data: customer } = await supabase
      .from('customerinfo')
      .select('CustomerID')
      .or(`EmailID.eq.${user.email},MobileNumber.eq.${user.phone}`)
      .single();

    if (customer) {
      const { data: readHistory } = await supabase
        .from('circulationhistory')
        .select('ISBN13')
        .eq('MemberID', customer.CustomerID);

      if (readHistory) {
        setReadISBNs(readHistory.map(b => b.ISBN13));
        setHideReadMessage(true);
      }
    }
  };

  const loadBooks = async () => {
    let query = supabase
      .from('catalog')
      .select('*')
      .range((page - 1) * 50, page * 50 - 1)
      .order('random()', { ascending: true });

    if (appliedFilters) {
      if (appliedFilters.minAge) query = query.gte('MinAge', appliedFilters.minAge);
      if (appliedFilters.maxAge) query = query.lte('Max_Age', appliedFilters.maxAge);
      if (appliedFilters.author) query = query.ilike('Authors', `%${appliedFilters.author}%`);
      if (appliedFilters.title) query = query.ilike('Title', `%${appliedFilters.title}%`);
    }

    let { data: allBooks } = await query;

    // Filter out books where all copies are booked
    const { data: copyinfo } = await supabase.from('copyinfo').select('ISBN13, CopyBooked, AskPrice');
    const availableISBNs = new Set();
    const askPriceMap = {};

    copyinfo.forEach(copy => {
      if (!copy.CopyBooked) availableISBNs.add(copy.ISBN13);
      if (copy.AskPrice !== null) {
        if (!askPriceMap[copy.ISBN13] || copy.AskPrice < askPriceMap[copy.ISBN13]) {
          askPriceMap[copy.ISBN13] = copy.AskPrice;
        }
      }
    });

    let filteredBooks = allBooks.filter(book => availableISBNs.has(book.ISBN13));
    if (readISBNs.length > 0) {
      filteredBooks = filteredBooks.filter(book => !readISBNs.includes(book.ISBN13));
    }

    setBooks(filteredBooks);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-4">Bookerfly Kids Library - Book Catalog</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <input type="number" placeholder="Min Age" className="p-2 border rounded" value={filters.minAge} onChange={e => setFilters({ ...filters, minAge: e.target.value })} />
          <input type="number" placeholder="Max Age" className="p-2 border rounded" value={filters.maxAge} onChange={e => setFilters({ ...filters, maxAge: e.target.value })} />
          <input type="text" placeholder="Author" className="p-2 border rounded" value={filters.author} onChange={e => setFilters({ ...filters, author: e.target.value })} />
          <input type="text" placeholder="Title" className="p-2 border rounded" value={filters.title} onChange={e => setFilters({ ...filters, title: e.target.value })} />
        </div>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={applyFilters}>Apply Filters</button>
      </div>

      {hideReadMessage && <div className="text-sm text-red-500 mb-4">Hidden books already read previously by you.</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {books.map(book => (
          <div key={book.BookID} className="bg-white p-4 rounded-lg shadow">
            <img src={book.Thumbnail} alt={book.Title} className="w-full h-48 object-cover rounded mb-4" />
            <div className="font-bold text-lg mb-1">{book.Title}</div>
            <div className="text-sm text-gray-600 mb-1">By: {book.Authors}</div>
            <div className="text-sm text-gray-600 mb-1">Age Group: {book.MinAge} to {book.Max_Age}</div>
            <div className="text-sm text-gray-700 mb-1">
              {book.Description && book.Description.length > 200 ? (
                <>
                  {book.Description.slice(0, 200)}... <span className="text-blue-600 cursor-pointer" onClick={() => alert(book.Description)}>more</span>
                </>
              ) : book.Description}
            </div>
            <div className="mt-2">
              <a href="#" className="text-green-600 underline block">Book for me</a>
              <div className="text-sm mt-1">
                <a href={`https://www.amazon.in/s?k=${book.ISBN13}&tag=123432543556`} className="text-blue-600 underline mr-2">Buy on Amazon</a>
                {askPriceMap[book.ISBN13] && <span className="text-black">Buy from us at ₹{askPriceMap[book.ISBN13]}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Catalog;
