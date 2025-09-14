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

router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = RentalUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.rental.update({ where: { id }, data: parsed.data });
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
