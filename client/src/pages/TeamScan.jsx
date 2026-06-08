import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function TeamScan() {
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('employeeAuth')
    if (!stored) { navigate('/employee/login'); return }

    const emp = JSON.parse(stored)

    // ✅ Use isAttendanceLeader instead of hardcoded positions
    if (!emp.isAttendanceLeader) {
      navigate('/employee/dashboard')
      return
    }

    navigate('/scan?from=employee')
  }, [])

  return null
}

export default TeamScan