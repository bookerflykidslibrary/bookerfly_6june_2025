// collage-viewer.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function CollageViewer() {
  const [searchParams] = useSearchParams();
  const [images, setImages] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    const raw = searchParams.get('images');
    const userName = searchParams.get('name') || 'Reader';
    try {
      const decoded = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(decoded)) {
        setImages(decoded);
        setName(userName);
      }
    } catch (e) {
      console.error('Invalid image list');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white text-center px-4 py-6">
      <h1 className="text-xl font-bold mb-4">📚 Books from Bookerfly</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-center">
        {images.map((url, index) => (
          <img
            key={index}
            src={url.replace(/^http:/, 'https:')}
            alt={`Book ${index + 1}`}
            className="w-32 h-48 object-cover border border-gray-300 rounded shadow"
          />
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-4">Delivered to: <strong>{name}</strong></p>
      <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
      <p className="text-xs text-gray-400 mt-2">(Take a screenshot and share 💡)</p>
    </div>
  );
}
