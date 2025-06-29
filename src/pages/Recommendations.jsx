// Catalog.jsx
import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 2000;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hiddenRead, setHiddenRead] = useState(null);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [loading, setLoading] = useState(true);
  const [addedRequests, setAddedRequests] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const loadUserData = async () => {
      if (user?.email) {
        await fetchReadBooks(user.email);
        await checkAdminAndTags();
      } else {
        setHiddenRead([]);
      }
    };
    loadUserData();
  }, [user]);

  const checkAdminAndTags = async () => {
    const { data: authUser } = await supabase.auth.getUser();
    const userId = authUser?.user?.id;
    if (userId) {
      const { data: adminData } = await supabase
          .from('admininfo')
          .select('*')
          .eq('AdminID', userId)
          .single();

      if (adminData) setIsAdmin(true);
    }

    const { data: tagList, error } = await supabase
        .from('tags')
        .select('TagName');

    if (!error && tagList) {
      const uniqueTags = [...new Set(tagList.map(tag => tag.TagName))];
      setTagOptions(uniqueTags);
    }
  };

  const fetchReadBooks = async (email) => {
    const { data: customer } = await supabase
        .from('customerinfo')
        .select('userid')
        .eq('EmailID', email)
        .single();
    if (!customer) return setHiddenRead([]);

    const { data: readHistory } = await supabase
        .from('circulationhistory')
        .select('ISBN13')
        .eq('userid', customer.userid);

    const readISBNs = (readHistory || [])
        .map(b => b.ISBN13?.trim().toLowerCase())
        .filter(Boolean);
    setHiddenRead(readISBNs);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleBookRequest = async (book) => {
    if (!user?.email) return alert('Please log in to request a book.');

    const { data: customer } = await supabase
        .from('customerinfo')
        .select('userid')
        .eq('EmailID', user.email)
        .single();

    if (!customer) return alert('User not found.');

    const { data: existing } = await supabase
        .from('circulationfuture')
        .select('SerialNumberOfIssue')
        .eq('ISBN13', book.ISBN13)
        .eq('userid', customer.userid)
        .order('SerialNumberOfIssue', { ascending: false })
        .limit(1);

    const nextSerial = (existing?.[0]?.SerialNumberOfIssue ?? 0) + 1;

    const { error } = await supabase
        .from('circulationfuture')
        .insert({ ISBN13: book.ISBN13, CopyNumber: null, SerialNumberOfIssue: nextSerial, userid: customer.userid });

    if (error) return alert('Failed to add request.');
    setAddedRequests(prev => ({ ...prev, [book.ISBN13]: true }));
  };

  const loadBooks = async () => {
    setLoading(true);
    let query = supabase.from('catalog').select('*').range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (appliedFilters) {
      const { minAge, maxAge, author, title } = appliedFilters;
      let min = minAge ? parseInt(minAge) : null;
      let max = maxAge ? parseInt(maxAge) : null;
      if (min !== null && max === null) max = min;
      else if (max !== null && min === null) min = Math.max(0, max - 3);
      if (min !== null) query = query.gte('MaxAge', min);
      if (max !== null) query = query.lte('MinAge', max);
      if (author) query = query.ilike('Authors', `%${author}%`);
      if (title) query = query.ilike('Title', `%${title}%`);
    }

    const { data: booksData } = await query;
    if (!booksData) return;

    const { data: copies } = await supabase
        .from('copyinfo')
        .select('ISBN13, CopyBooked')
        .in('ISBN13', booksData.map(b => b.ISBN13));

    const availabilityMap = {};
    for (const copy of copies || []) {
      if (!availabilityMap[copy.ISBN13]) availabilityMap[copy.ISBN13] = false;
      if (!copy.CopyBooked) availabilityMap[copy.ISBN13] = true;
    }

    const readSet = new Set((hiddenRead || []).map(id => id?.trim().toLowerCase()));
    const filteredBooks = booksData.filter(book => availabilityMap[book.ISBN13] && !readSet.has(book.ISBN13?.toLowerCase()));
    const randomized = filteredBooks.sort(() => 0.5 - Math.random());

    setBooks(randomized);
    setLoading(false);
  };

  const startEditing = (book) => {
    setEditingBookId(book.BookID);
    setEditForm({ ...book, Tags: book.Tags?.split(',') || [] });
  };

  const saveEdit = async () => {
    const updated = { ...editForm, Tags: editForm.Tags.join(',') };
    const { error } = await supabase
        .from('catalog')
        .update(updated)
        .eq('BookID', editingBookId);
    if (!error) {
      setEditingBookId(null);
      loadBooks();
    }
  };

  const toggleTag = (tag) => {
    setEditForm(prev => {
      const exists = prev.Tags.includes(tag);
      return {
        ...prev,
        Tags: exists ? prev.Tags.filter(t => t !== tag) : [...prev.Tags, tag]
      };
    });
  };

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  return (
      <div className="p-4">
        {loading ? 'Loading...' : books.map(book => (
            <div key={book.BookID} className="bg-white rounded p-4 shadow mb-4">
              {editingBookId === book.BookID ? (
                  <div>
                    <input value={editForm.Title} onChange={e => setEditForm({ ...editForm, Title: e.target.value })} />
                    <textarea value={editForm.Description} onChange={e => setEditForm({ ...editForm, Description: e.target.value })} />
                    <input value={editForm.Authors} onChange={e => setEditForm({ ...editForm, Authors: e.target.value })} />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tagOptions.map(tag => (
                          <label key={tag} className="text-sm">
                            <input
                                type="checkbox"
                                checked={editForm.Tags.includes(tag)}
                                onChange={() => toggleTag(tag)}
                            /> {tag}
                          </label>
                      ))}
                    </div>
                    <button onClick={saveEdit} className="btn bg-green-600 text-white mt-2">Save</button>
                  </div>
              ) : (
                  <div>
                    <img src={book.Thumbnail} alt="thumb" className="w-32 h-48 object-cover mb-2 rounded" />
                    <h2 className="font-bold text-lg">{book.Title}</h2>
                    <p className="text-sm text-gray-600 italic">{book.Authors}</p>
                    <p className="text-xs">{book.Description}</p>
                    {isAdmin && (
                        <button onClick={() => startEditing(book)} className="btn bg-yellow-500 text-white mt-2">Edit</button>
                    )}
                  </div>
              )}
            </div>
        ))}
      </div>
  );
}
