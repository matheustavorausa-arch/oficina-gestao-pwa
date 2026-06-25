export type Role = 'owner' | 'mechanic' | 'customer'
export type ServiceStatus = 'Aguardando' | 'Diagnóstico' | 'Orçamento' | 'Em execução' | 'Finalizado'

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
