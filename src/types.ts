export type Role = 'owner' | 'mechanic' | 'customer'
export type ServiceStatus = 'Waiting' | 'Diagnosis' | 'Estimate' | 'In Progress' | 'Ready' | 'Completed' | 'Cancelled'

export interface UserProfile {
  userId?: string
  workshopId?: string
  name: string
  role: Role
  workshopName: string
}

export interface ServiceOrder {
  id: string
  code: string
  customer: string
  vehicleId?: string
  vehicle: string
  plate: string
  vehicleImage?: string
  vehicleBodyType?: string
  service: string
  status: ServiceStatus
  mechanic: string
  progress: number
  total: number
  date: string
}
