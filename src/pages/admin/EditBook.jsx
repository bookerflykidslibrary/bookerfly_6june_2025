import { useEffect, useState } from 'react';
import supabase from '../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function EditBook({ user }) {
    const navigate = useNavigate();
    const isAdmin = user?.email === 'vkansal12@gmail.com';
    const [allBooks, setAllBooks] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [tags, setTags] = useState([]);
    const [bookTags, setBookTags] = useState([]);
    const [copies, setCopies] = useState([]);

    useEffect(() => {
        if (!isAdmin) navigate('/login');
    }, [user]);

    useEffect(() => {
        const fetchBooks = async () => {
            const { data } = await supabase.from('catalog').select('*');
            setAllBooks(data);
        };

        const fetchTags = async () => {
            const { data } = await supabase.from('tags').select('TagName');
            setTags(data.map(t => t.TagName));
        };

        fetchBooks();
        fetchTags();
    }, []);

    useEffect(() => {
        if (searchText.length === 0) {
            setFilteredBooks([]);
            return;
        }
        const query = searchText.toLowerCase();
        setFilteredBooks(
            allBooks.filter(
                book =>
                    book.Title.toLowerCase().includes(query) ||
                    book.ISBN13.includes(query) ||
                    (book.Authors || '').toLowerCase().includes(query)
            )
        );
    }, [searchText, allBooks]);

    const selectBook = async (book) => {
        setSelectedBook(book);
        setSearchText(book.Title);
        setFilteredBooks([]);

        const { data: bookTags } = await supabase
            .from('book_tags')
            .select('TagName')
            .eq('ISBN13', book.ISBN13);
        setBookTags(bookTags.map(t => t.TagName));

        const { data: copies } = await supabase
            .from('copyinfo')
            .select('*')
            .eq('ISBN13', book.ISBN13);
        setCopies(copies);
    };

    const updateBookField = (field, value) => {
        setSelectedBook(prev => ({ ...prev, [field]: value }));
    };

    const saveChanges = async () => {
        const { error } = await supabase
            .from('catalog')
            .update(selectedBook)
            .eq('ISBN13', selectedBook.ISBN13);

        await supabase
            .from('book_tags')
            .delete()
            .eq('ISBN13', selectedBook.ISBN13);

        for (const tag of bookTags) {
            await supabase.from('book_tags').insert({
                ISBN13: selectedBook.ISBN13,
                TagName: tag,
            });
        }

        if (!error) alert('Book updated!');
        else alert('Error updating book');
    };

    const toggleTag = (tag) => {
        setBookTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-xl font-bold mb-4">Edit Book</h1>

            <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by title, ISBN, author"
                className="w-full border border-gray-300 rounded p-2 mb-2"
            />

            {filteredBooks.length > 0 && (
                <ul className="border rounded bg-white shadow max-h-40 overflow-auto">
                    {filteredBooks.map(book => (
                        <li
                            key={book.ISBN13}
                            onClick={() => selectBook(book)}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                        >
                            {book.Title} ({book.ISBN13})
                        </li>
                    ))}
                </ul>
            )}

            {selectedBook && (
                <div className="mt-6 space-y-4">
                    <div>
                        <label className="block font-medium">Title</label>
                        <input
                            value={selectedBook.Title || ''}
                            onChange={(e) => updateBookField('Title', e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div>
                        <label className="block font-medium">ISBN13</label>
                        <input
                            value={selectedBook.ISBN13}
                            disabled
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block font-medium">Authors</label>
                        <input
                            value={selectedBook.Authors || ''}
                            onChange={(e) => updateBookField('Authors', e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div>
                        <label className="block font-medium">Description</label>
                        <textarea
                            value={selectedBook.Description || ''}
                            onChange={(e) => updateBookField('Description', e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div>
                        <label className="block font-medium">Thumbnail URL</label>
                        <input
                            value={selectedBook.Thumbnail || ''}
                            onChange={(e) => updateBookField('Thumbnail', e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="w-1/2">
                            <label className="block font-medium">Min Age</label>
                            <input
                                type="number"
                                value={selectedBook.Min_Age || ''}
                                onChange={(e) => updateBookField('Min_Age', Number(e.target.value))}
                                className="w-full border rounded p-2"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block font-medium">Max Age</label>
                            <input
                                type="number"
                                value={selectedBook.Max_Age || ''}
                                onChange={(e) => updateBookField('Max_Age', Number(e.target.value))}
                                className="w-full border rounded p-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-medium">Tags</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {tags.map(tag => (
                                <label key={tag} className="flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        checked={bookTags.includes(tag)}
                                        onChange={() => toggleTag(tag)}
                                    />
                                    {tag}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block font-medium mt-4">Copies</label>
                        {copies.length === 0 ? (
                            <p className="text-sm italic">No copies found</p>
                        ) : (
                            <table className="w-full text-sm mt-2 border">
                                <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 border">Copy Number</th>
                                    <th className="p-2 border">Location</th>
                                    <th className="p-2 border">Held By</th>
                                </tr>
                                </thead>
                                <tbody>
                                {copies.map(copy => (
                                    <tr key={copy.CopyID}>
                                        <td className="p-2 border">{copy.CopyNumber}</td>
                                        <td className="p-2 border">{copy.CopyLocation}</td>
                                        <td className="p-2 border"> {/* You can look up current holder via history */}
                                            {/* Later: Add logic to fetch current holder */}
                                            Unknown
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <button
                        onClick={saveChanges}
                        className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
}
