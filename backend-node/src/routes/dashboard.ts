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

  // Get equipment list for Available tab compatibility
  const equipmentList = await prisma.equipment.findMany({
    take: 500,
    include: {
      rentals: {
        where: { status: 'active' },
        orderBy: { check_out_date: 'desc' },
        take: 1
      }
    }
  });

  // Map equipment to frontend format with accurate rental information
  const mappedEquipment = equipmentList.map(eq => {
    const activeRental = eq.rentals[0]; // Get the active rental if exists
    const isActivelyRented = eq.status === 'rented' && activeRental;
    
    return {
      equipment_id: eq.equipment_id,
      type: eq.type,
      // Only show site_id if equipment has an active rental
      site_id: isActivelyRented 
        ? (activeRental.site_id ? `SITE${activeRental.site_id.toString().padStart(3, '0')}` : 'Unassigned')
        : (eq.status === 'available' ? 'Available' : 'Unassigned'),
      engine_hours_per_day: eq.engine_hours_per_day,
      idle_hours_per_day: eq.idle_hours_per_day,
      utilization_ratio: eq.engine_hours_per_day + eq.idle_hours_per_day > 0 
        ? eq.engine_hours_per_day / (eq.engine_hours_per_day + eq.idle_hours_per_day) 
        : 0,
      check_out_date: isActivelyRented ? activeRental.check_out_date.toISOString() : 'N/A',
      check_in_date: eq.check_in_date || 'N/A',
      anomaly_score: 0,
      severity: 'none',
      status: eq.status,
      // Additional rental info for frontend
      rental_id: isActivelyRented ? activeRental.id : null,
      expected_return_date: isActivelyRented ? activeRental.expected_return_date?.toISOString() : null,
      rental_rate_per_day: isActivelyRented ? activeRental.rental_rate_per_day : null,
      operator_id: isActivelyRented ? activeRental.operator_id : null
    };
  });

  res.json({
    overview: {
      total_equipment: total,
      active_rentals: activeRentals,
      overdue_rentals: overdueCount,
      available_equipment: available,
      anomalies: overdueCount, // Use overdue count as anomalies for UI compatibility
      utilization_rate: Math.round(equipmentUtilization * 10) / 10
    },
    equipment_stats: {
      overview: {
        total_equipment: total,
        total_rentals: activeRentals,
        available_equipment: available,
        average_utilization: Math.round(equipmentUtilization * 10) / 10,
        total_engine_hours: Math.round(equipmentList.reduce((sum, eq) => sum + (eq.engine_hours_per_day || 0), 0) * 10) / 10
      }
    },
    anomalies: {
      summary: {
        total_anomalies: overdueCount,
        total_records: total,
        anomaly_types: { overdue: overdueCount }
      },
      anomalies: mappedEquipment.filter(eq => eq.site_id !== 'Available')
    },
    equipment_list: mappedEquipment
  });
});

// GET /dashboard/summary — return DashboardSummary shape comparable to FastAPI
router.get('/dashboard/summary', async (_req: Request, res: Response) => {
  const [total, available, rented, maintenance, overdueCount, recentAlerts] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.count({ where: { status: 'available' } }),
    prisma.equipment.count({ where: { status: 'rented' } }),
    prisma.equipment.count({ where: { status: 'maintenance' } }),
    prisma.rental.count({ where: { status: 'active', expected_return_date: { lt: new Date() } } }),
    prisma.alert.findMany({ orderBy: { created_at: 'desc' }, take: 10 })
  ]);

  const completedRevenueAgg = await prisma.rental.aggregate({ _sum: { total_cost: true }, where: { status: 'completed' }});

  res.json({
    equipment_summary: {
      total_equipment: total,
      available,
      rented,
      maintenance,
      overdue_rentals: overdueCount
    },
    rental_summary: {
      active_rentals: await prisma.rental.count({ where: { status: 'active' } }),
      overdue_rentals: overdueCount,
      total_revenue: Number(completedRevenueAgg._sum.total_cost ?? 0),
      equipment_utilization: total ? Math.round((rented / total) * 1000) / 10 : 0
    },
    recent_alerts: recentAlerts
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
