import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function AdminAddBook() {
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState(null);
  const [tags, setTags] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState('');
  const [copyNumber, setCopyNumber] = useState(1);
  const [copyLocationID, setCopyLocationID] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTagsAndLocations = async () => {
      const { data: tagList } = await supabase.from('tags').select('*');
      setTags(tagList || []);

      const { data: locationList } = await supabase.from('locations').select('*');
      setLocations(locationList || []);
    };
    fetchTagsAndLocations();
  }, []);

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const fetchFromGoogleBooks = async (isbn) => {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const json = await res.json();
    return json.items?.[0]?.volumeInfo;
  };

  const handleSearch = async () => {
    setMessage('');
    const { data: catalogData } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single();

    if (catalogData) {
      setBook(catalogData);
    } else {
      const info = await fetchFromGoogleBooks(isbn);
      if (info) {
        setBook({
          ISBN13: isbn,
          Title: info.title || '',
          Authors: info.authors?.join(', ') || '',
          Description: info.description || '',
          Thumbnail: info.imageLinks?.thumbnail || '',
          MinAge: '',
          MaxAge: '',
          Reviews: '',
        });
      } else {
        setBook({
          ISBN13: isbn,
          Title: '',
          Authors: '',
          Description: '',
          Thumbnail: '',
          MinAge: '',
          MaxAge: '',
          Reviews: '',
        });
        setMessage('Google Books data not found. Please fill the form manually.');
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: admin } = await supabase
      .from('admininfo')
      .select('AdminLocation')
      .eq('AdminID', user.id)
      .single();

    const loc = admin?.AdminLocation || '';
    setLocation(loc);

    const { data: existingCopies } = await supabase
      .from('copyinfo')
      .select('*')
      .eq('ISBN13', isbn)
      .eq('CopyLocation', loc);

    setCopyNumber((existingCopies?.length || 0) + 1);
  };

  const handleTagChange = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const uploadThumbnailToStorage = async () => {
    if (!thumbnailFile) return book?.Thumbnail || '';

    const fileExt = thumbnailFile.name.split('.').pop();
    const filePath = `${isbn}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('book-thumbnails')
      .upload(filePath, thumbnailFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Thumbnail upload failed:', uploadError.message);
      return '';
    }

    const { data } = supabase.storage.from('book-thumbnails').getPublicUrl(filePath);
    return data?.publicUrl || '';
  };

  const handleSubmit = async () => {
    const uploadedThumbnailUrl = await uploadThumbnailToStorage();
    const catalogThumbnail = uploadedThumbnailUrl || book.Thumbnail;

    const { data: catalogExists } = await supabase
      .from('catalog')
      .select('*')
      .eq('ISBN13', book.ISBN13)
      .single();

    if (!catalogExists) {
      const { error: insertError } = await supabase.from('catalog').insert([
        {
          ISBN13: book.ISBN13,
          Title: book.Title,
          Authors: book.Authors,
          Description: book.Description,
          Thumbnail: catalogThumbnail,
          MinAge: book.MinAge,
          MaxAge: book.MaxAge,
          Reviews: book.Reviews,
        },
      ]);

      if (insertError) {
        setMessage('❌ Failed to add book to catalog.');
        return;
      }
    }

    await supabase.from('copyinfo').insert([
      {
        ISBN13: book.ISBN13,
        CopyNumber: copyNumber,
        CopyLocation: location,
        CopyLocationID: copyLocationID,
        BuyPrice: buyPrice,
        AskPrice: askPrice,
      },
    ]);

    setMessage('✅ Book and copy added successfully!');
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Admin: Add Book</h1>

      <input
        type="text"
        value={isbn}
        onChange={(e) => setIsbn(e.target.value)}
        placeholder="Enter ISBN"
        className="border p-2 rounded w-full mb-2"
      />
      <button
        onClick={handleSearch}
        className="bg-blue-600 text-white w-full p-2 rounded hover:bg-blue-700 mb-4"
      >
        Search
      </button>

      {book && (
        <>
          <input className="w-full border p-2 mb-2" value={book.ISBN13} disabled />
          <input
            className="w-full border p-2 mb-2"
            value={book.Title}
            onChange={(e) => setBook({ ...book, Title: e.target.value })}
          />
          <input
            className="w-full border p-2 mb-2"
            value={book.Authors}
            onChange={(e) => setBook({ ...book, Authors: e.target.value })}
          />
          <input
            className="w-full border p-2 mb-2"
            placeholder="Min Age"
            value={book.MinAge}
            onChange={(e) => setBook({ ...book, MinAge: e.target.value })}
          />
          <input
            className="w-full border p-2 mb-2"
            placeholder="Max Age"
            value={book.MaxAge}
            onChange={(e) => setBook({ ...book, MaxAge: e.target.value })}
          />
          <input
            className="w-full border p-2 mb-2"
            placeholder="Reviews"
            value={book.Reviews}
            onChange={(e) => setBook({ ...book, Reviews: e.target.value })}
          />
          <textarea
            className="w-full border p-2 mb-2"
            value={book.Description}
            rows={5}
            onChange={(e) => setBook({ ...book, Description: e.target.value })}
          />

          {thumbnailPreview ? (
            <img src={thumbnailPreview} alt="Thumbnail Preview" className="w-32 mb-2" />
          ) : book.Thumbnail ? (
            <img src={book.Thumbnail} alt="Thumbnail" className="w-32 mb-2" />
          ) : null}

          <input type="file" onChange={handleThumbnailUpload} className="mb-4" />

          <label>Location</label>
          <select
            className="w-full border p-2 mb-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.name}
              </option>
            ))}
          </select>

          <input
            className="w-full border p-2 mb-2"
            placeholder="Enter Copy Location ID"
            value={copyLocationID}
            onChange={(e) => setCopyLocationID(e.target.value)}
          />
          <input
            className="w-full border p-2 mb-2"
            placeholder="Enter Buy Price"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
          />
          <input
            className="w-full border p-2 mb-2"
            placeholder="Enter Ask Price"
            value={askPrice}
            onChange={(e) => setAskPrice(e.target.value)}
          />

          <div className="mb-2">
            <p className="font-semibold">Tags:</p>
            {tags.map((tag) => (
              <label key={tag.id} className="block">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.name)}
                  onChange={() => handleTagChange(tag.name)}
                />{' '}
                {tag.name}
              </label>
            ))}
          </div>

          <p className="mb-4">Next Copy Number: <strong>{copyNumber}</strong></p>

          <button
            onClick={handleSubmit}
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            Confirm & Add Book
          </button>
        </>
      )}

      {message && <div className="mt-4 text-center text-blue-700">{message}</div>}
    </div>
  );
}
