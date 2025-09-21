import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testReturnEquipment() {
  try {
    console.log('Testing equipment return functionality...\n');
    
    // Get current database state
    const equipmentStatus = await prisma.equipment.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    console.log('Current Equipment Status:', equipmentStatus);

    // Find an equipment that is currently rented
    const rentedEquipment = await prisma.equipment.findFirst({
      where: { status: 'rented' },
      include: {
        rentals: {
          where: { status: 'active' },
          orderBy: { check_out_date: 'desc' },
          take: 1
        }
      }
    });

    if (!rentedEquipment) {
      console.log('No rented equipment found to test return');
      return;
    }

    console.log(`\nFound rented equipment: ${rentedEquipment.equipment_id}`);
    console.log(`Status: ${rentedEquipment.status}`);
    console.log(`Active rentals: ${rentedEquipment.rentals.length}`);

    if (rentedEquipment.rentals.length === 0) {
      console.log('⚠️  INCONSISTENCY DETECTED: Equipment marked as rented but no active rental!');
      
      // Fix the inconsistency
      console.log('Fixing inconsistency...');
      await prisma.equipment.update({
        where: { id: rentedEquipment.id },
        data: { 
          status: 'available',
          check_out_date: null,
          check_in_date: new Date().toISOString()
        }
      });
      console.log('✅ Fixed: Equipment status updated to available');
    } else {
      console.log('✅ Equipment has proper active rental record');
    }

    // Test active rentals query
    const activeRentals = await prisma.rental.findMany({
      where: { status: 'active' },
      include: {
        equipment: true,
        site: true,
        operator: true
      }
    });

    console.log(`\nTotal active rentals in database: ${activeRentals.length}`);
    
    // Verify consistency between equipment status and rentals
    const rentedEquipmentCount = await prisma.equipment.count({
      where: { status: 'rented' }
    });
    
    console.log(`Equipment marked as rented: ${rentedEquipmentCount}`);
    console.log(`Active rentals: ${activeRentals.length}`);
    
    if (rentedEquipmentCount === activeRentals.length) {
      console.log('✅ Database is consistent!');
    } else {
      console.log('⚠️  Database inconsistency detected!');
    }

    // Show active rentals formatted for frontend
    if (activeRentals.length > 0) {
      console.log('\nActive Rentals (formatted for frontend):');
      activeRentals.slice(0, 3).forEach(rental => {
        console.log(`- ${rental.equipment.equipment_id} (${rental.equipment.type}) -> Site ${rental.site_id}`);
      });
    }

  } catch (error) {
    console.error('Error testing equipment return:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReturnEquipment();