import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Check equipment status distribution
    const equipmentStatus = await prisma.equipment.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    console.log('Equipment Status Distribution:', equipmentStatus);

    // Check rental status distribution
    const rentalStatus = await prisma.rental.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    console.log('Rental Status Distribution:', rentalStatus);

    // Check for equipment marked as rented but no active rental
    const rentedEquipment = await prisma.equipment.findMany({
      where: { status: 'rented' },
      include: {
        rentals: {
          where: { status: 'active' }
        }
      }
    });

    const mismatchedEquipment = rentedEquipment.filter(eq => eq.rentals.length === 0);
    console.log(`\nEquipment marked as rented but no active rental: ${mismatchedEquipment.length}`);
    
    if (mismatchedEquipment.length > 0) {
      console.log('Mismatched equipment IDs:', mismatchedEquipment.map(eq => eq.equipment_id));
    }

    // Check for active rentals with equipment not marked as rented
    const activeRentals = await prisma.rental.findMany({
      where: { status: 'active' },
      include: { equipment: true }
    });

    const mismatchedRentals = activeRentals.filter(rental => rental.equipment.status !== 'rented');
    console.log(`\nActive rentals with equipment not marked as rented: ${mismatchedRentals.length}`);
    
    if (mismatchedRentals.length > 0) {
      console.log('Mismatched rental equipment IDs:', mismatchedRentals.map(r => r.equipment.equipment_id));
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();