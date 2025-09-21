import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const router = Router();

const UsageLogCreate = z.object({
  rental_id: z.number().int(),
  equipment_id: z.number().int(),
  operator_id: z.number().int().nullable().optional(),
  date: z.coerce.date(),
  engine_hours: z.number().optional().default(0),
  idle_hours: z.number().optional().default(0),
  fuel_usage: z.number().optional().default(0),
  location_lat: z.number().nullable().optional(),
  location_lng: z.number().nullable().optional(),
  condition_rating: z.number().int().nullable().optional(),
  maintenance_required: z.boolean().optional().default(false),
  maintenance_notes: z.string().nullable().optional(),
});

// POST /usage-logs/
router.post('/', async (req: Request, res: Response) => {
  const parsed = UsageLogCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const created = await prisma.usageLog.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ detail: 'Invalid usage log payload' });
  }
});

// GET /usage-logs/rental/{rental_id}
router.get('/rental/:rental_id', async (req: Request, res: Response) => {
  const rental_id = Number(req.params.rental_id);
  const items = await prisma.usageLog.findMany({ where: { rental_id }, orderBy: { date: 'desc' } });
  res.json(items);
});

// GET /usage-logs/equipment/{equipment_id}
router.get('/equipment/:equipment_id', async (req: Request, res: Response) => {
  const equipment_id = Number(req.params.equipment_id);
  const items = await prisma.usageLog.findMany({ where: { equipment_id }, orderBy: { date: 'desc' } });
  res.json(items);
});
