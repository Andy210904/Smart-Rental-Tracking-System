import { EmailService, EquipmentAlert } from '../app/lib/emailService'

// Simple test function to verify email service
export async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration...')
  
  try {
    // Create a test alert
    const testAlert: EquipmentAlert = {
      equipment_id: 'TEST001',
      type: 'Test Equipment',
      site_id: 'TEST_SITE',
      due_date: new Date().toLocaleDateString(),
      days_remaining: 5,
      utilization: 85,
      priority: 'HIGH PRIORITY'
    }

    console.log('📧 Sending test email alert...')
    
    // Test individual equipment alert
    const result = await EmailService.sendEquipmentAlert(testAlert, 'andyop210904@gmail.com')
    
    if (result) {
      console.log('✅ Email test successful!')
      console.log('Email sent to: andyop210904@gmail.com')
      console.log('Check your email inbox for the test alert.')
      return true
    } else {
      console.log('❌ Email test failed!')
      console.log('Check browser console for error details.')
      return false
    }
  } catch (error) {
    console.error('❌ Test execution error:', error)
    return false
  }
}

// Test overdue alerts
export async function testOverdueAlerts() {
  console.log('🚨 Testing Overdue Alerts...')
  
  try {
    const result = await EmailService.sendOverdueAlerts(11, ['andyop210904@gmail.com'])
    
    if (result) {
      console.log('✅ Overdue alert test successful!')
      console.log('Email sent to: andyop210904@gmail.com')
      return true
    } else {
      console.log('❌ Overdue alert test failed!')
      return false
    }
  } catch (error) {
    console.error('❌ Overdue alert test error:', error)
    return false
  }
}

// Test due soon reminders
export async function testDueSoonReminders() {
  console.log('⏰ Testing Due Soon Reminders...')
  
  try {
    const result = await EmailService.sendAllReminders(30, 17, 11, ['andyop210904@gmail.com'])
    
    if (result) {
      console.log('✅ Due soon reminders test successful!')
      console.log('Email sent to: andyop210904@gmail.com')
      return true
    } else {
      console.log('❌ Due soon reminders test failed!')
      return false
    }
  } catch (error) {
    console.error('❌ Due soon reminders test error:', error)
    return false
  }
}

// Run all tests
export async function runAllEmailTests() {
  console.log('🔬 Running Complete Email Service Tests...')
  
  const results = {
    equipmentAlert: await testEmailService(),
    overdueAlerts: await testOverdueAlerts(),
    dueSoonReminders: await testDueSoonReminders()
  }
  
  console.log('📊 Test Results Summary:')
  console.log('- Equipment Alert:', results.equipmentAlert ? '✅ PASS' : '❌ FAIL')
  console.log('- Overdue Alerts:', results.overdueAlerts ? '✅ PASS' : '❌ FAIL')
  console.log('- Due Soon Reminders:', results.dueSoonReminders ? '✅ PASS' : '❌ FAIL')
  
  const allPassed = Object.values(results).every(result => result === true)
  console.log('🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
  
  return results
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testEmailService = testEmailService
  (window as any).testOverdueAlerts = testOverdueAlerts
  (window as any).testDueSoonReminders = testDueSoonReminders
  (window as any).runAllEmailTests = runAllEmailTests
}