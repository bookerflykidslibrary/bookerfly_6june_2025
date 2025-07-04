// src/pages/admin/EditBook.jsx
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function EditBook() {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [tags, setTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [copies, setCopies] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchTags = async () => {
            const { data } = await supabase.from('tags').select('TagName');
            if (data) setAllTags(data.map(t => t.TagName));
        };
        fetchTags();
    }, []);

    const searchBooks = async (term) => {
        if (!term) return;
        const { data } = await supabase
            .from('catalog')
            .select('Title, ISBN13, Authors')
            .or(`Title.ilike.%${term}%,Authors.ilike.%${term}%,ISBN13.ilike.%${term}%`)
            .limit(10);
        if (data) setSuggestions(data);
    };

    const selectBook = async (isbn) => {
        const { data: book } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single();
        const { data: copiesData } = await supabase.from('copyinfo').select(`*, circulationhistory!left(*), customerinfo:circulationhistory!left(MemberID)->customerinfo(CustomerName)`).eq('ISBN13', isbn);
        setSelectedBook(book);
        setTags(book?.Tags || []);
        setCopies(copiesData || []);
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

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Edit Book (Admin)</h1>

            {/* Book Search */}
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

            {/* Book Details */}
            {selectedBook && (
                <>
                    <div className="mt-6 space-y-4">
                        <label>
                            ISBN13
                            <input className="w-full p-2 border rounded" value={selectedBook.ISBN13 || ''} disabled />
                        </label>
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
                            Thumbnail URL
                            <input className="w-full p-2 border rounded" value={selectedBook.Thumbnail || ''} onChange={e => setSelectedBook({ ...selectedBook, Thumbnail: e.target.value })} />
                        </label>
                        <label>
                            Min Age
                            <input className="w-full p-2 border rounded" type="number" value={selectedBook.MinAge || ''} onChange={e => setSelectedBook({ ...selectedBook, MinAge: parseInt(e.target.value) })} />
                        </label>
                        <label>
                            Max Age
                            <input className="w-full p-2 border rounded" type="number" value={selectedBook.MaxAge || ''} onChange={e => setSelectedBook({ ...selectedBook, MaxAge: parseInt(e.target.value) })} />
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

                    <button onClick={saveChanges} className="mt-4 bg-green-600 text-white px-4 py-2 rounded">
                        Save Book Changes
                    </button>

                    {/* Copies Section */}
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold mb-2">Copies</h2>
                        {copies.map((copy, idx) => (
                            <div key={copy.CopyID} className="border rounded p-2 mb-2">
                                <label>
                                    Copy Number
                                    <input className="p-1 border rounded w-full" type="number" value={copy.CopyNumber || ''} onChange={e => handleCopyChange(idx, 'CopyNumber', parseInt(e.target.value))} />
                                </label>
                                <label>
                                    Copy Location ID
                                    <input className="p-1 border rounded w-full" value={copy.CopyLocationID || ''} onChange={e => handleCopyChange(idx, 'CopyLocationID', e.target.value)} />
                                </label>
                                <label>
                                    Buy Price
                                    <input className="p-1 border rounded w-full" type="number" value={copy.BuyPrice || ''} onChange={e => handleCopyChange(idx, 'BuyPrice', parseFloat(e.target.value))} />
                                </label>
                                <label>
                                    Ask Price
                                    <input className="p-1 border rounded w-full" type="number" value={copy.AskPrice || ''} onChange={e => handleCopyChange(idx, 'AskPrice', parseFloat(e.target.value))} />
                                </label>
                                <label>
                                    Copy Booked
                                    <select className="p-1 border rounded w-full" value={copy.CopyBooked ? 'true' : 'false'} onChange={e => handleCopyChange(idx, 'CopyBooked', e.target.value === 'true')}>
                                        <option value="false">No</option>
                                        <option value="true">Yes</option>
                                    </select>
                                </label>
                            </div>
                        ))}
                        <button onClick={saveCopyChanges} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">
                            Save Copy Info
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
