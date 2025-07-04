//  /src/pages/admin/EditBook.jsx
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function EditBook({ user }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [tags, setTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [copies, setCopies] = useState([]);
    const [holders, setHolders] = useState({});
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    // Only allow admin
    useEffect(() => {
        if (!user || user.email !== 'vkansal12@gmail.com') {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        const fetchTags = async () => {
            const { data, error } = await supabase.from('tags').select('TagName');
            if (data) setAllTags(data.map(t => t.TagName));
        };
        fetchTags();
    }, []);

    const searchBooks = async (term) => {
        if (!term) return;
        const { data } = await supabase
            .from('catalog')
            .select('Title, ISBN13, Authors')
            .or(`Title.ilike.%${term}%,ISBN13.ilike.%${term}%,Authors.ilike.%${term}%`)
            .limit(10);
        if (data) setSuggestions(data);
    };

    const selectBook = async (isbn) => {
        const { data: book } = await supabase
            .from('catalog')
            .select('*')
            .eq('ISBN13', isbn)
            .single();

        const { data: copiesData } = await supabase
            .from('copyinfo')
            .select('*')
            .eq('ISBN13', isbn);

        // For each copy, find who currently holds it (circulationhistory with null ReturnDate)
        const holdersMap = {};
        for (const copy of copiesData) {
            const { data: heldBy } = await supabase
                .from('circulationhistory')
                .select('MemberID, BookingDate')
                .eq('ISBN13', copy.ISBN13)
                .eq('CopyNumber', copy.CopyNumber)
                .is('ReturnDate', null)
                .maybeSingle();
            if (heldBy) holdersMap[copy.CopyID] = heldBy;
        }

        setSelectedBook(book);
        setTags(book?.Tags || []);
        setCopies(copiesData || []);
        setHolders(holdersMap);
        setSuggestions([]);
        setSearchTerm(book.Title);
    };

    const handleTagToggle = (tag) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const saveChanges = async () => {
        const { error } = await supabase
            .from('catalog')
            .update({ ...selectedBook, Tags: tags })
            .eq('ISBN13', selectedBook.ISBN13);
        if (!error) alert('Saved successfully!');
        else alert('Error saving book: ' + error.message);
    };

    const handleCopyChange = (index, field, value) => {
        setCopies(prev => {
            const updated = [...prev];
            updated[index][field] = value;
            return updated;
        });
    };

    const saveCopyChanges = async () => {
        for (const copy of copies) {
            await supabase.from('copyinfo').update(copy).eq('CopyID', copy.CopyID);
        }
        alert('Copy changes saved.');
    };

    const deleteBook = async () => {
        if (!window.confirm('Are you sure you want to delete this book?')) return;
        await supabase.from('catalog').delete().eq('ISBN13', selectedBook.ISBN13);
        alert('Book deleted.');
        setSelectedBook(null);
        setCopies([]);
        setSearchTerm('');
    };

    const deleteCopy = async (copyId) => {
        if (!window.confirm('Are you sure you want to delete this copy?')) return;
        await supabase.from('copyinfo').delete().eq('CopyID', copyId);
        setCopies(copies.filter(c => c.CopyID !== copyId));
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Edit Book (Admin)</h1>

            <input
                type="text"
                value={searchTerm}
                onChange={e => {
                    setSearchTerm(e.target.value);
                    searchBooks(e.target.value);
                }}
                className="w-full p-2 border rounded"
                placeholder="Search by title, author, or ISBN13..."
            />
            {suggestions.length > 0 && (
                <ul className="bg-white shadow border mt-2 rounded">
                    {suggestions.map((s, idx) => (
                        <li key={idx} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => selectBook(s.ISBN13)}>
                            {s.Title} — {s.Authors}
                        </li>
                    ))}
                </ul>
            )}

            {selectedBook && (
                <>
                    <div className="mt-6 space-y-4">
                        <label>
                            Title
                            <input className="w-full p-2 border rounded" value={selectedBook.Title || ''} onChange={e => setSelectedBook({ ...selectedBook, Title: e.target.value })} />
                        </label>
                        <label>
                            Authors
                            <input className="w-full p-2 border rounded" value={selectedBook.Authors || ''} onChange={e => setSelectedBook({ ...selectedBook, Authors: e.target.value })} />
                        </label>
                        <label>
                            Description
                            <textarea className="w-full p-2 border rounded" value={selectedBook.Description || ''} onChange={e => setSelectedBook({ ...selectedBook, Description: e.target.value })} />
                        </label>
                        <label>
                            Minimum Age
                            <input type="number" className="w-full p-2 border rounded" value={selectedBook.MinAge || ''} onChange={e => setSelectedBook({ ...selectedBook, Min_Age: parseInt(e.target.value) })} />
                        </label>
                        <label>
                            Maximum Age
                            <input type="number" className="w-full p-2 border rounded" value={selectedBook.MaxAge || ''} onChange={e => setSelectedBook({ ...selectedBook, Max_Age: parseInt(e.target.value) })} />
                        </label>
                    </div>

                    {/* Tags */}
                    <div className="mt-4">
                        <h2 className="font-semibold">Tags</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {allTags.map(tag => (
                                <label key={tag} className="flex items-center gap-1 text-sm">
                                    <input type="checkbox" checked={tags.includes(tag)} onChange={() => handleTagToggle(tag)} />
                                    {tag}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button onClick={saveChanges} className="bg-green-600 text-white px-4 py-2 rounded">Save Book Changes</button>
                        <button onClick={deleteBook} className="bg-red-600 text-white px-4 py-2 rounded">Delete Book</button>
                    </div>

                    {/* Copies Section */}
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold mb-2">Copies</h2>
                        {copies.map((copy, idx) => (
                            <div key={copy.CopyID} className="border rounded p-2 mb-2">
                                <div className="flex flex-col gap-2">
                                    <label>
                                        Copy Number
                                        <input className="p-1 border rounded w-full" value={copy.CopyNumber} onChange={e => handleCopyChange(idx, 'CopyNumber', parseInt(e.target.value))} />
                                    </label>
                                    <label>
                                        Copy Location
                                        <input className="p-1 border rounded w-full" value={copy.CopyLocation} onChange={e => handleCopyChange(idx, 'CopyLocation', e.target.value)} />
                                    </label>
                                    {holders[copy.CopyID] && (
                                        <p className="text-sm text-gray-600">Held by: {holders[copy.CopyID].MemberID} (Issued on {new Date(holders[copy.CopyID].BookingDate).toLocaleDateString()})</p>
                                    )}
                                    <button onClick={() => deleteCopy(copy.CopyID)} className="text-red-600 text-sm mt-1">Delete Copy</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={saveCopyChanges} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">Save Copy Info</button>
                    </div>
                </>
            )}
        </div>
    );
}
