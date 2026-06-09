import { Navigate } from 'react-router-dom'

export default function RequireAuth({ children, role }) {
  const admin = localStorage.getItem('adminAuth')
  const employee = localStorage.getItem('employeeAuth')

  if (role === 'admin' && !admin) {
    return <Navigate to="/" replace />
  }

  if (role === 'employee' && !employee) {
    return <Navigate to="/" replace />
  }

  return children
}