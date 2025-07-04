// /src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-orange-50 text-gray-800">
            <Navbar />

            {/* Hero Section */}
            <div className="text-center py-12 px-4 sm:px-8 bg-white shadow-md">
                <img
                    src="../assets/logo.jpg"
                    alt="Bookerfly Logo"
                    className="mx-auto w-32 mb-4"
                />
                <h1 className="text-4xl font-bold text-orange-700 mb-4">Welcome to Bookerfly</h1>
                <p className="text-lg max-w-2xl mx-auto">
                    A library subscription service for kids. Get personalized book deliveries, return at your convenience,
                    and enjoy reading with your little ones.
                </p>
            </div>

            {/* How It Works Section */}
            <section className="py-10 px-4 sm:px-8">
                <h2 className="text-3xl font-semibold text-center text-orange-700 mb-6">How It Works</h2>
                <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-xl mb-2">1. Choose a Plan</h3>
                        <p>Select a plan based on the number of books you want every month.</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-xl mb-2">2. Personalized Picks</h3>
                        <p>Books are selected based on your child’s age and preferences.</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-xl mb-2">3. Easy Exchange</h3>
                        <p>Return previous books when the new set arrives – it’s that simple!</p>
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section className="py-10 px-4 sm:px-8 bg-orange-100">
                <h2 className="text-3xl font-semibold text-center text-orange-700 mb-6">FAQs</h2>
                <div className="max-w-3xl mx-auto space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg">What is Bookerfly?</h3>
                        <p>
                            Bookerfly is a children's library service that delivers curated books to your doorstep. Designed for busy
                            parents who want their kids to love reading.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">How do deliveries work?</h3>
                        <p>
                            You’ll receive books as per your plan. When the next set arrives, just return the previous ones. Easy and
                            no-hassle.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Can I choose the books?</h3>
                        <p>
                            Yes! You can mark preferences, and our system combines them with age-appropriate suggestions to recommend
                            the best books for your child.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Us */}
            <section className="text-center py-10 px-4 sm:px-8">
                <h2 className="text-3xl font-semibold text-orange-700 mb-4">Contact Us</h2>
                <p className="text-lg">
                    Have questions? Reach out on WhatsApp:{' '}
                    <a href="https://wa.me/919910150753" target="_blank" rel="noopener noreferrer" className="text-green-600 underline">
                        +91 9910150753
                    </a>
                </p>
            </section>

            {/* Footer */}
            <footer className="text-center text-sm py-4 bg-orange-200 text-orange-800">
                &copy; {new Date().getFullYear()} Bookerfly. All rights reserved.
            </footer>
        </div>
    );
}
