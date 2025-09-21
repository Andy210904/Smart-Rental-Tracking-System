// Simple test script to check the API endpoints
const testAPI = async () => {
  const baseURL = 'http://localhost:4000';
  
  try {
    console.log('Testing /rentals/due-soon endpoint...');
    const dueSoonResponse = await fetch(`${baseURL}/rentals/due-soon?days_ahead=7`);
    const dueSoonData = await dueSoonResponse.json();
    console.log('Due soon rentals response:', JSON.stringify(dueSoonData, null, 2));
    
    console.log('\nTesting /rentals/overdue endpoint...');
    const overdueResponse = await fetch(`${baseURL}/rentals/overdue`);
    const overdueData = await overdueResponse.json();
    console.log('Overdue rentals response:', JSON.stringify(overdueData, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
};

testAPI();