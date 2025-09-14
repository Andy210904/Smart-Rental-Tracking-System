import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const router = Router();

const OperatorCreate = z.object({
  operator_id: z.string(),
  name: z.string(),
  license_number: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  certification_level: z.string().nullable().optional(),
});

router.get('/', async (_req: Request, res: Response) => {
  const items = await prisma.operator.findMany({ take: 100 });
  res.json(items);
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = OperatorCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const created = await prisma.operator.create({ data: parsed.data });
    return res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ detail: 'Operator ID already exists' });
    console.error(e);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});
