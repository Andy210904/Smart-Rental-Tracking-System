'use client'

import { EmailService } from '../lib/emailService'

export default function EmailTestPage() {


  const handleEquipmentAlert = async () => {
    console.log('Testing equipment alert...')
    
    const testAlert = {
      equipment_id: 'TEST001',
      type: 'Test Equipment',
      site_id: 'TEST_SITE',
      due_date: new Date().toLocaleDateString(),
      days_remaining: 5,
      utilization: 85,
      priority: 'HIGH PRIORITY' as const
    }

    try {
      const result = await EmailService.sendEquipmentAlert(testAlert, 'andyop210904@gmail.com')
      
      if (result) {
        alert('✅ Equipment alert sent successfully! Check andyop210904@gmail.com')
      } else {
        alert('❌ Equipment alert failed. Check browser console for details.')
      }
    } catch (error) {
      console.error('Equipment alert error:', error)
      alert('❌ Equipment alert error. Check browser console for details.')
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Email Service Test</h1>
      <p>Test the EmailJS configuration to verify emails are being sent to andyop210904@gmail.com</p>
      
      <div style={{ marginBottom: '10px' }}>
        <p style={{ color: '#28a745', fontWeight: 'bold' }}>
          ✅ EmailJS Configuration Working! 
        </p>
        <p>Use the main dashboard to test real equipment alerts.</p>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={handleEquipmentAlert}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📧 Test Equipment Alert
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h3>Troubleshooting Steps:</h3>
        <ol>
          <li>Check browser console (F12) for error messages</li>
          <li>Check spam/junk folder in andyop210904@gmail.com</li>
          <li>Verify EmailJS service is active and template exists</li>
          <li>Check EmailJS dashboard for sent email logs</li>
        </ol>
        
        <h3>Current Configuration:</h3>
        <ul>
          <li>Service ID: service_8r31cg9</li>
          <li>Template ID: template_1dewyhp</li>
          <li>Recipient: andyop210904@gmail.com</li>
        </ul>
      </div>
    </div>
  )
}