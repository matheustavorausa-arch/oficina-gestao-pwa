export type Role = 'owner' | 'mechanic' | 'customer'
export type ServiceStatus = 'Waiting' | 'Diagnosis' | 'Estimate' | 'In Progress' | 'Completed'

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
