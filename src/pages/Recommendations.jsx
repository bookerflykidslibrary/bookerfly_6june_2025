import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 2000;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hiddenRead, setHiddenRead] = useState([]);
  const [addedRequests, setAddedRequests] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) fetchReadAndRequestedBooks(user.email);
  }, [user]);

  useEffect(() => {
    if (hiddenRead !== null) loadBooks();
  }, [page, appliedFilters, hiddenRead]);

  const fetchReadAndRequestedBooks = async (email) => {
    const { data: customer } = await supabase.from('customerinfo').select('userid').eq('EmailID', email).single();
    if (!customer) return setHiddenRead([]);

    const [readResp, requestResp] = await Promise.all([
      supabase.from('circulationhistory').select('ISBN13').eq('userid', customer.userid),
      supabase.from('circulationfuture').select('ISBN13').eq('userid', customer.userid)
    ]);

    const read = (readResp.data || []).map(b => b.ISBN13?.trim().toLowerCase());
    const requested = (requestResp.data || []).map(b => b.ISBN13?.trim().toLowerCase());
    const allHidden = [...new Set([...read, ...requested])];
    setHiddenRead(allHidden);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleBookRequest = async (book) => {
    if (!user?.email) return alert('Please log in to request a book.');

    const { data: customer } = await supabase.from('customerinfo').select('userid, SubscriptionPlan').eq('EmailID', user.email).single();
    if (!customer) return alert('User not found.');

    const userID = customer.userid;
    const { data: plan } = await supabase.from('membershipplans').select('NumberOfBooks').eq('PlanName', customer.SubscriptionPlan).single();
    const maxAllowed = (parseInt(plan?.NumberOfBooks) || 0) + 2;

    const { data: currentRequests } = await supabase.from('circulationfuture').select('ISBN13').eq('userid', userID);
    if ((currentRequests?.length || 0) >= maxAllowed) {
      alert(`❌ You can only request up to ${maxAllowed} books.`);
      return;
    }

    const { data: existing } = await supabase.from('circulationfuture').select('SerialNumberOfIssue').eq('ISBN13', book.ISBN13).eq('userid', userID).order('SerialNumberOfIssue', { ascending: false }).limit(1);
    const nextSerial = (existing?.[0]?.SerialNumberOfIssue || 0) + 1;

    const { error } = await supabase.from('circulationfuture').insert({
      ISBN13: book.ISBN13,
      CopyNumber: null,
      SerialNumberOfIssue: nextSerial,
      userid: userID
    });

    if (error) return alert('Failed to add request.');
    setAddedRequests(prev => ({ ...prev, [book.ISBN13]: true }));
    setHiddenRead(prev => [...prev, book.ISBN13?.trim().toLowerCase()]);
  };

  const loadBooks = async () => {
    setLoading(true);
    let query = supabase.from('catalog').select('BookID,ISBN13,Title,Authors,MinAge,MaxAge,Thumbnail,Description').range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (appliedFilters) {
      const { minAge, maxAge, author, title } = appliedFilters;
      const min = minAge ? parseInt(minAge) : null;
      const max = maxAge ? parseInt(maxAge) : null;
      if (min !== null) query = query.gte('MaxAge', min);
      if (max !== null) query = query.lte('MinAge', max);
      if (author) query = query.ilike('Authors', `%${author}%`);
      if (title) query = query.ilike('Title', `%${title}%`);
    }

    const { data: catalogBooks } = await query;
    const isbnList = catalogBooks.map(book => book.ISBN13);

    const { data: copyinfo } = await supabase.from('copyinfo').select('ISBN13, CopyBooked, AskPrice').in('ISBN13', isbnList);
    const availabilityMap = {};
    const priceMap = {};
    for (const copy of copyinfo) {
      if (!availabilityMap[copy.ISBN13]) availabilityMap[copy.ISBN13] = false;
      if (!copy.CopyBooked) availabilityMap[copy.ISBN13] = true;
      if (copy.AskPrice !== null && (!priceMap[copy.ISBN13] || copy.AskPrice < priceMap[copy.ISBN13])) priceMap[copy.ISBN13] = copy.AskPrice;
    }

    const readSet = new Set((hiddenRead || []).map(id => id?.trim().toLowerCase()));
    const filteredBooks = catalogBooks.filter(book => {
      const isbn = book.ISBN13?.trim().toLowerCase();
      return isbn && availabilityMap[book.ISBN13] && !readSet.has(isbn);
    });

    filteredBooks.forEach(book => book.minPrice = priceMap[book.ISBN13] ?? null);
    const randomized = filteredBooks.sort(() => 0.5 - Math.random());
    setBooks(randomized.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    setLoading(false);
  };

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Bookerfly Kids Library - Book Catalog</h1>

      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input type="number" placeholder="Enter child's age" className="input" value={filters.minAge} onChange={e => handleFilterChange('minAge', e.target.value)} />
          <input type="text" placeholder="Author" className="input" value={filters.author} onChange={e => handleFilterChange('author', e.target.value)} />
          <input type="text" placeholder="Title" className="input" value={filters.title} onChange={e => handleFilterChange('title', e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg" onClick={applyFilters}>Apply Filters</button>
          <button className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg" onClick={() => { setFilters({ minAge: '', maxAge: '', author: '', title: '' }); setAppliedFilters(null); setPage(1); }}>Clear Filters</button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : books.length === 0 ? (
        <p>No books found.</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {books.map(book => (
            <div key={book.BookID} className="bg-white rounded-xl p-4 shadow-md flex flex-col">
              <img src={book.Thumbnail} alt={book.Title} className="h-60 object-contain mb-2 mx-auto" />
              <h2 className="text-lg font-bold text-purple-800">{book.Title}</h2>
              <p className="text-sm text-gray-600 italic">{book.Authors}</p>
              <p className="text-xs text-gray-800 mt-1 line-clamp-3">{book.Description}</p>
              <p className="text-sm text-gray-700 mt-1">Age Group: {book.MinAge} - {book.MaxAge}</p>
              <button
                onClick={() => handleBookRequest(book)}
                className="text-white bg-blue-500 px-3 py-1 mt-2 rounded text-xs w-fit disabled:opacity-50"
                disabled={hiddenRead.includes(book.ISBN13?.trim().toLowerCase()) || addedRequests[book.ISBN13]}
              >
                {addedRequests[book.ISBN13] ? 'Added to your future requests :-)' : hiddenRead.includes(book.ISBN13?.trim().toLowerCase()) ? 'You already requested or read this' : 'Request for Me'}
              </button>
              <div className="mt-2 text-xs text-gray-700">
                <div className="flex flex-col sm:flex-row gap-2">
                  {book.minPrice && <span className="text-green-600 font-semibold">Buy from us at ₹{book.minPrice}</span>}
                  <a
                    href={`https://www.amazon.in/s?k=${encodeURIComponent(book.Title + ' ' + book.ISBN13)}&tag=vandana1230b9-21`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-orange-600 hover:underline"
                  >
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
