import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import supabase from '../utils/supabaseClient';

export default function ReviewBooks({ adminLocation }) {
  const [isbnInput, setIsbnInput] = useState('');
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef(null);

  const fetchBookByISBN = async (isbn) => {
    setLoading(true);
    const { data: catalogData, error: catalogError } = await supabase
        .from('catalog')
        .select('*')
        .eq('ISBN13', isbn)
        .not('BookReviewed', 'is', true)
        .single();

    if (catalogError || !catalogData) {
      alert('Book not found or already reviewed.');
      setLoading(false);
      return;
    }

    setBookData(catalogData);
    setLoading(false);
  };

  const fetchRandomBook = async () => {
    setLoading(true);
    const { data: catalogList } = await supabase
        .from('catalog')
        .select('*')
        .not('BookReviewed', 'is', true);

    if (!catalogList || catalogList.length === 0) {
      alert('No unreviewed books found.');
      setLoading(false);
      return;
    }

    const randomBook = catalogList[Math.floor(Math.random() * catalogList.length)];
    setBookData(randomBook);
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookData({ ...bookData, [name]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);

    const { ISBN13, ...catalogFields } = bookData;

    const { error } = await supabase
        .from('catalog')
        .update({ ...catalogFields, BookReviewed: true })
        .eq('ISBN13', ISBN13);

    if (!error) {
      alert('Book review submitted successfully!');
      setBookData(null);
    } else {
      alert('Failed to submit review.');
      console.error(error);
    }

    setLoading(false);
  };

  const captureAndUpload = async () => {
    if (!webcamRef.current || !bookData?.ISBN13) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      alert('Could not capture image.');
      return;
    }

    // Load image into an <img> tag
    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const width = 300;
      const height = 400;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to JPEG blob (80% quality)
      canvas.toBlob(async (blob) => {
        const filePath = `thumbnails/${bookData.ISBN13}_${Date.now()}.jpg`;

        const { data, error } = await supabase.storage
            .from('bookassets')
            .upload(filePath, blob, {
              contentType: 'image/jpeg',
              upsert: true,
            });

        if (error) {
          alert(`Upload failed: ${error.message}`);
      console.error('Supabase upload error:', error);
          return;
        }

        const { data: { publicUrl } } = supabase
            .storage
            .from('bookassets')
            .getPublicUrl(filePath);

        setBookData(prev => ({ ...prev, Thumbnail: publicUrl }));

        const { error: updateError } = await supabase
            .from('catalog')
            .update({ Thumbnail: publicUrl })
            .eq('ISBN13', bookData.ISBN13);

        if (updateError) {
          alert('Image uploaded but failed to save to catalog.');
          console.error(updateError);
        } else {
          alert('Image resized, uploaded, and catalog updated!');
        }

        setShowCamera(false);
      }, 'image/jpeg', 0.8); // 80% quality
    };
  };


  return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Review Books</h1>

        <div className="mb-4 flex gap-2">
          <input
              type="text"
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              placeholder="Enter ISBN13"
              className="border p-2 rounded w-full"
          />
          <button
              onClick={() => fetchBookByISBN(isbnInput.trim())}
              className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Fetch by ISBN
          </button>
          <button
              onClick={fetchRandomBook}
              className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Display Random
          </button>
        </div>

        {loading && <p className="text-blue-600 font-medium">Loading...</p>}

        {bookData && (
            <div className="bg-white shadow p-4 rounded space-y-4">
              <div>
                <label className="block font-medium">ISBN13</label>
                <input
                    type="text"
                    name="ISBN13"
                    value={bookData.ISBN13 || ''}
                    disabled
                    className="border p-2 rounded w-full bg-gray-100 cursor-not-allowed"
                />
              </div>

              {[
                'Title',
                'Authors',
                'Description',
                'Reviews',
                'Tags',
                'MinAge',
                'MaxAge',
              ].map((field) => (
                  <div key={field}>
                    <label className="block font-medium">{field}</label>
                    {['Description', 'Reviews', 'Tags'].includes(field) ? (
                        <textarea
                            name={field}
                            value={bookData[field] || ''}
                            onChange={handleChange}
                            className="border p-2 rounded w-full min-h-[100px]"
                        />
                    ) : (
                        <input
                            type="text"
                            name={field}
                            value={bookData[field] || ''}
                            onChange={handleChange}
                            className="border p-2 rounded w-full"
                        />
                    )}
                  </div>
              ))}

              {/* Thumbnail Section with Camera */}
              <div>
                <label className="block font-medium">Thumbnail</label>

                {bookData.Thumbnail ? (
                    <img
                        src={bookData.Thumbnail}
                        alt="Thumbnail"
                        className="w-32 h-auto border rounded mb-2"
                    />
                ) : (
                    <p className="text-sm text-gray-500 mb-2">No thumbnail available</p>
                )}

                <input
                    type="text"
                    name="Thumbnail"
                    value={bookData.Thumbnail || ''}
                    onChange={handleChange}
                    className="border p-2 rounded w-full mb-4"
                />

                {!showCamera ? (
                    <button
                        onClick={() => setShowCamera(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Open Camera
                    </button>
                ) : (
                    <div className="space-y-4">
                      <Webcam
                          key={bookData?.ISBN13}
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          videoConstraints={{ facingMode: 'environment' }}
                          className="rounded border"
                      />
                      <div className="flex gap-2">
                        <button
                            onClick={captureAndUpload}
                            className="bg-green-600 text-white px-4 py-2 rounded"
                        >
                          Capture & Upload
                        </button>
                        <button
                            onClick={() => setShowCamera(false)}
                            className="bg-red-600 text-white px-4 py-2 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                )}
              </div>

              <button
                  onClick={handleSubmit}
                  className="bg-purple-700 text-white px-6 py-2 rounded mt-4"
              >
                Submit Review
              </button>
            </div>
        )}
      </div>
  );
}
