//  /src/pages/admin/EditBook.jsx
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabaseClient';
//import { useNavigate } from 'react-router-dom';

export default function EditBook() {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [tags, setTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [copies, setCopies] = useState([]);
    //const [error, setError] = useState(null);

    //const navigate = useNavigate();

    useEffect(() => {
        const fetchTags = async () => {
            const { data, error } = await supabase.from('tags').select('TagName');
            if (data) setAllTags(data.map(t => t.TagName));
        };
        fetchTags();
    }, []);

    const searchBooks = async (term) => {
        if (!term) return;
        const { data, error } = await supabase
            .from('catalog')
            .select('Title, ISBN13, Authors')
            .ilike('Title', `%${term}%`)
            .limit(10);
        if (data) setSuggestions(data);
    };

    const selectBook = async (isbn) => {
        const { data: book, error } = await supabase
            .from('catalog')
            .select('*')
            .eq('ISBN13', isbn)
            .single();

        const { data: copiesData } = await supabase
            .from('copyinfo')
            .select('*')
            .eq('ISBN13', isbn);

        setSelectedBook(book);
        setTags(book?.Tags || []);
        setCopies(copiesData || []);
        setSuggestions([]);
        setSearchTerm(book.Title);
    };

    const handleTagToggle = (tag) => {
        setTags(prev => prev.includes(tag)
            ? prev.filter(t => t !== tag)
            : [...prev, tag]
        );
    };

    const handleThumbnailUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedBook.ISBN13) return;

        const fileExt = file.name.split('.').pop();
        const filePath = `${selectedBook.ISBN13}/${Date.now()}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
            .from('bookassets')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (uploadError) {
            alert('Error uploading image: ' + uploadError.message);
            return;
        }

        const { data: publicUrlData } = supabase
            .storage
            .from('bookassets')
            .getPublicUrl(filePath);

        const url = publicUrlData?.publicUrl;
        if (url) {
            setSelectedBook(prev => ({ ...prev, Thumbnail: url }));
            alert('Thumbnail uploaded successfully!');
        }
    };

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        const { data, error } = await supabase.from('tags').insert({ TagName: newTag.trim() });
        if (error) {
            alert('Error adding tag: ' + error.message);
        } else {
            alert('Tag added!');
            setAllTags([...allTags, newTag.trim()]);
            setNewTag('');
        }
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
                        <div>
                            <label className="block text-sm font-medium">Title</label>
                            <input className="w-full p-2 border rounded" value={selectedBook.Title || ''} onChange={e => setSelectedBook({ ...selectedBook, Title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Authors</label>
                            <input className="w-full p-2 border rounded" value={selectedBook.Authors || ''} onChange={e => setSelectedBook({ ...selectedBook, Authors: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Description</label>
                            <textarea className="w-full p-2 border rounded" value={selectedBook.Description || ''} onChange={e => setSelectedBook({ ...selectedBook, Description: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Min Age</label>
                            <input className="w-full p-2 border rounded" value={selectedBook.MinAge || ''} onChange={e => setSelectedBook({ ...selectedBook, MinAge: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Max Age</label>
                            <input className="w-full p-2 border rounded" value={selectedBook.MaxAge || ''} onChange={e => setSelectedBook({ ...selectedBook, MaxAge: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">ISBN13</label>
                            <input className="w-full p-2 border rounded" value={selectedBook.ISBN13 || ''} onChange={e => setSelectedBook({ ...selectedBook, ISBN13: e.target.value })} />
                        </div>
                        <div>
                            <div>
                                <label className="block text-sm font-medium">Thumbnail</label>

                                {selectedBook.Thumbnail && (
                                    <img src={selectedBook.Thumbnail} alt="Thumbnail" className="w-32 h-auto mb-2 border" />
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment" // enables camera on phones
                                    onChange={handleThumbnailUpload}
                                    className="w-full p-2 border rounded mb-2"
                                />

                                <input
                                    type="text"
                                    value={selectedBook.Thumbnail || ''}
                                    onChange={e => setSelectedBook({ ...selectedBook, Thumbnail: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    placeholder="Or paste thumbnail URL manually"
                                />
                            </div>

                        </div>
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
                        {/* Add New Tag */}
                        <div className="mt-4">
                            <h3 className="font-semibold mb-1">Add New Tag</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    className="p-2 border rounded w-full"
                                    placeholder="Enter new tag name"
                                />
                                <button
                                    onClick={handleAddTag}
                                    className="bg-blue-600 text-white px-3 py-1 rounded"
                                >
                                    Add
                                </button>
                            </div>
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
                                <div className="flex flex-col gap-2">
                                    <div>
                                        <label className="block text-sm font-medium">Copy Number</label>
                                        <input className="p-1 border rounded" value={copy.CopyNumber} onChange={e => handleCopyChange(idx, 'CopyNumber', parseInt(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Copy Location ID</label>
                                        <input className="p-1 border rounded" value={copy.CopyLocationID || ''} onChange={e => handleCopyChange(idx, 'CopyLocationID', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Buy Price</label>
                                        <input className="p-1 border rounded" value={copy.BuyPrice || ''} onChange={e => handleCopyChange(idx, 'BuyPrice', parseFloat(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Ask Price</label>
                                        <input className="p-1 border rounded" value={copy.AskPrice || ''} onChange={e => handleCopyChange(idx, 'AskPrice', parseFloat(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Copy Booked</label>
                                        <input className="p-1 border rounded" value={copy.CopyBooked ? 'true' : 'false'} onChange={e => handleCopyChange(idx, 'CopyBooked', e.target.value === 'true')} />
                                    </div>
                                </div>
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
