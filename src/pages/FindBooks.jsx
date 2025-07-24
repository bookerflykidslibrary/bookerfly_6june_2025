import { useState } from 'react';
import supabase from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function FindBooks() {
    const [filters, setFilters] = useState({ age: '', tag: '', author: '', title: '' });
    const [results, setResults] = useState([]);
    const [selectedBooks, setSelectedBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSearch = async () => {
        console.log("Search clicked!");
        setLoading(true);

        let query = supabase
            .from('catalog')
            .select('BookID,ISBN13,Title,Authors,MinAge,MaxAge,Tags,Thumbnail,Description');

        const ageNum = parseFloat(filters.age);
        const hasAge = !isNaN(ageNum);
        const hasTag = filters.tag.trim() !== '';
        const hasAuthor = filters.author.trim() !== '';
        const hasTitle = filters.title.trim() !== '';

        // Apply filters
        if (hasAge) {
            console.log("has age");
            query = query
                .filter('MinAge', 'lte', ageNum)
                .filter('MaxAge', 'gte', ageNum);
           // query = query.gte('MinAge', ageNum).lte('MaxAge', ageNum);
        }

        if (hasAuthor) {
            console.log("has author");

            query = query.ilike('Authors', `%${filters.author.trim()}%`);
        }

        if (hasTitle) {
            console.log("has title");
            query = query.ilike('Title', `%${filters.title.trim()}%`);
        }

        if (hasTag) {
            console.log("has tags");
            query = query.ilike('Tags', `%${filters.tag.trim()}%`);
        }

        // Run the query
        const { data: catalogBooks, error } = await query;

        if (error) {
            console.error('Error fetching filtered books:', error);
            setLoading(false);
            return;
        }

        /// filter books
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

        //const readSet = new Set((hiddenRead || []).map(id => id?.trim().toLowerCase()));
        const readSet = new Set();
        const { data: allFutureRequests } = await supabase
            .from('circulationfuture')
            .select('ISBN13');

        const globallyRequestedISBNs = new Set(
            (allFutureRequests || []).map(r => r.ISBN13?.trim().toLowerCase())
        );

        const filteredBooks = catalogBooks.filter(book => {
            const isbn = book.ISBN13?.trim().toLowerCase();
            return (
                isbn &&
                availabilityMap[book.ISBN13] &&
                !readSet.has(isbn) &&
                !globallyRequestedISBNs.has(isbn)
            );
        });

        // Shuffle results
        const shuffled = (filteredBooks || []).sort(() => 0.5 - Math.random());
        setResults(shuffled);
        setLoading(false);
    };

    const toggleSelection = (book) => {
        setSelectedBooks((prev) => {
            const exists = prev.find((b) => b.ISBN13 === book.ISBN13);
            return exists
                ? prev.filter((b) => b.ISBN13 !== book.ISBN13)
                : [...prev, book];
        });
    };

    const handleShowCollage = () => {
        navigate('/collage', { state: { selectedBooks } });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Find Books</h1>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <input
                    name="age"
                    value={filters.age}
                    onChange={handleChange}
                    placeholder="Enter Age (e.g., 4.5)"
                    className="p-2 border rounded"
                />
                <input
                    name="tag"
                    value={filters.tag}
                    onChange={handleChange}
                    placeholder="Tag (e.g., mystery, animals)"
                    className="p-2 border rounded"
                />
                <input
                    name="author"
                    value={filters.author}
                    onChange={handleChange}
                    placeholder="Author"
                    className="p-2 border rounded"
                />
                <input
                    name="title"
                    value={filters.title}
                    onChange={handleChange}
                    placeholder="Title"
                    className="p-2 border rounded"
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <button
                    onClick={handleSearch}
                    onTouchEnd={(e) => {
                        e.preventDefault(); // Prevent iOS double-fire
                        handleSearch();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto"
                >
                    Search
                </button>

                {selectedBooks.length > 0 && (
                    <button
                        onClick={handleShowCollage}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full sm:w-auto"
                    >
                        Show Collage of Selected Books
                    </button>
                )}
            </div>

            {loading && <p className="mt-4 text-gray-600">Searching...</p>}

            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

                {!loading && results.length === 0 ? (
                    <p>No books found.</p>
                ) : (
                    results.map((book, index) => (
                        <div
                            key={index}
                            className={`border p-4 rounded shadow cursor-pointer ${
                                selectedBooks.some((b) => b.ISBN13 === book.ISBN13)
                                    ? 'bg-yellow-100 border-yellow-400'
                                    : ''
                            }`}
                            onClick={() => toggleSelection(book)}
                        >
                            <h2 className="text-lg font-semibold">{book.Title}</h2>
                            {book.Thumbnail ? (
                                <img
                                    src={book.Thumbnail}
                                    alt={book.Title}
                                    className="w-36 h-56 object-cover rounded-lg shadow-md my-2"
                                />
                            ) : (
                                <div className="w-36 h-56 bg-gray-200 flex items-center justify-center my-2 rounded-lg">
                                    <span className="text-gray-500 text-sm">No Image</span>
                                </div>
                            )}
                            <p><strong>Author:</strong> {book.Authors}</p>
                            <p><strong>Age Group:</strong> {book.MinAge} - {book.MaxAge}</p>
                            <p><strong>Tags:</strong> {Array.isArray(book.Tags) ? book.Tags.join(', ') : book.Tags || '—'}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
