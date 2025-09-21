import emailjs from '@emailjs/browser'

// Test EmailJS configuration
export class EmailTest {
  static async testEmailConfiguration(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // Hardcoded EmailJS configuration
      const serviceId = 'service_b55jyth'
      const templateId = 'template_6fnnn1s'
      const publicKey = 'rNUrJGG1_cyzTokDj'

      console.log('EmailJS Configuration (Hardcoded):')
      console.log('Service ID:', `✅ Set: ${serviceId}`)
      console.log('Template ID:', `✅ Set: ${templateId}`)
      console.log('Public Key:', `✅ Set: ${publicKey.substring(0, 10)}...`)

      // Initialize EmailJS
      emailjs.init(publicKey)

      // Test with contact form template format
      const testParams = {
        from_name: 'Equipment Management System',
        from_email: 'noreply@equipment.com',
        subject: 'Test Equipment Alert - TEST001',
        message: 'This is a test email to verify EmailJS configuration. Equipment TEST001 (Test Equipment) is due for return. Priority: TEST. Site: TEST_SITE.'
      }

      console.log('Sending test email with params:', testParams)

      const response = await emailjs.send(
        serviceId,
        templateId, // Using the contact form template
        testParams
      )

      console.log('Test email response:', response)

      return {
        success: true,
        details: {
          status: response.status,
          text: response.text,
          serviceId,
          templateId
        }
      }

    } catch (error: any) {
      console.error('EmailJS test failed:', error)
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        details: {
          errorType: error.constructor.name,
          errorCode: error.code,
          errorStatus: error.status,
          fullError: error
        }
      }
    }
  }

  static async testAllTemplates(): Promise<{ [key: string]: { success: boolean; error?: string } }> {
    const templates = ['equipment_alert', 'bulk_alert', 'overdue_alert', 'all_reminders']
    const results: { [key: string]: { success: boolean; error?: string } } = {}

    for (const template of templates) {
      try {
        const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
        const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY

        if (!serviceId || !publicKey) {
          results[template] = { success: false, error: 'Environment variables not set' }
          continue
        }

        emailjs.init(publicKey)

        const testParams = {
          to_email: 'andyop210904@gmail.com',
          equipment_id: 'TEST001',
          equipment_type: 'Test Equipment',
          site_id: 'TEST_SITE',
          due_date: new Date().toLocaleDateString(),
          days_remaining: 5,
          utilization: 85,
          priority: 'TEST',
          alert_type: 'Test Alert',
          message: `Test message for ${template} template.`,
          timestamp: new Date().toLocaleString(),
          // Additional params for different templates
          total_equipment: 1,
          urgent_count: 1,
          this_week_count: 0,
          next_month_count: 0,
          overdue_count: 0,
          active_rentals: 1,
          due_soon: 1,
          overdue: 0,
          total_notifications: 1,
          urgent_equipment: 'TEST001 (Test Equipment) - 5 days - Site: TEST_SITE'
        }

        const response = await emailjs.send(serviceId, template, testParams)
        results[template] = { success: true }

      } catch (error: any) {
        results[template] = { 
          success: false, 
          error: error.message || 'Template test failed' 
        }
      }
    }

    return results
  }

  static getConfigurationStatus(): { configured: boolean; missing: string[] } {
    const missing: string[] = []
    
    if (!process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID) missing.push('NEXT_PUBLIC_EMAILJS_SERVICE_ID')
    if (!process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID) missing.push('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID')
    if (!process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) missing.push('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY')

    return {
      configured: missing.length === 0,
      missing
    }
  }
}
