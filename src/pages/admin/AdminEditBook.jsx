import { useEffect, useState } from 'react';
import supabase from '../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminEditBook({ user }) {
    const [bookQuery, setBookQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [tags, setTags] = useState([]);
    const [copies, setCopies] = useState([]);
    const navigate = useNavigate();

    const isAdmin = user?.email === 'vkansal12@gmail.com';

    useEffect(() => {
        if (!isAdmin) {
            navigate('/not-authorized');
        }
        fetchTags();
    }, []);

    const fetchTags = async () => {
        const { data, error } = await supabase.from('tags').select('TagName');
        if (data) setTags(data.map((t) => t.TagName));
    };

    const searchBooks = async (query) => {
        const { data } = await supabase
            .from('catalog')
            .select('*')
            .ilike('Title', `%${query}%`)
            .limit(5);
        setSuggestions(data);
    };

    const fetchBookDetails = async (isbn13) => {
        const { data } = await supabase.from('catalog').select('*').eq('ISBN13', isbn13).single();
        setSelectedBook(data);

        const { data: copyData } = await supabase
            .from('copyinfo')
            .select('*')
            .eq('ISBN13', isbn13)
            .order('CopyNumber');
        setCopies(copyData);
    };

    const updateBook = async () => {
        const { error } = await supabase
            .from('catalog')
            .update(selectedBook)
            .eq('ISBN13', selectedBook.ISBN13);

        if (error) alert('Failed to update book: ' + error.message);
        else alert('Book updated successfully');
    };

    const handleTagToggle = (tag) => {
        const current = selectedBook?.Tags || [];
        const newTags = current.includes(tag)
            ? current.filter((t) => t !== tag)
            : [...current, tag];
        setSelectedBook({ ...selectedBook, Tags: newTags });
    };

    const handleCopyChange = (index, field, value) => {
        const newCopies = [...copies];
        newCopies[index][field] = value;
        setCopies(newCopies);
    };

    const updateCopies = async () => {
        for (let copy of copies) {
            const { error } = await supabase
                .from('copyinfo')
                .update(copy)
                .eq('CopyID', copy.CopyID);
            if (error) alert(`Failed to update CopyID ${copy.CopyID}: ${error.message}`);
        }
        alert('Copies updated successfully.');
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">📚 Edit Book</h1>

            <input
                className="w-full border p-2 rounded mb-2"
                type="text"
                placeholder="Search by title or ISBN13..."
                value={bookQuery}
                onChange={(e) => {
                    setBookQuery(e.target.value);
                    searchBooks(e.target.value);
                }}
            />

            {suggestions.length > 0 && (
                <ul className="border rounded p-2 mb-4 bg-white shadow">
                    {suggestions.map((book) => (
                        <li
                            key={book.ISBN13}
                            className="cursor-pointer hover:bg-blue-100 p-1"
                            onClick={() => {
                                setBookQuery(book.Title);
                                fetchBookDetails(book.ISBN13);
                                setSuggestions([]);
                            }}
                        >
                            {book.Title} — {book.ISBN13}
                        </li>
                    ))}
                </ul>
            )}

            {selectedBook && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input
                            className="border p-2 rounded"
                            type="text"
                            value={selectedBook.Title || ''}
                            onChange={(e) => setSelectedBook({ ...selectedBook, Title: e.target.value })}
                            placeholder="Title"
                        />
                        <input
                            className="border p-2 rounded"
                            type="text"
                            value={selectedBook.Authors || ''}
                            onChange={(e) => setSelectedBook({ ...selectedBook, Authors: e.target.value })}
                            placeholder="Authors"
                        />
                        <textarea
                            className="border p-2 rounded col-span-1 md:col-span-2"
                            rows={3}
                            value={selectedBook.Description || ''}
                            onChange={(e) => setSelectedBook({ ...selectedBook, Description: e.target.value })}
                            placeholder="Description"
                        />
                    </div>

                    <div className="mb-4">
                        <strong>Tags:</strong>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                            {tags.map((tag) => (
                                <label key={tag} className="text-sm flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedBook.Tags?.includes(tag) || false}
                                        onChange={() => handleTagToggle(tag)}
                                    />
                                    {tag}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={updateBook}
                        className="bg-green-600 text-white px-4 py-2 rounded mb-6"
                    >
                        💾 Update Book
                    </button>

                    <h2 className="text-xl font-bold mb-2">📦 Copies</h2>
                    {copies.map((copy, idx) => (
                        <div
                            key={copy.CopyID}
                            className="p-3 border rounded mb-3 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-2"
                        >
                            <input
                                className="border p-2 rounded"
                                value={copy.CopyNumber}
                                onChange={(e) => handleCopyChange(idx, 'CopyNumber', e.target.value)}
                            />
                            <input
                                className="border p-2 rounded"
                                value={copy.CopyLocation || ''}
                                onChange={(e) => handleCopyChange(idx, 'CopyLocation', e.target.value)}
                            />
                            <input
                                className="border p-2 rounded col-span-1 md:col-span-2"
                                value={copy.CustomerID || ''}
                                onChange={(e) => handleCopyChange(idx, 'CustomerID', e.target.value)}
                                placeholder="Customer ID (if issued)"
                            />
                        </div>
                    ))}

                    <button
                        onClick={updateCopies}
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        💾 Update Copies
                    </button>
                </>
            )}
        </div>
    );
}
