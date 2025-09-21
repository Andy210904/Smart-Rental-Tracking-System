import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

export const router = Router();

const RentalCreate = z.object({
  equipment_id: z.number().int(),
  site_id: z.number().int().nullable().optional(),
  operator_id: z.number().int().nullable().optional(),
  check_out_date: z.coerce.date(),
  expected_return_date: z.coerce.date().nullable().optional(),
  rental_rate_per_day: z.number().nullable().optional()
});

const RentalUpdate = z.object({
  site_id: z.number().int().nullable().optional(),
  operator_id: z.number().int().nullable().optional(),
  check_in_date: z.coerce.date().nullable().optional(),
  expected_return_date: z.coerce.date().nullable().optional(),
  rental_rate_per_day: z.number().nullable().optional(),
  total_cost: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const items = await prisma.rental.findMany({
    where: status ? { status } : undefined,
    take: 100,
    orderBy: { check_out_date: 'desc' }
  });
  res.json(items);
});

// GET /rentals/active
router.get('/active', async (_req: Request, res: Response) => {
  const items = await prisma.rental.findMany({ 
    where: { status: 'active' }, 
    orderBy: { check_out_date: 'desc' },
    include: {
      equipment: true,
      site: true,
      operator: true
    }
  });
  res.json(items);
});

// GET /rentals/active/detailed - Get active rentals with detailed equipment info for UI
router.get('/active/detailed', async (_req: Request, res: Response) => {
  const activeRentals = await prisma.rental.findMany({
    where: { status: 'active' },
    orderBy: { check_out_date: 'desc' },
    include: {
      equipment: true,
      site: true,
      operator: true
    }
  });

  // Format for frontend consumption - similar to dashboard format
  const formatted = activeRentals.map(rental => ({
    id: rental.id,
    equipment_id: rental.equipment.equipment_id,
    type: rental.equipment.type,
    site_id: rental.site_id ? `SITE${rental.site_id.toString().padStart(3, '0')}` : 'Unassigned',
    engine_hours_per_day: rental.equipment.engine_hours_per_day,
    idle_hours_per_day: rental.equipment.idle_hours_per_day,
    utilization_ratio: (rental.equipment.engine_hours_per_day + rental.equipment.idle_hours_per_day) > 0 
      ? rental.equipment.engine_hours_per_day / (rental.equipment.engine_hours_per_day + rental.equipment.idle_hours_per_day) 
      : 0,
    check_out_date: rental.check_out_date.toISOString(),
    check_in_date: rental.check_in_date?.toISOString() || null,
    expected_return_date: rental.expected_return_date?.toISOString() || null,
    rental_rate_per_day: rental.rental_rate_per_day,
    total_cost: rental.total_cost,
    status: rental.equipment.status,
    rental_status: rental.status,
    operator_id: rental.operator_id,
    site_name: rental.site?.name || 'Unknown Site',
    operator_name: rental.operator?.name || 'Unknown Operator',
    notes: rental.notes,
    anomaly_score: 0,
    severity: 'none'
  }));

  res.json(formatted);
});

