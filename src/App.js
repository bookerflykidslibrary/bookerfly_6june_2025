import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Catalog from './pages/Catalog'
import MyBooks from './pages/MyBooks'
import Recommendations from './pages/Recommendations'
import AdminAddBook from './pages/AdminAddBook'

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Catalog />} />
        <Route path="/my-books" element={<MyBooks />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/admin/add-book" element={<AdminAddBook />} />
      </Routes>
    </Router>
  )
}

export default App
