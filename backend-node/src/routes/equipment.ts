import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

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
  const rawStatus = (req.query.status as string | undefined) || undefined;
  const normalized = rawStatus ? rawStatus.toLowerCase() : undefined;
  const status = normalized === 'in_use' || normalized === 'active' ? 'rented'
    : normalized === 'idle' || normalized === 'in_stock' ? 'available'
    : normalized;
  const where = status ? { status } : undefined;
  const items = await prisma.equipment.findMany({ where, skip, take: limit });
  res.json(items);
});

// Convenience: GET /equipment/available — all available equipment
router.get('/available', async (_req: Request, res: Response) => {
  const items = await prisma.equipment.findMany({ where: { status: 'available' }, orderBy: { id: 'desc' } });
  res.json(items);
});

// Convenience: GET /equipment/rented — all rented equipment
router.get('/rented', async (_req: Request, res: Response) => {
  const items = await prisma.equipment.findMany({ where: { status: 'rented' }, orderBy: { id: 'desc' } });
  res.json(items);
});

// GET /equipment/all — all equipment without pagination
router.get('/all', async (_req: Request, res: Response) => {
  const items = await prisma.equipment.findMany();
  res.json(items);
});

// GET /equipment/count — total count
router.get('/count', async (_req: Request, res: Response) => {
  const count = await prisma.equipment.count();
  res.json({ count });
});

// GET /equipment/status/detailed — equipment with current status details
router.get('/status/detailed', async (req: Request, res: Response) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 1000), 10000);
  const rawStatus = (req.query.status as string | undefined) || undefined;
  const normalized = rawStatus ? rawStatus.toLowerCase() : undefined;
  const status = normalized === 'in_use' || normalized === 'active' ? 'rented'
    : normalized === 'idle' || normalized === 'in_stock' ? 'available'
    : normalized;
  const items = await prisma.equipment.findMany({
    skip,
    take: limit,
    where: status ? { status } : undefined,
    include: {
      rentals: {
        where: { status: 'active' },
        orderBy: { check_out_date: 'desc' },
        take: 1
      }
    }
  });
  const mapped = items.map((eq) => ({
    id: eq.id,
    equipment_id: eq.equipment_id,
    type: eq.type,
    model: eq.model,
    manufacturer: eq.manufacturer,
    year: eq.year,
    serial_number: eq.serial_number,
    status: eq.status,
    created_at: eq.created_at,
    updated_at: eq.updated_at,
    current_rental: eq.rentals[0] ?? null,
    current_site: null,
    current_operator: null
  }));
  res.json(mapped);
});

