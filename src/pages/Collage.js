import React from 'react';
import { useLocation } from 'react-router-dom';

const Collage = () => {
    // Get data passed through navigation state
    const location = useLocation();
    const selectedBooks = location.state?.selectedBooks || [];

    console.log('selectedBooks:', selectedBooks);
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Book Collage</h1>

            {selectedBooks.length === 0 ? (
                <p>No books selected.</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedBooks.map((book) => (
                        <div key={book.ISBN13} className="text-center">
                            {book.Thumbnail && (
                                <img
                                    src={book.Thumbnail}
                                    alt={book.Title}
                                    className="w-60 h-80 object-contain bg-white rounded-md shadow"
                                />
                            )}
                            <p className="text-sm">{book.Title}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Collage;
