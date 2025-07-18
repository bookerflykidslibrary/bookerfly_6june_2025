import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

const PAGE_SIZE = 2000;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [futureRequests, setFutureRequests] = useState([]);
  const [quota, setQuota] = useState(0);

  useEffect(() => {
    const fetchCatalog = async () => {
      // 1. Fetch full catalog
      const { data: catalogData, error: catalogError } = await supabase
        .from('catalog')
        .select('*')
        .limit(PAGE_SIZE);

      if (catalogError) {
        console.error('Error fetching catalog:', catalogError);
        return;
      }

      // 2. Get all ISBNs already requested by any user
      const { data: allFutureRequests, error: futureError } = await supabase
        .from('circulationfuture')
        .select('ISBN13');

      if (futureError) {
        console.error('Error fetching circulationfuture:', futureError);
        return;
      }

      const allRequestedISBNs = new Set(allFutureRequests.map(r => r.ISBN13));

      // 3. Get ISBNs already read by current user
      const { data: history, error: historyError } = await supabase
        .from('circulationhistory')
        .select('ISBN13')
        .eq('userid', user.id);

      const readISBNs = new Set(history?.map(r => r.ISBN13) ?? []);

      // 4. Filter out books requested by anyone or read by this user
      const filtered = catalogData.filter(
        (book) => !readISBNs.has(book.ISBN13) && !allRequestedISBNs.has(book.ISBN13)
      );

      setBooks(filtered);
    };

    fetchCatalog();
  }, [user.id]);

  useEffect(() => {
    const fetchQuotaAndRequests = async () => {
      // 5. Get current user's membership plan
      const { data: customerInfo } = await supabase
        .from('customerinfo')
        .select('SubscriptionPlan')
        .eq('CustomerID', user.id)
        .single();

      // 6. Get quota from membershipplans
      const { data: planInfo } = await supabase
        .from('membershipplans')
        .select('NumberOfBooks')
        .eq('PlanName', customerInfo.SubscriptionPlan)
        .single();

      setQuota(planInfo?.NumberOfBooks ?? 0);

      // 7. Get all current user's future requests
      const { data: userRequests } = await supabase
        .from('circulationfuture')
        .select('ISBN13')
        .eq('userid', user.id);

      setFutureRequests(userRequests.map(r => r.ISBN13));
    };

    fetchQuotaAndRequests();
  }, [user.id]);

  const handleBookRequest = async (isbn) => {
    const alreadyRequested = futureRequests.includes(isbn);
    const limit = quota + 2;

    if (alreadyRequested || futureRequests.length >= limit) return;

    // Get the next SerialNumberOfIssue
    const { data: previousRequests } = await supabase
      .from('circulationfuture')
      .select('SerialNumberOfIssue')
      .eq('userid', user.id)
      .eq('ISBN13', isbn);

    const nextSerial = (previousRequests?.[0]?.SerialNumberOfIssue || 0) + 1;

    const { error } = await supabase.from('circulationfuture').insert([
      {
        userid: user.id,
        ISBN13: isbn,
        SerialNumberOfIssue: nextSerial,
      },
    ]);

    if (!error) {
      setFutureRequests([...futureRequests, isbn]);
    }
  };

  return (
    <div className="p-4 max-w-screen-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Bookerfly Kids Library - Book Catalog</h1>
      <p className="mb-4">You can request up to {quota + 2} books. You've requested {futureRequests.length}.</p>

      {books.length === 0 ? (
        <p>No books available for request.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {books.map(book => (
            <div key={book.ISBN13} className="border p-3 rounded-lg shadow bg-white">
              <img src={book.Thumbnail} alt={book.Title} className="w-full h-40 object-contain mb-2" />
              <div className="text-sm font-medium">{book.Title}</div>
              <div className="text-xs text-gray-600 mb-2">{book.Authors}</div>
              <button
                className={`w-full px-2 py-1 text-xs rounded ${
                  futureRequests.includes(book.ISBN13)
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                onClick={() => handleBookRequest(book.ISBN13)}
                disabled={futureRequests.includes(book.ISBN13) || futureRequests.length >= quota + 2}
              >
                {futureRequests.includes(book.ISBN13)
                  ? 'Added to your future requests :-)'
                  : 'Book for me'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