// GET /rentals/overdue
router.get('/overdue', async (_req: Request, res: Response) => {
  const now = new Date();
  const items = await prisma.rental.findMany({ 
    where: { status: 'active', expected_return_date: { lt: now } }, 
    orderBy: { expected_return_date: 'asc' },
    include: {
      equipment: true,
      site: true,
      operator: true
    }
  });
  
  // Format for frontend consumption - similar to active/detailed format
  const formatted = items.map(rental => {
    const now = new Date();
    const expectedReturn = rental.expected_return_date ? new Date(rental.expected_return_date) : null;
    const daysRemaining = expectedReturn ? Math.ceil((expectedReturn.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;
    
    return {
      id: rental.id,
      equipment_id: rental.equipment.equipment_id,
      type: rental.equipment.type,
      site_id: rental.site_id ? `SITE${rental.site_id.toString().padStart(3, '0')}` : 'Unassigned',
      check_out_date: rental.check_out_date.toISOString(),
      expected_return_date: rental.expected_return_date?.toISOString() || null,
      days_remaining: daysRemaining,
      rental_rate_per_day: rental.rental_rate_per_day,
      severity: Math.abs(daysRemaining) <= 1 ? 'high' : Math.abs(daysRemaining) <= 3 ? 'medium' : 'low',
      operator_name: rental.operator?.name || 'Unknown Operator',
      site_name: rental.site?.name || 'Unknown Site',
      status: rental.equipment.status,
      rental_status: rental.status,
      operator_id: rental.operator_id,
      notes: rental.notes
    };
  });
  
  res.json(formatted);
});

// GET /rentals/due-soon?days_ahead=7
router.get('/due-soon', async (req: Request, res: Response) => {
  const daysAhead = Number(req.query.days_ahead ?? 7);
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 3600 * 1000);
  const items = await prisma.rental.findMany({
    where: {
      status: 'active',
      expected_return_date: { gte: now, lte: future }
    },
    orderBy: { expected_return_date: 'asc' },
    include: {
      equipment: true,
      site: true,
      operator: true
    }
  });
  
  // Format for frontend consumption - similar to active/detailed format
  const formatted = items.map(rental => {
    const now = new Date();
    const expectedReturn = rental.expected_return_date ? new Date(rental.expected_return_date) : null;
    const daysRemaining = expectedReturn ? Math.ceil((expectedReturn.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;
    
    return {
      id: rental.id,
      equipment_id: rental.equipment.equipment_id,
      type: rental.equipment.type,
      site_id: rental.site_id ? `SITE${rental.site_id.toString().padStart(3, '0')}` : 'Unassigned',
      check_out_date: rental.check_out_date.toISOString(),
      expected_return_date: rental.expected_return_date?.toISOString() || null,
      days_remaining: daysRemaining,
      rental_rate_per_day: rental.rental_rate_per_day,
      severity: daysRemaining <= 1 ? 'high' : daysRemaining <= 3 ? 'medium' : 'low',
      operator_name: rental.operator?.name || 'Unknown Operator',
      site_name: rental.site?.name || 'Unknown Site',
      status: rental.equipment.status,
      rental_status: rental.status,
      operator_id: rental.operator_id,
      notes: rental.notes
    };
  });
  
  res.json(formatted);
});

// GET /rentals/all
router.get('/all', async (_req: Request, res: Response) => {
  const items = await prisma.rental.findMany({ orderBy: { id: 'desc' } });
  res.json(items);
});

// GET /rentals/paginated?page=&limit=&status=
router.get('/paginated', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(Number(req.query.limit ?? 10), 100);
  const status = (req.query.status as string | undefined) || undefined;
  const skip = (page - 1) * limit;
  const where = status ? { status } : undefined;
  const [items, total] = await Promise.all([
    prisma.rental.findMany({ where, skip, take: limit, orderBy: { id: 'desc' } }),
    prisma.rental.count({ where })
  ]);
  res.json({ page, limit, total, items });
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = RentalCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rental = await tx.rental.create({ data: parsed.data });
      await tx.equipment.update({ where: { id: parsed.data.equipment_id }, data: { status: 'rented' } });
      return rental;
    });
    return res.status(201).json(created);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /rentals/manual — same as create but explicitly marked manual
router.post('/manual', async (req: Request, res: Response) => {
  const parsed = RentalCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const rental = await prisma.rental.create({ data: parsed.data });
    await prisma.equipment.update({ where: { id: parsed.data.equipment_id }, data: { status: 'rented' } });
    return res.status(201).json(rental);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = RentalUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.rental.update({ where: { id }, data: parsed.data as any });
    return res.json(updated);
  } catch (e: any) {
    return res.status(404).json({ detail: 'Rental not found' });
  }
});

router.post('/:id/checkin', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rental = await tx.rental.update({ where: { id }, data: { status: 'completed', check_in_date: new Date() } });
      await tx.equipment.update({ where: { id: rental.equipment_id }, data: { status: 'available' } });
      return rental;
    });
    return res.json(updated);
  } catch (e: any) {
    return res.status(404).json({ detail: 'Rental not found' });
  }
});

