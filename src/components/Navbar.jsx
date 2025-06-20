import {Link} from 'react-router-dom';
import supabase from '../utils/supabaseClient';

export default function Navbar({user}) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login'; // Better UX than reload
    };

    return (
        <nav
            className="flex flex-col sm:flex-row justify-between items-center p-4 bg-blue-600 text-white space-y-2 sm:space-y-0">
            <div><Link to="/catalog" className="hover:underline">Catalog</Link></div>
            <div><Link to="/my-books" className="hover:underline">My Books</Link></div>
            {!user && (
                <Link to="/signup-request" className="hover:underline">Become a member</Link>
            )}

            {user?.email === 'vkansal12@gmail.com' && (
                <>
                    <div><Link to="/admin/add-book" className="hover:underline">Add a Book</Link></div>
                    <div><Link to="/admin/issue-books" className="hover:underline">Issue Books</Link></div>
                    <div><Link to="/admin/signup" className="hover:underline">Sign Up</Link></div>
                    <div><Link to="/admin/edit-customer" className="hover:underline">View Customer</Link></div>
                    <div><Link to="/admin/review-books" className="hover:underline">Review Books</Link></div>
                    <div><Link to="/recommendations" className="hover:underline">Test Page</Link></div>
                    <div><Link to="/admin/view-signup-requests" className="hover:underline"> View Sign-Up
                        Requests</Link></div>
                    <div><Link to="/admin/return-books" className="hover:underline">Return Books</Link></div>
                </>
            )}

            <div className="flex items-center space-x-4">
                {user && (
                    <span className="text-sm italic">
            You are logged in as <strong>{user.user_metadata?.name || user.email}</strong>
          </span>
                )}
                {user ? (
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 px-2 py-1 rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                ) : (
                    <Link to="/login" className="hover:underline">Login</Link>
                )}
            </div>
        </nav>
    );
}
