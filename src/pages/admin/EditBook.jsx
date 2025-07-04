export default function HomePage() {
    return (
        <div className="min-h-screen bg-[#FFFBEF] text-gray-800">
            {/* Hero Section */}
            <div className="text-center py-12 px-4 sm:px-8">
                <img
                    src="../assets/logo.jpg"
                    alt="Bookerfly Logo"
                    className="mx-auto w-32 h-32 rounded-full shadow-md mb-4"
                />
                <h1 className="text-4xl font-bold text-orange-600 mb-2">Welcome to Bookerfly!</h1>
                <p className="text-lg text-gray-700 max-w-xl mx-auto">
                    A magical library experience for kids. Explore, borrow, and enjoy age-appropriate books delivered to your doorstep.
                </p>
            </div>

            {/* How It Works Section */}
            <section className="bg-white py-10 px-4 sm:px-8 shadow-inner">
                <h2 className="text-2xl font-bold text-center text-orange-700 mb-6">📦 How It Works</h2>
                <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg shadow-sm bg-orange-50">
                        <h3 className="text-lg font-semibold text-orange-800 mb-2">1. Sign Up</h3>
                        <p>Create an account and choose a plan that suits your child's reading needs.</p>
                    </div>
                    <div className="p-4 border rounded-lg shadow-sm bg-orange-50">
                        <h3 className="text-lg font-semibold text-orange-800 mb-2">2. Get Book Recommendations</h3>
                        <p>We personalize recommendations based on your child’s age and interests.</p>
                    </div>
                    <div className="p-4 border rounded-lg shadow-sm bg-orange-50">
                        <h3 className="text-lg font-semibold text-orange-800 mb-2">3. Receive Books</h3>
                        <p>Books are delivered to your address in a beautiful Bookerfly bag.</p>
                    </div>
                    <div className="p-4 border rounded-lg shadow-sm bg-orange-50">
                        <h3 className="text-lg font-semibold text-orange-800 mb-2">4. Return & Exchange</h3>
                        <p>Exchange books when you're done — we’ll pick up and drop new ones!</p>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-10 px-4 sm:px-8">
                <h2 className="text-2xl font-bold text-center text-orange-700 mb-6">❓ FAQs</h2>
                <div className="max-w-3xl mx-auto space-y-4">
                    <div>
                        <h3 className="font-semibold text-orange-800">What age group is Bookerfly for?</h3>
                        <p>We recommend books for kids aged 1 to 12 years based on their developmental stage.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-orange-800">Do you charge for delivery?</h3>
                        <p>Nope! Delivery and return pickup are free with all subscription plans.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-orange-800">How often do we receive books?</h3>
                        <p>It depends on your plan – typically every 2 or 4 weeks.</p>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="bg-orange-100 py-8 px-4 sm:px-8">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-orange-700 mb-2">📞 Contact Us</h2>
                    <p>Have questions? Reach out on WhatsApp!</p>
                    <a
                        href="https://wa.me/919910150753"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block bg-green-600 text-white px-4 py-2 rounded-full shadow hover:bg-green-700 transition"
                    >
                        Chat on WhatsApp: 9910150753
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="text-center py-4 text-sm text-gray-600">
                © {new Date().getFullYear()} Bookerfly. All rights reserved.
            </footer>
        </div>
    );
}
