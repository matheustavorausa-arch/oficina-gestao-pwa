import type { ServiceOrder } from './types'

export const demoOrders: ServiceOrder[] = [
  { id: '1', code: 'OS-1048', customer: 'Marina Alves', vehicle: 'Honda Civic 2020', plate: 'BRA-2E19', service: 'Full inspection', status: 'In Progress', mechanic: 'Carlos Lima', progress: 68, total: 1840, date: 'Today, 2:30 PM' },
  { id: '2', code: 'OS-1047', customer: 'Rafael Souza', vehicle: 'Jeep Renegade 2021', plate: 'GHJ-8K42', service: 'Brakes and suspension', status: 'Estimate', mechanic: 'Ana Paula', progress: 35, total: 2760, date: 'Today, 11:00 AM' },
  { id: '3', code: 'OS-1046', customer: 'Beatriz Melo', vehicle: 'VW T-Cross 2022', plate: 'QWE-4R88', service: 'Oil change', status: 'Completed', mechanic: 'Carlos Lima', progress: 100, total: 490, date: 'Yesterday, 4:45 PM' },
  { id: '4', code: 'OS-1045', customer: 'Joao Martins', vehicle: 'Toyota Corolla 2019', plate: 'ABC-1D23', service: 'Electronic diagnostic', status: 'Diagnosis', mechanic: 'Ana Paula', progress: 18, total: 320, date: 'Yesterday, 10:20 AM' },
]
