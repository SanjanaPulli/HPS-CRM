import { useEffect, useState } from 'react'

const TODO_URL = 'https://smart-to-do-system1.vercel.app'

export default function TodoEmbed() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Get employee info from your CRM's localStorage
        const adminAuth = localStorage.getItem('adminAuth')
        const employeeAuth = localStorage.getItem('employeeAuth')

        let empId, name, role
        if (adminAuth) {
          empId = 'ADMIN'
          name = 'Admin'
          role = 'admin'
        } else if (employeeAuth) {
          const emp = JSON.parse(employeeAuth)
          empId = emp.empId
          name = emp.name
          role = 'employee'
        } else {
          setError(true)
          return
        }

        const res = await fetch(`${TODO_URL}/api/auth/crm-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',  // important — saves the cookie
          body: JSON.stringify({ empId, name, role })
        })

        if (res.ok) {
          setReady(true)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error('Todo auto-login failed:', err)
        setError(true)
      }
    }

    autoLogin()
  }, [])

  if (error) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
      Failed to connect to Todo system. Please try refreshing.
    </div>
  )

  if (!ready) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading Todo System...
    </div>
  )

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid var(--card-border)'
    }}>
      <iframe
        src={TODO_URL}
        title="Smart Todo System"
        width="100%"
        height="100%"
        style={{ border: 'none', display: 'block' }}
      />
    </div>
  )
}