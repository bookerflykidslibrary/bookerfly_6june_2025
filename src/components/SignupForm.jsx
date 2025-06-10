import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'

export default function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    customerName: '',
    contactNo: '',
    address: '',
    subscriptionPlan: ''
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { email, password, customerName, contactNo, address, subscriptionPlan } = formData

    // 1. Create Auth user
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

    // 2. Insert into customerinfo
    const { error: insertError } = await supabase.from('customerinfo').insert({
      EmailID: email,
      CustomerName: customerName,
      ContactNo: parseInt(contactNo),
      Address: address,
      SubscriptionPlan: subscriptionPlan,
      isActive: true,
      StartDate: new Date().toISOString(),
      EndDate: null,
      userid: userId
    })

    if (insertError) {
      setMessage('User created but failed to save details: ' + insertError.message)
    } else {
      setMessage('Signup successful! Please check your email to confirm.')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          ['Email', 'email', 'email'],
          ['Password', 'password', 'password'],
          ['Name', 'customerName', 'text'],
          ['Contact Number', 'contactNo', 'number'],
          ['Address', 'address', 'text'],
          ['Subscription Plan', 'subscriptionPlan', 'text']
        ].map(([label, name, type]) => (
          <div key={name}>
            <label className="block text-sm font-medium">{label}</label>
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      {message && <p className="mt-4 text-center text-sm text-red-600">{message}</p>}
    </div>
  )
}
