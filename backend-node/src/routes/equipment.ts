import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const router = Router();

// Schema mirroring FastAPI EquipmentCreate
const EquipmentCreate = z.object({
  equipment_id: z.string(),
  type: z.string(),
  site_id: z.string().nullable().optional(),
  check_out_date: z.string().nullable().optional(),
  check_in_date: z.string().nullable().optional(),
  engine_hours_per_day: z.number().optional().default(0),
  idle_hours_per_day: z.number().optional().default(0),
  operating_days: z.number().optional().default(0),
  last_operator_id: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  status: z.string().optional().default('available')
});

router.get('/', async (_req: Request, res: Response) => {
  const items = await prisma.equipment.findMany({ take: 1000 });
  res.json(items);
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = EquipmentCreate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const created = await prisma.equipment.create({ data: parsed.data });
    return res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(400).json({ detail: 'Equipment ID already registered' });
    }
    console.error(e);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});