// POST /rentals/:id/extend?extension_days=
router.post('/:id/extend', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const extensionDays = Number(req.query.extension_days ?? 0);
  if (!extensionDays || extensionDays <= 0) return res.status(400).json({ detail: 'extension_days must be > 0' });
  try {
    const rental = await prisma.rental.findUnique({ where: { id } });
    if (!rental) return res.status(404).json({ detail: 'Rental not found' });
    const currentExpected = rental.expected_return_date ? new Date(rental.expected_return_date) : new Date();
    const newExpected = new Date(currentExpected.getTime() + extensionDays * 24 * 3600 * 1000);
    const updated = await prisma.rental.update({ where: { id }, data: { expected_return_date: newExpected } });
    return res.json(updated);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});

// GET /rentals/:id/timer — simple elapsed/remaining info
router.get('/:id/timer', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const rental = await prisma.rental.findUnique({ where: { id } });
  if (!rental) return res.status(404).json({ detail: 'Rental not found' });
  const now = new Date();
  const start = new Date(rental.check_out_date);
  const end = rental.expected_return_date ? new Date(rental.expected_return_date) : null;
  const elapsedMs = now.getTime() - start.getTime();
  const remainingMs = end ? end.getTime() - now.getTime() : null;
  res.json({
    rental_id: id,
    elapsed_ms: elapsedMs,
    remaining_ms: remainingMs,
    overdue: end ? remainingMs! < 0 && rental.status === 'active' : false
  });
});

// Rental analytics summary
router.get('/analytics/summary', async (_req: Request, res: Response) => {
  const [active, overdue, revenueAgg] = await Promise.all([
    prisma.rental.count({ where: { status: 'active' } }),
    prisma.rental.count({ where: { status: 'active', expected_return_date: { lt: new Date() } } }),
    prisma.rental.aggregate({ _sum: { total_cost: true }, where: { status: 'completed' } })
  ]);
  const totalRevenue = Number(revenueAgg._sum.total_cost ?? 0);
  res.json({ active_rentals: active, overdue_rentals: overdue, total_revenue: totalRevenue, equipment_utilization: null });
});

// Equipment rental history
router.get('/analytics/equipment/:equipment_id', async (req: Request, res: Response) => {
  const equipment_id = Number(req.params.equipment_id);
  const items = await prisma.rental.findMany({ where: { equipment_id }, orderBy: { check_out_date: 'desc' } });
  res.json({ equipment_id, history: items });
});

// Site rental analytics
router.get('/analytics/site/:site_id', async (req: Request, res: Response) => {
  const site_id = Number(req.params.site_id);
  const items = await prisma.rental.findMany({ where: { site_id }, orderBy: { check_out_date: 'desc' } });
  const total = items.length;
  const completed = items.filter((r) => r.status === 'completed');
  const revenue = completed.reduce((acc, r) => acc + (r.total_cost ?? 0), 0);
  res.json({ site_id, total_rentals: total, completed: completed.length, revenue });
});

// Background: send all reminders (no-op summary)
router.post('/send-all-reminders', async (_req: Request, res: Response) => {
  const dueSoon = await prisma.rental.count({ where: { status: 'active', expected_return_date: { gte: new Date() } } });
  res.json({ ok: true, processed: dueSoon });
});

// Background: send overdue alerts (no-op summary)
router.post('/send-overdue-alerts', async (_req: Request, res: Response) => {
  const overdue = await prisma.rental.count({ where: { status: 'active', expected_return_date: { lt: new Date() } } });
  res.json({ ok: true, processed: overdue });
});
