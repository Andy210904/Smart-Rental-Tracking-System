import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const router = Router();

const SiteCreate = z.object({
  site_id: z.string(),
  name: z.string(),
  location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
});

router.get('/', async (_req: Request, res: Response) => {
  const items = await prisma.site.findMany({ take: 100 });
  res.json(items);
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = SiteCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const created = await prisma.site.create({ data: parsed.data });
    return res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ detail: 'Site ID already exists' });
    console.error(e);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});
