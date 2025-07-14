import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function CirculationSummary() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCirculation = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_books_in_circulation');
        if (error) {
            setError(error);
            setRecords([]);
        } else {
            setRecords(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCirculation();
    }, []);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-2">📚 Books in Circulation</h1>

            {loading && <p>Loading...</p>}
            {error && <p className="text-red-600">Error: {error.message}</p>}

            {!loading && records.length === 0 && <p>No books currently in circulation.</p>}

            {!loading && records.length > 0 && (
                <>
                    <p className="mb-4 text-green-700 font-semibold">
                        Total Books Currently Issued: {records.length}
                    </p>
                    <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border p-2">Title</th>
                                <th className="border p-2">ISBN</th>
                                <th className="border p-2">Customer ID</th>
                                <th className="border p-2">Customer Name</th>
                                <th className="border p-2">Issue Date</th>
                                <th className="border p-2">Expected Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, idx) => (
                                <tr key={idx}>
                                    <td className="border p-2">{r.title}</td>
                                    <td className="border p-2">{r.isbn13}</td>
                                    <td className="border p-2">{r.customerid}</td>
                                    <td className="border p-2">{r.customername}</td>
                                    <td className="border p-2">{new Date(r.issuedate).toLocaleDateString()}</td>
                                    <td className="border p-2">{new Date(r.expected_return_date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}
