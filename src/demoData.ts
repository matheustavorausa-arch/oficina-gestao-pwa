import type { ServiceOrder } from './types'

export const demoOrders: ServiceOrder[] = [
  { id: '1', code: 'OS-1048', customer: 'Marina Alves', vehicle: 'Honda Civic 2020', plate: 'BRA-2E19', service: 'Revisão completa', status: 'Em execução', mechanic: 'Carlos Lima', progress: 68, total: 1840, date: 'Hoje, 14:30' },
  { id: '2', code: 'OS-1047', customer: 'Rafael Souza', vehicle: 'Jeep Renegade 2021', plate: 'GHJ-8K42', service: 'Freios e suspensão', status: 'Orçamento', mechanic: 'Ana Paula', progress: 35, total: 2760, date: 'Hoje, 11:00' },
  { id: '3', code: 'OS-1046', customer: 'Beatriz Melo', vehicle: 'VW T-Cross 2022', plate: 'QWE-4R88', service: 'Troca de óleo', status: 'Finalizado', mechanic: 'Carlos Lima', progress: 100, total: 490, date: 'Ontem, 16:45' },
  { id: '4', code: 'OS-1045', customer: 'João Martins', vehicle: 'Toyota Corolla 2019', plate: 'ABC-1D23', service: 'Diagnóstico eletrônico', status: 'Diagnóstico', mechanic: 'Ana Paula', progress: 18, total: 320, date: 'Ontem, 10:20' },
]

