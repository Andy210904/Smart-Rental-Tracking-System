import { SimpleEmailTest } from './app/lib/simpleEmailTest'

async function testEmail() {
  console.log('🧪 Testing EmailJS Configuration...')
  
  try {
    const result = await SimpleEmailTest.testWithContactFormTemplate()
    
    if (result.success) {
      console.log('✅ Email test successful!')
      console.log('The email service is working correctly.')
    } else {
      console.log('❌ Email test failed!')
      console.log('Error:', result.error)
    }
  } catch (error) {
    console.error('Test execution error:', error)
  }
}

testEmail()