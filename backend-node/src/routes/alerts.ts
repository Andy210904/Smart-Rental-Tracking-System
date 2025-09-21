import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const router = Router();

// GET /alerts/?skip=&limit=&is_resolved=
router.get('/', async (req: Request, res: Response) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 100), 1000);
  const isResolved = req.query.is_resolved as string | undefined;
  const where = typeof isResolved === 'undefined' ? undefined : { is_resolved: isResolved === 'true' };
  const items = await prisma.alert.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } });
  res.json(items);
});

// POST /alerts/
router.post('/', async (req: Request, res: Response) => {
  const data = req.body || {};
  try {
    const created = await prisma.alert.create({
      data: {
        rental_id: data.rental_id ?? null,
        equipment_id: data.equipment_id ?? null,
        alert_type: data.alert_type,
        severity: data.severity ?? 'medium',
        title: data.title,
        description: data.description ?? '',
        is_resolved: data.resolved ?? false,
      },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ detail: 'Invalid alert payload' });
  }
});

// PUT /alerts/{alert_id}/resolve?resolved_by=
router.put('/:alert_id/resolve', async (req: Request, res: Response) => {
  const alert_id = Number(req.params.alert_id);
  const resolved_by = (req.query.resolved_by as string | undefined) ?? null;
  try {
    const updated = await prisma.alert.update({
      where: { id: alert_id },
      data: { is_resolved: true, resolved_at: new Date(), resolved_by },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(404).json({ detail: 'Alert not found' });
  }
});
