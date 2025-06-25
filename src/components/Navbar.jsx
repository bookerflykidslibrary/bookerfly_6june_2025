import { Link } from 'react-router-dom';
import supabase from '../utils/supabaseClient';
import logo from '../assets/logo.jpg'; // Adjust path if needed

export default function Navbar({ user }) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const isAdmin = user?.email === 'vkansal12@gmail.com';

    const adminLinks = [
        { to: '/admin/add-book', label: 'Add a Book' },
        { to: '/admin/issue-books', label: 'Issue Books' },
        { to: '/admin/signup', label: 'Sign Up' },
        { to: '/admin/edit-customer', label: 'View Customer' },
        { to: '/admin/review-books', label: 'Review Books' },
        { to: '/recommendations', label: 'Test Page' },
        { to: '/admin/view-signup-requests', label: 'Next steps' },
        { to: '/admin/return-books', label: 'Return Books' },
    ];

    return (
        <nav className="bg-blue-600 text-white shadow-md px-4 py-3">
            <div className="max-w-7xl mx-auto flex justify-between items-center">

                {/* Left: Logo */}
                <Link to="/">
                    <img
                        src={logo}
                        alt="Bookerfly Logo"
                        className="h-14 w-14 rounded-full object-cover border-2 border-white shadow"
                    />
                </Link>

                {/* Right: Nav Links and User Actions */}
                <div className="flex flex-wrap gap-4 items-center justify-end">
                    <Link to="/catalog" className="hover:underline">Catalog</Link>
                    <Link to="/my-books" className="hover:underline">My Books</Link>
                    {!user && (
                        <Link to="/signup-request" className="hover:underline">Sign Up</Link>
                    )}
                    {isAdmin && adminLinks.map(({ to, label }) => (
                        <Link key={to} to={to} className="hover:underline">{label}</Link>
                    ))}

                    {user && (
                        <>
                            <Link to="/change-password" className="hover:underline">Change Password</Link>
                            <span className="text-sm italic">
                                Logged in as <strong>{user.user_metadata?.name || user.email}</strong>
                            </span>
                        </>
                    )}

                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link to="/login" className="hover:underline">Login</Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
