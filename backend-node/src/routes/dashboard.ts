import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const router = Router();

router.get('/dashboard', async (_req: Request, res: Response) => {
  // Basic summary parity with FastAPI
  const [total, available, rented, maintenance, overdueCount] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.count({ where: { status: 'available' } }),
    prisma.equipment.count({ where: { status: 'rented' } }),
    prisma.equipment.count({ where: { status: 'maintenance' } }),
    prisma.rental.count({ where: { status: 'active', expected_return_date: { lt: new Date() } } })
  ]);

  const activeRentals = await prisma.rental.count({ where: { status: 'active' } });
  const completedRevenueAgg = await prisma.rental.aggregate({ _sum: { total_cost: true }, where: { status: 'completed' }});
  const equipmentUtilization = total > 0 ? (rented / total) * 100 : 0;

  res.json({
    overview: {
      total_equipment: total,
      active_rentals: activeRentals,
      anomalies: 0, // placeholder; implement anomaly detection later
      utilization_rate: Math.round(equipmentUtilization * 10) / 10
    }
  });
});

router.get('/equipment-stats', async (_req: Request, res: Response) => {
  const equipment = await prisma.equipment.findMany({ take: 1000 });
  const total_records = equipment.length;
  const typeCounts: Record<string, number> = {};
  let total_engine_hours = 0;
  let total_idle_hours = 0;
  let records_with_sites = 0;
  let records_with_operators = 0;

  for (const eq of equipment) {
    typeCounts[eq.type] = (typeCounts[eq.type] ?? 0) + 1;
    total_engine_hours += eq.engine_hours_per_day ?? 0;
    total_idle_hours += eq.idle_hours_per_day ?? 0;
    if (eq.site_id) records_with_sites += 1;
    if (eq.last_operator_id) records_with_operators += 1;
  }

  const avg_engine_hours = total_records ? total_engine_hours / total_records : 0;
  const avg_idle_hours = total_records ? total_idle_hours / total_records : 0;
  const avg_utilization = (total_engine_hours + total_idle_hours) > 0 ? (total_engine_hours / (total_engine_hours + total_idle_hours)) * 100 : 0;

  res.json({
    summary: {
      total_records,
      total_engine_hours: Math.round(total_engine_hours * 10) / 10,
      total_idle_hours: Math.round(total_idle_hours * 10) / 10,
      average_engine_hours_per_day: Math.round(avg_engine_hours * 10) / 10,
      average_idle_hours_per_day: Math.round(avg_idle_hours * 10) / 10,
      average_utilization_percentage: Math.round(avg_utilization * 10) / 10
    },
    equipment_types: typeCounts,
    assignments: {
      records_with_sites,
      records_without_sites: total_records - records_with_sites,
      records_with_operators,
      records_without_operators: total_records - records_with_operators
    }
  });
});