// GET /equipment/paginated?page=&limit=&status=
router.get('/paginated', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(Number(req.query.limit ?? 10), 100);
  const status = (req.query.status as string | undefined) || undefined;
  const skip = (page - 1) * limit;
  const where = status ? { status } : undefined;
  const [items, total] = await Promise.all([
    prisma.equipment.findMany({ where, skip, take: limit, orderBy: { id: 'desc' } }),
    prisma.equipment.count({ where })
  ]);
  res.json({ page, limit, total, items });
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

// Return equipment by external equipment_id (e.g., EQ1001)
router.post('/:equipmentCode/return', async (req: Request, res: Response) => {
  const equipmentCode = req.params.equipmentCode;
  try {
    const eq = await prisma.equipment.findUnique({ 
      where: { equipment_id: equipmentCode },
      include: {
        rentals: {
          where: { status: 'active' },
          orderBy: { check_out_date: 'desc' }
        }
      }
    });
    
    if (!eq) return res.status(404).json({ detail: 'Equipment not found' });

    // Enhanced debugging - check current equipment status
    console.log(`Equipment ${equipmentCode} current status: ${eq.status}, active rentals: ${eq.rentals.length}`);

    // Check if equipment is already available
    if (eq.status === 'available') {
      return res.status(400).json({ 
        detail: 'Equipment is already available',
        current_status: eq.status,
        active_rentals: eq.rentals.length
      });
    }

    // Find the active rental
    const activeRental = eq.rentals[0];
    if (!activeRental) {
      // Equipment is marked as rented but no active rental exists - fix the inconsistency
      console.log(`Fixing inconsistency: Equipment ${equipmentCode} marked as ${eq.status} but no active rental found`);
      
      const result = await prisma.$transaction(async (tx) => {
        // Fix the equipment status
        const updatedEquipment = await tx.equipment.update({
          where: { id: eq.id },
          data: { 
            status: 'available', 
            check_out_date: null, 
            check_in_date: new Date().toISOString() 
          }
        });

        // Close any stale active rentals (defensive cleanup)
        await tx.rental.updateMany({
          where: { equipment_id: eq.id, status: 'active' },
          data: { 
            status: 'completed', 
            check_in_date: new Date(),
            total_cost: 0
          }
        });

        return { equipment: updatedEquipment, fixed_inconsistency: true };
      });

      return res.status(200).json({ 
        ok: true, 
        message: 'Fixed database inconsistency - equipment is now available',
        ...result
      });
    }

    const now = new Date();
    const days = Math.max(
      1,
      Math.ceil((now.getTime() - new Date(activeRental.check_out_date).getTime()) / (24 * 3600 * 1000))
    );
    const totalCost = activeRental.rental_rate_per_day
      ? Number((activeRental.rental_rate_per_day * days).toFixed(2))
      : null;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Complete the active rental
      const updatedRental = await tx.rental.update({
        where: { id: activeRental.id },
        data: { status: 'completed', check_in_date: now, total_cost: totalCost }
      });

      // 2) Ensure no lingering active rentals exist for this equipment (defensive cleanup)
      await tx.rental.updateMany({
        where: { equipment_id: eq.id, status: 'active', id: { not: activeRental.id } },
        data: { status: 'completed', check_in_date: now }
      });

      // 3) Mark equipment available and clear check_out_date; set check_in_date string
      const updatedEquipment = await tx.equipment.update({
        where: { id: eq.id },
        data: { status: 'available', check_out_date: null, check_in_date: now.toISOString() }
      });

      // 4) Get updated counts for frontend
      const [availableCount, activeRentalCount] = await Promise.all([
        tx.equipment.count({ where: { status: 'available' } }),
        tx.rental.count({ where: { status: 'active' } })
      ]);

      // Fetch fresh snapshots to return consistent state to the client
      const [rentalAfter, equipmentAfter] = await Promise.all([
        tx.rental.findUnique({ where: { id: updatedRental.id } }),
        tx.equipment.findUnique({ where: { id: updatedEquipment.id } })
      ]);

      return { 
        rental: rentalAfter, 
        equipment: equipmentAfter, 
        active_rentals_remaining: activeRentalCount,
        available_equipment_count: availableCount,
        days_rented: days
      };
    });

    return res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('Error returning equipment', e);
    return res.status(500).json({ detail: 'Internal server error', error: e.message });
  }
});

// PUT /equipment/{equipment_id}/status — by external string code
router.put('/:equipmentCode/status', async (req: Request, res: Response) => {
  const equipmentCode = req.params.equipmentCode;
  const data = req.body as Record<string, any>;
  try {
    const eq = await prisma.equipment.findUnique({ where: { equipment_id: equipmentCode } });
    if (!eq) return res.status(404).json({ detail: 'Equipment not found' });
    
    const result = await prisma.$transaction(async (tx) => {
      // Filter out fields that shouldn't be updated (like primary key id, created_at, etc.)
      const { id, created_at, updated_at, ...updateData } = data;
      
      // Update equipment status
      const updatedEquipment = await tx.equipment.update({ 
        where: { id: eq.id }, 
        data: {
          ...updateData,
          check_out_date: updateData.status === 'rented' ? new Date().toISOString() : updateData.check_out_date,
          check_in_date: updateData.status === 'available' ? new Date().toISOString() : null
        }
      });
      
      let rental = null;
      
      // If status is being changed to 'rented', create a new rental record
      if (data.status === 'rented') {
        // First, close any existing active rentals for this equipment
        await tx.rental.updateMany({
          where: { equipment_id: eq.id, status: 'active' },
          data: { status: 'completed', check_in_date: new Date() }
        });
        
        // Create new rental record
        rental = await tx.rental.create({
          data: {
            equipment_id: eq.id,
            site_id: 1, // Default site, should be provided by frontend
            operator_id: 1, // Default operator, should be provided by frontend
            check_out_date: new Date(),
            expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            rental_rate_per_day: 250, // Default rate
            status: 'active',
            notes: 'Created from equipment status update'
          }
        });
      }
      
      // If status is being changed from 'rented' to something else, complete active rentals
      if (eq.status === 'rented' && data.status !== 'rented') {
        await tx.rental.updateMany({
          where: { equipment_id: eq.id, status: 'active' },
          data: { 
            status: 'completed', 
            check_in_date: new Date(),
            total_cost: 250 * 7 // Default calculation
          }
        });
      }
      
      return { equipment: updatedEquipment, rental };
    });
    
    return res.json(result);
  } catch (e: any) {
    console.error('Error updating equipment status', e);
    return res.status(500).json({ detail: 'Internal server error' });
  }
});
