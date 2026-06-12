import { useEffect, useState } from 'react'

const TODO_URL = 'https://smart-to-do-system1.vercel.app'

export default function TodoEmbed() {
  const [src, setSrc] = useState(null)

  useEffect(() => {
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
    } else return

    const url = `${TODO_URL}?crm_emp=${encodeURIComponent(empId)}&crm_name=${encodeURIComponent(name)}&crm_role=${encodeURIComponent(role)}`
    setSrc(url)
  }, [])

  if (!src) return (
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
        src={src}
        title="Smart Todo System"
        width="100%"
        height="100%"
        style={{ border: 'none', display: 'block' }}
      />
    </div>
  )
}