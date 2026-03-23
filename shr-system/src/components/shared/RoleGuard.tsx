import type { ReactNode } from 'react'
import type { UserRole } from '../../types/types'
import { useAuth } from '../../context/AuthContext'

interface RoleGuardProps {
  roles: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { hasRole } = useAuth()
  return hasRole(roles) ? <>{children}</> : <>{fallback}</>
}
