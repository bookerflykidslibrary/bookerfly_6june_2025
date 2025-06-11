import { useState, useEffect } from 'react'
import supabase from '../utils/supabaseClient'

export default function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    customerName: '',
    contactNo: '',
    address: '',
    subscriptionPlan: '',
    endDate: '' // Will be set to 30 days from today
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Set default endDate to 30 days from now
  useEffect(() => {
    const today = new Date()
    today.setDate(today.getDate() + 30)
    const defaultEndDate = today.toISOString().split('T')[0]
    setFormData((prev) => ({ ...prev, endDate: defaultEndDate }))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { email, password, customerName, contactNo, address, subscriptionPlan, endDate } = formData

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    if (authError) {
      setMessage(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setMessage('Signup failed. Please try again.')
      setLoading(false)
      return
    }

    // 2. Insert into customerinfo table
    const { error: insertError } = await supabase.from('customerinfo').insert({
      EmailID: email,
      CustomerName: customerName,
      ContactNo: parseInt(contactNo),
      Address: address,
      SubscriptionPlan: subscriptionPlan,
      isActive: true,
      StartDate: new Date().toISOString().split('T')[0],
      EndDate: endDate,
      userid: userId
    })

    if (insertError) {
      setMessage('User created but failed to save details: ' + insertError.message)
    } else {
      setMessage('Signup successful! Please check your email to confirm your account.')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Sign Up for Bookerfly</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>

        {/* Contact Number */}
        <div>
          <label className="block text-sm font-medium">Contact Number</label>
          <input
            type="number"
            name="contactNo"
            value={formData.contactNo}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>

        {/* Subscription Plan */}
        <div>
          <label className="block text-sm font-medium">Subscription Plan</label>
          <input
            type="text"
            name="subscriptionPlan"
            value={formData.subscriptionPlan}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>

        {/* Subscription End Date */}
        <div>
          <label className="block text-sm font-medium">Subscription End Date</label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="mt-1 w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}
    </div>
  )
}
