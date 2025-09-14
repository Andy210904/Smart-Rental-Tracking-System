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

const EquipmentUpdate = EquipmentCreate.partial();

router.get('/', async (req: Request, res: Response) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 1000), 10000);
  const items = await prisma.equipment.findMany({ skip, take: limit });
  res.json(items);
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await prisma.equipment.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: 'Equipment not found' });
  res.json(item);
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

router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = EquipmentUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.equipment.update({ where: { id }, data: parsed.data });
    return res.json(updated);
  } catch (e) {
    return res.status(404).json({ detail: 'Equipment not found' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.equipment.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    return res.status(404).json({ detail: 'Equipment not found' });
  }
});
