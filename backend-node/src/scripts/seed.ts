import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function pick<T = any>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const now = new Date();
  const resetAll = process.env.RESET_ALL === '1' || process.env.RESET_ALL === 'true';
  const eqCount = await prisma.equipment.count();
  const force = process.env.FORCE_SEED === '1' || process.env.FORCE_SEED === 'true';

  // Desired dataset shape (env-overridable)
  const EQUIPMENT_TOTAL = Number(process.env.EQUIPMENT_TOTAL ?? 150);
  const RENTALS_ACTIVE = Number(process.env.RENTALS_ACTIVE ?? 60);
  const RENTALS_OVERDUE = Number(process.env.RENTALS_OVERDUE ?? 12); // subset of active
  const RENTALS_DUE_SOON = Number(process.env.RENTALS_DUE_SOON ?? 18); // subset of active
  const RENTALS_COMPLETED = Number(process.env.RENTALS_COMPLETED ?? 50);
  const MAINTENANCE_COUNT = Number(process.env.MAINTENANCE_COUNT ?? 10);
  const RETIRED_COUNT = Number(process.env.RETIRED_COUNT ?? 5);

  // Sanity caps
  const ACTIVE = Math.min(RENTALS_ACTIVE, EQUIPMENT_TOTAL);
  const OVERDUE = Math.min(RENTALS_OVERDUE, ACTIVE);
  const DUE_SOON = Math.min(RENTALS_DUE_SOON, ACTIVE - OVERDUE);
  const COMPLETED = Math.min(RENTALS_COMPLETED, EQUIPMENT_TOTAL - ACTIVE);
  const nonActiveRemaining = EQUIPMENT_TOTAL - ACTIVE;
  const MAINT = Math.min(MAINTENANCE_COUNT, Math.max(0, nonActiveRemaining - COMPLETED));
  const RETIRED = Math.min(RETIRED_COUNT, Math.max(0, nonActiveRemaining - COMPLETED - MAINT));

  // Hard reset: wipe all data across tables (FK-safe order) and optionally reset sequences
  if (resetAll) {
    console.log('RESET_ALL set — wiping all data...');
    // FK order: UsageLog -> Alert -> Rental -> MaintenanceRecord -> DemandForecast -> Equipment -> Site -> Operator
    await prisma.usageLog.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.rental.deleteMany({});
    await prisma.maintenanceRecord.deleteMany({});
    await prisma.demandForecast.deleteMany({});
    await prisma.equipment.deleteMany({});
    await prisma.site.deleteMany({});
    await prisma.operator.deleteMany({});
    try {
      // Reset sqlite autoincrement sequences if on SQLite
      await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence;");
    } catch (e) {
      console.warn('Could not reset sqlite sequences (non-sqlite db or table missing). Proceeding.');
    }
  }

  if (eqCount < 100 || force) {
    console.log(`Seeding database with EQUIPMENT=${EQUIPMENT_TOTAL}, ACTIVE=${ACTIVE} (OVERDUE=${OVERDUE}, DUE_SOON=${DUE_SOON}), COMPLETED=${COMPLETED}, MAINTENANCE=${MAINT}, RETIRED=${RETIRED} ...`);

    // Sites
    const sitePayload = Array.from({ length: 8 }, (_v, i) => ({
      site_id: `S${String(i + 1).padStart(3, '0')}`,
      name: `Site ${i + 1}`,
      location: pick(['City A', 'City B', 'City C', 'North Hub', 'South Depot']),
      address: `Address ${i + 1}`,
      contact_person: `Manager ${i + 1}`,
      contact_phone: `+1-555-010${i}`,
    }));
    await Promise.all(
      sitePayload.map((s) =>
        prisma.site.upsert({ where: { site_id: s.site_id }, create: s, update: { ...s } })
      )
    );

    // Operators
    const operatorPayload = Array.from({ length: 25 }, (_v, i) => ({
      operator_id: `OP${String(100 + i)}`,
      name: `Operator ${i + 1}`,
      license_number: `LIC-${10000 + i}`,
      phone: `+1-555-020${i}`,
      email: `op${i + 1}@example.com`,
      certification_level: pick(['A', 'B', 'C', 'Expert']),
    }));
    await Promise.all(
      operatorPayload.map((o) =>
        prisma.operator.upsert({ where: { operator_id: o.operator_id }, create: o, update: { ...o } })
      )
    );

    // Equipment
    const equipmentTypes = ['Excavator', 'Crane', 'Bulldozer', 'Dump Truck', 'Loader'];
    const manufacturers = ['Caterpillar', 'Komatsu', 'Hitachi', 'Volvo', 'Liebherr'];
    const baseYear = 2012;
  const sitesAll = (await prisma.site.findMany()) as any[];
  const operatorsAll = (await prisma.operator.findMany()) as any[];

    const equipmentPayload = Array.from({ length: EQUIPMENT_TOTAL }, (_v, i) => {
      const year = baseYear + (i % 12);
      const type = pick(equipmentTypes);
      const status = 'available';
      return {
        equipment_id: `EQ${String(1000 + i)}`,
        type,
        site_id: pick(sitesAll).site_id,
        check_out_date: null,
        check_in_date: null,
        engine_hours_per_day: Number((Math.random() * 8).toFixed(1)),
        idle_hours_per_day: Number((Math.random() * 5).toFixed(1)),
        operating_days: randInt(0, 25),
        last_operator_id: pick(operatorsAll).operator_id,
        model: `${type.substring(0, 2).toUpperCase()}-${100 + (i % 50)}`,
        manufacturer: pick(manufacturers),
        year,
        serial_number: `SN-${100000 + i}`,
        status,
      };
    });
    await Promise.all(
      equipmentPayload.map((e) =>
        prisma.equipment.upsert({ where: { equipment_id: e.equipment_id }, create: e, update: { ...e } })
      )
    );
  } else {
    console.log(`Database already has ${eqCount} equipment records, skipping equipment/site/operator seeding.`);
  }

  // Fetch entities for relation-based seeding
  const sites = (await prisma.site.findMany()) as any[];
  const operators = (await prisma.operator.findMany()) as any[];
  const equipment = (await prisma.equipment.findMany({ orderBy: { id: 'asc' } })) as any[];

  const sampleItems = (arr: any[], n: number): any[] => {
    const pool = [...arr];
    const res: any[] = [];
    const take = Math.min(n, pool.length);
    for (let i = 0; i < take; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      res.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return res;
  };

  // Rentals — make deterministic splits by position to achieve exact counts
  const activeSet = equipment.slice(0, ACTIVE);
  const overdueSet = activeSet.slice(0, OVERDUE);
  const dueSoonSet = activeSet.slice(OVERDUE, OVERDUE + DUE_SOON);
  const regularActiveSet = activeSet.slice(OVERDUE + DUE_SOON);
  const completedSet = equipment.slice(ACTIVE, ACTIVE + COMPLETED);

  // Create overdue active rentals (expected_return_date < now)
  for (const eq of overdueSet) {
    const site = pick(sites);
    const op = pick(operators);
    const checkOut = new Date(now.getTime() - randInt(10, 20) * 24 * 3600 * 1000);
    const expected = new Date(now.getTime() - randInt(1, 5) * 24 * 3600 * 1000);
    await prisma.rental.create({
      data: {
        equipment_id: eq.id,
        site_id: site.id,
        operator_id: op.id,
        check_out_date: checkOut,
        expected_return_date: expected,
        rental_rate_per_day: randInt(150, 400),
        status: 'active',
      },
    });
    await prisma.equipment.update({ where: { id: eq.id }, data: { status: 'rented', check_out_date: checkOut.toISOString(), check_in_date: null } });
  }

  // Create due-soon active rentals (now < expected_return_date <= now + 7 days)
  for (const eq of dueSoonSet) {
    const site = pick(sites);
    const op = pick(operators);
    const checkOut = new Date(now.getTime() - randInt(1, 7) * 24 * 3600 * 1000);
    const expected = new Date(now.getTime() + randInt(1, 7) * 24 * 3600 * 1000);
    await prisma.rental.create({
      data: {
        equipment_id: eq.id,
        site_id: site.id,
        operator_id: op.id,
        check_out_date: checkOut,
        expected_return_date: expected,
        rental_rate_per_day: randInt(150, 400),
        status: 'active',
      },
    });
    await prisma.equipment.update({ where: { id: eq.id }, data: { status: 'rented', check_out_date: checkOut.toISOString(), check_in_date: null } });
  }

  // Create regular active rentals (expected_return_date > now + 7 days)
  for (const eq of regularActiveSet) {
    const site = pick(sites);
    const op = pick(operators);
    const checkOut = new Date(now.getTime() - randInt(1, 10) * 24 * 3600 * 1000);
    const expected = new Date(now.getTime() + randInt(8, 20) * 24 * 3600 * 1000);
    await prisma.rental.create({
      data: {
        equipment_id: eq.id,
        site_id: site.id,
        operator_id: op.id,
        check_out_date: checkOut,
        expected_return_date: expected,
        rental_rate_per_day: randInt(150, 400),
        status: 'active',
      },
    });
    await prisma.equipment.update({ where: { id: eq.id }, data: { status: 'rented', check_out_date: checkOut.toISOString(), check_in_date: null } });
  }

  // Create completed rentals and ensure equipment is currently available
  for (const eq of completedSet) {
    const site = pick(sites);
    const op = pick(operators);
    const checkOut = new Date(now.getTime() - randInt(20, 60) * 24 * 3600 * 1000);
    const daysUsed = randInt(3, 14);
    const checkIn = new Date(checkOut.getTime() + daysUsed * 24 * 3600 * 1000);
    const rate = randInt(150, 400);
    await prisma.rental.create({
      data: {
        equipment_id: eq.id,
        site_id: site.id,
        operator_id: op.id,
        check_out_date: checkOut,
        check_in_date: checkIn,
        expected_return_date: new Date(checkOut.getTime() + (daysUsed - 1) * 24 * 3600 * 1000),
        rental_rate_per_day: rate,
        total_cost: rate * daysUsed,
        status: 'completed',
      },
    });
    await prisma.equipment.update({ where: { id: eq.id }, data: { status: 'available', check_in_date: checkIn.toISOString(), check_out_date: null } });
  }

  // Assign some equipments to maintenance and retired (without active rentals)
  const afterCompletedIndex = ACTIVE + COMPLETED;
  const maintenanceSet = equipment.slice(afterCompletedIndex, afterCompletedIndex + MAINT);
  const retiredSet = equipment.slice(afterCompletedIndex + MAINT, afterCompletedIndex + MAINT + RETIRED);
  for (const eq of maintenanceSet) {
    await prisma.equipment.update({ where: { id: eq.id }, data: { status: 'maintenance' } });
  }
  for (const eq of retiredSet) {
    await prisma.equipment.update({ where: { id: eq.id }, data: { status: 'retired' } });
  }

  // Usage logs for recent days for a subset of equipment
  const logsPerEquipment = 5;
  const forLogs = equipment.slice(0, Math.min(100, equipment.length));
  for (const eq of forLogs) {
    for (let d = 0; d < logsPerEquipment; d++) {
      const day = new Date(now.getTime() - d * 24 * 3600 * 1000);
      // Try to find a rental for this equipment on/around this day
      const rental = await prisma.rental.findFirst({ where: { equipment_id: eq.id }, orderBy: { id: 'desc' } });
      const ensuredRentalId = rental
        ? rental.id
        : (
            await prisma.rental.create({
              data: {
                equipment_id: eq.id,
                site_id: pick(sites).id,
                operator_id: pick(operators).id,
                check_out_date: new Date(day.getTime() - 2 * 24 * 3600 * 1000),
                check_in_date: new Date(day.getTime() - 1 * 24 * 3600 * 1000),
                expected_return_date: new Date(day.getTime() - 1 * 24 * 3600 * 1000),
                rental_rate_per_day: randInt(120, 300),
                total_cost: randInt(300, 1200),
                status: 'completed',
              },
            })
          ).id;

      await prisma.usageLog.create({
        data: {
          rental_id: ensuredRentalId,
          equipment_id: eq.id,
          operator_id: pick(operators).id,
          date: day,
          engine_hours: Number((Math.random() * 8).toFixed(1)),
          idle_hours: Number((Math.random() * 4).toFixed(1)),
          fuel_usage: Number((Math.random() * 20).toFixed(1)),
          condition_rating: randInt(6, 10),
          maintenance_required: Math.random() < 0.2,
          maintenance_notes: 'Auto-generated maintenance note',
          location_lat: Number((Math.random() * 180 - 90).toFixed(5)),
          location_lng: Number((Math.random() * 360 - 180).toFixed(5)),
        },
      });
    }
  }

  // Alerts / anomalies for overdue or high engine-hours
  const createAlert = async (data: {
    rental_id?: number | null;
    equipment_id?: number | null;
    alert_type: string;
    severity?: string;
    title: string;
    description?: string;
    is_resolved?: boolean;
  }) => {
    await prisma.alert.create({
      data: {
        rental_id: data.rental_id ?? null,
        equipment_id: data.equipment_id ?? null,
        alert_type: data.alert_type,
        severity: data.severity ?? 'medium',
        title: data.title,
        description: data.description ?? '',
        is_resolved: data.is_resolved ?? false,
        resolved_at: null,
        resolved_by: null,
      },
    });
  };

  // Overdue rentals
  const overdueRentals = await prisma.rental.findMany({
    where: { status: 'active', expected_return_date: { lt: now } },
  });
  for (const r of overdueRentals) {
    await createAlert({
      rental_id: r.id,
      equipment_id: r.equipment_id,
      alert_type: 'overdue',
      severity: pick(['low', 'medium', 'high']),
      title: 'Overdue rental',
      description: 'Equipment has not been returned by expected date.',
      is_resolved: false,
    });
  }

  // High usage anomalies
  const highUsage = await prisma.usageLog.findMany({ where: { engine_hours: { gt: 7.5 } }, take: 40 });
  for (const u of highUsage) {
    await createAlert({
      rental_id: u.rental_id,
      equipment_id: u.equipment_id,
      alert_type: 'high_usage',
      severity: pick(['medium', 'high']),
      title: 'High engine hours',
      description: `Engine hours ${u.engine_hours} exceeded threshold on ${new Date(u.date).toISOString().slice(0, 10)}.`,
      is_resolved: Math.random() < 0.3,
    });
  }

  // Optional: a few maintenance records and forecasts to ensure sections have data
  const maintTargets = maintenanceSet.slice(0, Math.min(maintenanceSet.length, 10));
  for (const eq of maintTargets) {
    await prisma.maintenanceRecord.create({
      data: {
        equipment_id: eq.id,
        maintenance_type: pick(['Oil Change', 'Engine Service', 'Hydraulic Check', 'Brake Inspection']),
        description: 'Routine scheduled maintenance',
        cost: Number((Math.random() * 500).toFixed(2)),
        scheduled_date: new Date(now.getTime() + randInt(3, 30) * 24 * 3600 * 1000),
        next_maintenance_date: new Date(now.getTime() + randInt(60, 120) * 24 * 3600 * 1000),
        technician_name: `Tech ${randInt(1, 50)}`,
        vendor: pick(['ACME Service', 'Prime Mechanics', 'RapidFix']),
        status: pick(['scheduled', 'in_progress', 'scheduled']),
      },
    });
  }

  for (const s of sites.slice(0, Math.min(5, sites.length))) {
    for (const t of ['Excavator', 'Crane', 'Bulldozer', 'Dump Truck', 'Loader']) {
      await prisma.demandForecast.create({
        data: {
          site_id: s.id,
          equipment_type: t,
          forecast_date: new Date(now.getTime() + randInt(1, 30) * 24 * 3600 * 1000),
          predicted_demand: randInt(5, 30),
          confidence_score: Number((0.6 + Math.random() * 0.35).toFixed(2)),
          actual_demand: null,
        },
      });
    }
  }

  // Final counts for quick sanity
  const counts = await Promise.all([
    prisma.equipment.count({ where: { status: 'available' } }),
    prisma.equipment.count({ where: { status: 'rented' } }),
    prisma.equipment.count({ where: { status: 'maintenance' } }),
    prisma.equipment.count({ where: { status: 'retired' } }),
    prisma.rental.count({ where: { status: 'active' } }),
    prisma.rental.count({ where: { status: 'completed' } }),
    prisma.rental.count({ where: { status: 'active', expected_return_date: { lt: now } } }),
    prisma.rental.count({ where: { status: 'active', expected_return_date: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 3600 * 1000) } } }),
  ]);
  console.log(`Bulk seed complete. Equipment: available=${counts[0]}, rented=${counts[1]}, maintenance=${counts[2]}, retired=${counts[3]}. Rentals: active=${counts[4]}, completed=${counts[5]}, overdue=${counts[6]}, dueSoon=${counts[7]}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
