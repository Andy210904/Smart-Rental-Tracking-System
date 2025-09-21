import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testOverdueRentals() {
  try {
    console.log('Testing overdue rentals logic...\n');
    
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}\n`);
    
    // Get all active rentals
    const activeRentals = await prisma.rental.findMany({
      where: { status: 'active' },
      include: { equipment: true },
      orderBy: { expected_return_date: 'asc' }
    });
    
    console.log(`Total active rentals: ${activeRentals.length}`);
    
    if (activeRentals.length > 0) {
      console.log('\nActive rentals with expected return dates:');
      activeRentals.forEach((rental, index) => {
        const expected = rental.expected_return_date;
        const isOverdue = expected && expected < now;
        console.log(`${index + 1}. ${rental.equipment.equipment_id} - Expected: ${expected?.toISOString() || 'No date'} - ${isOverdue ? '⚠️ OVERDUE' : '✅ On time'}`);
      });
    }
    
    // Test the exact query used by the overdue endpoint
    const overdueRentals = await prisma.rental.findMany({
      where: { 
        status: 'active', 
        expected_return_date: { lt: now } 
      },
      include: { equipment: true },
      orderBy: { expected_return_date: 'asc' }
    });
    
    console.log(`\nOverdue rentals query result: ${overdueRentals.length}`);
    
    if (overdueRentals.length > 0) {
      console.log('Overdue rentals:');
      overdueRentals.forEach((rental, index) => {
        const daysPastDue = Math.ceil((now.getTime() - rental.expected_return_date.getTime()) / (24 * 60 * 60 * 1000));
        console.log(`${index + 1}. ${rental.equipment.equipment_id} - ${daysPastDue} days overdue`);
      });
    } else {
      console.log('No overdue rentals found!');
      
      // Check if there are rentals with null expected_return_date
      const rentalsWithoutDates = await prisma.rental.count({
        where: { 
          status: 'active',
          expected_return_date: null
        }
      });
      console.log(`Active rentals without expected return date: ${rentalsWithoutDates}`);
    }
    
    // Test the dashboard count query
    const dashboardOverdueCount = await prisma.rental.count({
      where: { status: 'active', expected_return_date: { lt: now } }
    });
    
    console.log(`\nDashboard overdue count: ${dashboardOverdueCount}`);
    
    if (dashboardOverdueCount !== overdueRentals.length) {
      console.log('❌ Inconsistency detected between count and findMany!');
    } else {
      console.log('✅ Dashboard count matches overdue rentals query');
    }

  } catch (error) {
    console.error('Error testing overdue rentals:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOverdueRentals();