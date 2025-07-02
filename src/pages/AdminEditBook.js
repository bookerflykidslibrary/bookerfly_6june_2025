import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@supabase/auth-helpers-react';


export default function AdminEditBook() {
    const session = useSession();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [tags, setTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [copies, setCopies] = useState([]);

    useEffect(() => {
        if (!session?.user?.role?.includes('admin')) return;
        fetchTags();
    }, [session]);

    const fetchTags = async () => {
        const { data } = await supabase.from('tags').select('TagName');
        setAllTags(data.map(t => t.TagName));
    };

    const fetchSuggestions = async (text) => {
        setQuery(text);
        if (text.length < 2) return setSuggestions([]);
        const { data } = await supabase.from('catalog').select('ISBN13, Title, Authors')
            .ilike('Title', `%${text}%`);
        setSuggestions(data);
    };

    const selectBook = async (isbn) => {
        const { data: book } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single();
        const { data: bookCopies } = await supabase.from('copyinfo').select('*').eq('ISBN13', isbn);
        setSelectedBook(book);
        setTags(book.Tags ? book.Tags.split(',') : []);
        setCopies(bookCopies);
        setSuggestions([]);
        setQuery(`${book.Title} by ${book.Authors}`);
    };

    const updateBook = async () => {
        const { error } = await supabase.from('catalog').update({ ...selectedBook, Tags: tags.join(',') }).eq('ISBN13', selectedBook.ISBN13);
        if (error) alert(error.message);
        else alert('Book updated successfully');
    };

    const updateCopy = async (copyID, field, value) => {
        const update = {};
        update[field] = value;
        await supabase.from('copyinfo').update(update).eq('CopyID', copyID);
    };

    const deleteBook = async () => {
        const { error } = await supabase.from('catalog').delete().eq('ISBN13', selectedBook.ISBN13);
        if (!error) alert('Book deleted');
    };

    const deleteCopy = async (copyID) => {
        const { data: activeIssue } = await supabase
            .from('circulationhistory')
            .select('*')
            .eq('CopyID', copyID)
            .is('ReturnDate', null);
        if (activeIssue.length > 0) return alert('Cannot delete: copy currently issued.');

        const { error } = await supabase.from('copyinfo').delete().eq('CopyID', copyID);
        if (!error) setCopies(copies.filter(c => c.CopyID !== copyID));
    };

    if (!session?.user?.role?.includes('admin')) return <div className="p-4 text-red-600">Access Denied</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">📚 Admin Edit Book</h1>

            <Input
                value={query}
                onChange={(e) => fetchSuggestions(e.target.value)}
                placeholder="Search by Title, Author, or ISBN"
                className="mb-2"
            />
            {suggestions.length > 0 && (
                <div className="border rounded p-2 bg-white shadow-md">
                    {suggestions.map((s, idx) => (
                        <div
                            key={idx}
                            className="cursor-pointer hover:bg-gray-100 p-1"
                            onClick={() => selectBook(s.ISBN13)}
                        >
                            {s.Title} by {s.Authors} — {s.ISBN13}
                        </div>
                    ))}
                </div>
            )}

            {selectedBook && (
                <div className="mt-6 space-y-4">
                    <Card>
                        <CardContent className="p-4 grid gap-2">
                            <Input
                                value={selectedBook.Title}
                                onChange={(e) => setSelectedBook({ ...selectedBook, Title: e.target.value })}
                                placeholder="Title"
                            />
                            <Input
                                value={selectedBook.Authors}
                                onChange={(e) => setSelectedBook({ ...selectedBook, Authors: e.target.value })}
                                placeholder="Authors"
                            />
                            <Input
                                value={selectedBook.Description || ''}
                                onChange={(e) => setSelectedBook({ ...selectedBook, Description: e.target.value })}
                                placeholder="Description"
                            />
                            <div className="flex flex-wrap gap-2">
                                {allTags.map((tag, i) => (
                                    <label key={i} className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={tags.includes(tag)}
                                            onChange={(e) => {
                                                setTags(
                                                    e.target.checked
                                                        ? [...tags, tag]
                                                        : tags.filter(t => t !== tag)
                                                );
                                            }}
                                        />
                                        {tag}
                                    </label>
                                ))}
                            </div>
                            <Button onClick={updateBook}>💾 Save Changes</Button>
                            <Button onClick={deleteBook} className="bg-red-600">🗑️ Delete Book</Button>
                        </CardContent>
                    </Card>

                    <h2 className="text-xl font-bold mt-6">📦 Book Copies</h2>
                    {copies.map((copy) => (
                        <Card key={copy.CopyID} className="mb-4">
                            <CardContent className="p-3 space-y-2">
                                <div>Copy #{copy.CopyNumber} — Location: <Input defaultValue={copy.CopyLocation} onBlur={(e) => updateCopy(copy.CopyID, 'CopyLocation', e.target.value)} /></div>
                                <div>Booked: {copy.CopyBooked ? '✅ Yes' : '❌ No'}</div>
                                <Button onClick={() => deleteCopy(copy.CopyID)} className="bg-red-500">Delete Copy</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
