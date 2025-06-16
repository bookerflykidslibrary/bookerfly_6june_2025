import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 200;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hiddenRead, setHiddenRead] = useState([]);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [loading, setLoading] = useState(true);
  const [addedRequests, setAddedRequests] = useState({});

  useEffect(() => {
    if (user?.email) fetchReadBooks(user.email);
  }, [user]);

  useEffect(() => {
    loadBooks();
  }, [page, appliedFilters]);

  const fetchReadBooks = async (email) => {
    const { data: customer, error } = await supabase
      .from('customerinfo')
      .select('userid')
      .eq('EmailID', email)
      .single();

    if (error || !customer) return;

    const { data: readHistory } = await supabase
      .from('circulationhistory')
      .select('ISBN13')
      .eq('MemberID', customer.userid);

    if (readHistory) setHiddenRead(readHistory.map(b => b.ISBN13));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleBookRequest = async (book) => {
    if (!user?.email) {
      alert('Please log in to request a book.');
      return;
    }

    const { data: customer, error: customerError } = await supabase
      .from('customerinfo')
      .select('userid')
      .eq('EmailID', user.email)
      .single();

    if (customerError || !customer) {
      alert('User not found in customerinfo.');
      return;
    }

    const userID = customer.userid;

    const { data: existingRequests, error: serialFetchError } = await supabase
      .from('circulationfuture')
      .select('SerialNumberOfIssue')
      .eq('ISBN13', book.ISBN13)
      .eq('userid', userID)
      .order('SerialNumberOfIssue', { ascending: false })
      .limit(1);

    if (serialFetchError) {
      alert('Could not check existing requests.');
      return;
    }

    const nextSerial = (existingRequests?.[0]?.SerialNumberOfIssue ?? 0) + 1;

    const { error: insertError } = await supabase
      .from('circulationfuture')
      .insert({
        ISBN13: book.ISBN13,
        CopyNumber: null,
        SerialNumberOfIssue: nextSerial,
        userid: userID
      });

    if (insertError) {
      alert('Failed to add request.');
      return;
    }

    setAddedRequests(prev => ({ ...prev, [book.ISBN13]: true }));
  };

  const loadBooks = async () => {
    setLoading(true);
    let query = supabase.from('catalog').select('BookID,ISBN13,Title,Authors,MinAge,MaxAge,Thumbnail,Description').limit(1000);

    if (appliedFilters) {
      const { minAge, maxAge, author, title } = appliedFilters;
      if (minAge && maxAge) query = query.lte('MinAge', maxAge).gte('MaxAge', minAge);
      if (author) query = query.ilike('Authors', `%${author}%`);
      if (title) query = query.ilike('Title', `%${title}%`);
    }

    const { data: catalogBooks, error: catalogError } = await query;
    if (catalogError) {
      setLoading(false);
      return;
    }

    const isbnList = catalogBooks.map(book => book.ISBN13);
    const { data: copyinfo } = await supabase
      .from('copyinfo')
      .select('ISBN13, CopyBooked, AskPrice')
      .in('ISBN13', isbnList);

    const availabilityMap = {};
    const priceMap = {};
    for (const copy of copyinfo) {
      if (!availabilityMap[copy.ISBN13]) availabilityMap[copy.ISBN13] = false;
      if (!copy.CopyBooked) availabilityMap[copy.ISBN13] = true;
      if (copy.AskPrice !== null && (!priceMap[copy.ISBN13] || copy.AskPrice < priceMap[copy.ISBN13])) {
        priceMap[copy.ISBN13] = copy.AskPrice;
      }
    }

    const filteredBooks = catalogBooks.filter(book => availabilityMap[book.ISBN13] && !hiddenRead.includes(book.ISBN13));
    filteredBooks.forEach(book => book.minPrice = priceMap[book.ISBN13] ?? null);

    const randomized = filteredBooks.sort(() => 0.5 - Math.random());
    setBooks(randomized.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    setLoading(false);
  };

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const toggleDescription = (id) => setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-pink-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-center text-purple-700">Bookerfly Kids Library - Book Catalog</h1>

      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input type="number" placeholder="Min Age" className="input" onChange={e => handleFilterChange('minAge', e.target.value)} />
          <input type="number" placeholder="Max Age" className="input" onChange={e => handleFilterChange('maxAge', e.target.value)} />
          <input type="text" placeholder="Author" className="input" onChange={e => handleFilterChange('author', e.target.value)} />
          <input type="text" placeholder="Title" className="input" onChange={e => handleFilterChange('title', e.target.value)} />
        </div>
        <button className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-800" onClick={applyFilters}>Apply Filters</button>
      </div>

      {hiddenRead?.length > 0 && <p className="text-sm text-red-600 font-medium mb-4">Hidden books already read previously by you.</p>}

      {loading ? <p>Loading...</p> : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {books.map(book => (
            <div key={book.BookID} className="bg-white rounded-xl p-4 shadow-md flex flex-col">
              <img src={book.Thumbnail} alt={book.Title} className="h-40 object-contain mb-2 mx-auto" />
              <h2 className="text-lg font-bold text-purple-800">{book.Title}</h2>
              <p className="text-sm text-gray-600 italic">{book.Authors}</p>
              <p className="text-xs text-gray-800 mt-1">
                {book.Description?.length > 120 ? (
                  expandedDesc[book.BookID] ? book.Description : `${book.Description?.substring(0, 120)}... `
                ) : book.Description}
                {book.Description?.length > 120 && (
                  <span onClick={() => toggleDescription(book.BookID)} className="text-blue-500 cursor-pointer underline">more</span>
                )}
              </p>
              <p className="text-sm text-gray-700 mt-1">Age Group: {book.MinAge} - {book.MaxAge}</p>
              <button
                onClick={() => handleBookRequest(book)}
                className="text-white bg-blue-500 px-3 py-1 mt-2 rounded hover:bg-blue-700 text-xs w-fit"
              >
                {addedRequests[book.ISBN13] ? 'Added to your future requests :-)' : 'Request for Me'}
              </button>
              <div className="mt-2 text-xs text-gray-700">
                <div className="flex flex-col sm:flex-row gap-2">
                  {book.minPrice && <span className="text-green-600 font-semibold">Buy from us at ₹{book.minPrice}</span>}
                 <a href={`https://www.amazon.in/s?k=${encodeURIComponent(book.Title + ' ' + book.ISBN13)}&tag=123432543556`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-orange-600 hover:underline">
                   Buy on Amazon <FaExternalLinkAlt />
                 </a>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-between items-center">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn">Previous</button>
        <span className="text-sm">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} className="btn">Next</button>
      </div>
    </div>
  );
}
