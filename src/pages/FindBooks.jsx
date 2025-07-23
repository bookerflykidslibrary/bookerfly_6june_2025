import { useState } from 'react';
import supabase from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../contexts/CatalogContext';


export default function FindBooks() {
    const [filters, setFilters] = useState({ age: '', tag: '', author: '', title: '' });
    const [results, setResults] = useState([]);
    const [selectedBooks, setSelectedBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { availableBooks } = useCatalog();

    const handleChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSearch = () => {
        setLoading(true);

        const ageNum = parseFloat(filters.age);
        const hasAge = !isNaN(ageNum);
        const hasTag = filters.tag.trim() !== '';
        const hasAuthor = filters.author.trim() !== '';
        const hasTitle = filters.title.trim() !== '';

        const filtered = availableBooks.filter(book => {
            const matchesAge = hasAge ? ageNum >= book.MinAge && ageNum <= book.MaxAge : true;
            const matchesTag = hasTag ? (book.Tags || '').toLowerCase().includes(filters.tag.toLowerCase()) : true;
            const matchesAuthor = hasAuthor ? (book.Authors || '').toLowerCase().includes(filters.author.toLowerCase()) : true;
            const matchesTitle = hasTitle ? (book.Title || '').toLowerCase().includes(filters.title.toLowerCase()) : true;

            return matchesAge && matchesTag && matchesAuthor && matchesTitle;
        });

        const shuffled = filtered.sort(() => 0.5 - Math.random());
        setResults(shuffled);
        setLoading(false);
    };

    const toggleSelection = (book) => {
        setSelectedBooks((prev) => {
            const exists = prev.find((b) => b.ISBN13 === book.ISBN13);
            if (exists) {
                return prev.filter((b) => b.ISBN13 !== book.ISBN13);
            } else {
                return [...prev, book];
            }
        });
    };


    const handleShowCollage = () => {
        navigate('/collage', { state: { selectedBooks } }); // ✅ pass the state
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

            <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Search
            </button>

            {selectedBooks.length > 0 && (
                <button
                    onClick={handleShowCollage}
                    className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    Show Collage of Selected Books
                </button>
            )}

            {loading && <p className="mt-4 text-gray-600">Searching...</p>}

            <div className="mt-6 grid gap-4">
                {results.length === 0 && !loading ? (
                    <p>No books found.</p>
                ) : (
                    results.map((book, index) => (
                        <div
                            key={index}
                            className={`border p-4 rounded shadow cursor-pointer ${
                                selectedBooks.some((b) => b.ISBN13 === book.ISBN13) ? 'bg-yellow-100 border-yellow-400' : ''
                            }`}
                            onClick={() => toggleSelection(book)}
                        >
                            <h2 className="text-lg font-semibold">{book.title}</h2>
                            {book.Thumbnail && <img src={book.Thumbnail} alt={book.Title} className="w-36 h-56 object-cover rounded-lg shadow-md" />}
                            <p><strong>Author:</strong> {book.Authors}</p>
                            <p><strong>Age Group:</strong> {book.MinAge} - {book.MaxAge}</p>
                            <p><strong>Tags:</strong> {Array.isArray(book.Tags) ? book.Tags.join(', ') : book.Tags}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
