import emailjs from '@emailjs/browser'

// EmailJS configuration - hardcoded values
const EMAILJS_SERVICE_ID = 'service_8r31cg9'
const EMAILJS_TEMPLATE_ID = 'template_1dewyhp'
const EMAILJS_PUBLIC_KEY = '0gG4c26YC2ETAyn7Z'

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY)

export interface EquipmentAlert {
  equipment_id: string
  type: string
  site_id: string
  due_date: string
  days_remaining: number
  utilization: number
  priority: 'CRITICAL' | 'URGENT' | 'HIGH PRIORITY' | 'SCHEDULED'
}

export interface BulkAlertData {
  total_items: number
  urgent_count: number
  this_week_count: number
  next_month_count: number
  overdue_count: number
  alert_type: 'due_soon' | 'overdue' | 'reminders'
}

export class EmailService {


  // Send individual equipment alert with proper template formatting
  static async sendEquipmentAlert(alert: EquipmentAlert, recipientEmail: string = 'andyop210904@gmail.com'): Promise<boolean> {
    try {
      console.log('📧 Sending equipment alert for:', alert.equipment_id)
      
      const templateParams = {
        equipment_id: alert.equipment_id,
        equipment_type: alert.type,
        site_id: alert.site_id,
        priority: alert.priority,
        due_date: alert.due_date,
        days_remaining: alert.days_remaining.toString(),
        message: this.generateEquipmentMessage(alert)
      }

      console.log('Sending equipment alert with params:', templateParams)

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      )

      console.log('✅ Equipment alert email sent successfully:', response)
      return true
    } catch (error: any) {
      console.error('❌ Error sending equipment alert email:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID
      })
      return false
    }
  }

  // Send bulk due soon alerts
  static async sendDueSoonAlerts(alerts: EquipmentAlert[], recipientEmails: string[] = ['andyop210904@gmail.com']): Promise<boolean> {
    try {
      console.log('📧 Sending due soon alerts for', alerts.length, 'equipment items')
      
      const urgentItems = alerts.filter(item => item.days_remaining <= 7)
      const thisWeekItems = alerts.filter(item => item.days_remaining > 7 && item.days_remaining <= 14)
      const nextMonthItems = alerts.filter(item => item.days_remaining > 14)

      const templateParams = {
        equipment_id: 'BULK_DUE_SOON',
        equipment_type: 'Multiple Equipment Items',
        site_id: 'Multiple Sites',
        priority: 'DUE SOON ALERT',
        due_date: 'Various Dates',
        days_remaining: 'Variable',
        message: this.generateDueSoonMessage(alerts, urgentItems, thisWeekItems, nextMonthItems),
        total_items: alerts.length.toString(),
        urgent_count: urgentItems.length.toString(),
        this_week_count: thisWeekItems.length.toString(),
        next_month_count: nextMonthItems.length.toString()
      }

      console.log('Sending due soon alerts with params:', templateParams)

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      )

      console.log('✅ Due soon alerts email sent successfully:', response)
      return true
    } catch (error: any) {
      console.error('Error sending due soon alerts email:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: 'bulk_alert'
      })
      return false
    }
  }

  // Send overdue alerts
  static async sendOverdueAlerts(overdueCount: number, recipientEmails: string[]): Promise<boolean> {
    try {
      // Always include andyop210904@gmail.com in the recipient list
      const allRecipients = [...recipientEmails, 'andyop210904@gmail.com']
      const uniqueRecipients = Array.from(new Set(allRecipients)) // Remove duplicates
      
      const templateParams = {
        from_name: 'Equipment Management System',
        from_email: 'noreply@equipment.com',
        to_email: 'andyop210904@gmail.com', // Explicit recipient
        subject: `URGENT: ${overdueCount} Overdue Equipment Items`,
        message: this.generateOverdueMessage(overdueCount),
        // Additional template variables
        overdue_count: overdueCount.toString()
      }

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      )

      console.log('Overdue alerts email sent to:', uniqueRecipients, response)
      return true
    } catch (error: any) {
      console.error('Error sending overdue alerts email:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: 'overdue_alert'
      })
      return false
    }
  }

  // Send all reminders
  static async sendAllReminders(
    activeCount: number, 
    dueSoonCount: number, 
    overdueCount: number, 
    recipientEmails: string[]
  ): Promise<boolean> {
    try {
      // Always include andyop210904@gmail.com in the recipient list
      const allRecipients = [...recipientEmails, 'andyop210904@gmail.com']
      const uniqueRecipients = Array.from(new Set(allRecipients)) // Remove duplicates
      
      const templateParams = {
        from_name: 'Equipment Management System',
        from_email: 'noreply@equipment.com',
        to_email: 'andyop210904@gmail.com', // Explicit recipient
        subject: `Equipment Reminders - ${activeCount + dueSoonCount + overdueCount} Items`,
        message: this.generateRemindersMessage(activeCount, dueSoonCount, overdueCount),
        // Additional template variables
        active_count: activeCount.toString(),
        due_soon_count: dueSoonCount.toString(),
        overdue_count: overdueCount.toString(),
        total_count: (activeCount + dueSoonCount + overdueCount).toString()
      }

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      )

      console.log('All reminders email sent to:', uniqueRecipients, response)
      return true
    } catch (error: any) {
      console.error('Error sending all reminders email:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: 'all_reminders'
      })
      return false
    }
  }

  // Generate equipment-specific message
  private static generateEquipmentMessage(alert: EquipmentAlert): string {
    return `Equipment ${alert.equipment_id} (${alert.type}) is due for return on ${alert.due_date} (${alert.days_remaining} days remaining). Priority: ${alert.priority}. Site: ${alert.site_id}. Utilization: ${alert.utilization}%.`
  }

  // Generate due soon message
  private static generateDueSoonMessage(
    alerts: EquipmentAlert[], 
    urgent: EquipmentAlert[], 
    thisWeek: EquipmentAlert[], 
    nextMonth: EquipmentAlert[]
  ): string {
    return `Due soon alerts for ${alerts.length} equipment items. ${urgent.length} urgent (≤7 days), ${thisWeek.length} this week (8-14 days), ${nextMonth.length} next month (15-30 days). Please review and schedule returns accordingly.`
  }

  // Generate overdue message
  private static generateOverdueMessage(overdueCount: number): string {
    return `Overdue alerts for ${overdueCount} equipment items. Immediate action required to schedule returns and assess any penalties.`
  }

  // Generate reminders message
  private static generateRemindersMessage(active: number, dueSoon: number, overdue: number): string {
    return `Reminder summary: ${active} active rentals, ${dueSoon} due soon, ${overdue} overdue. All stakeholders have been notified of their responsibilities.`
  }

  // Get default recipient emails (you can customize this)
  static getDefaultRecipients(): string[] {
    return [
      'andyop210904@gmail.com',
      'site.manager@company.com',
      'equipment.coordinator@company.com',
      'rental.department@company.com',
      'project.manager@company.com'
    ]
  }

  // Get site-specific recipient emails
  static getSiteRecipients(siteId: string): string[] {
    const siteEmails: { [key: string]: string[] } = {
      'S010': ['andyop210904@gmail.com', 'site.s010@company.com', 'manager.s010@company.com'],
      'S027': ['andyop210904@gmail.com', 'site.s027@company.com', 'manager.s027@company.com'],
      'S063': ['andyop210904@gmail.com', 'site.s063@company.com', 'manager.s063@company.com'],
      'S119': ['andyop210904@gmail.com', 'site.s119@company.com', 'manager.s119@company.com'],
      'S123': ['andyop210904@gmail.com', 'site.s123@company.com', 'manager.s123@company.com'],
      'S126': ['andyop210904@gmail.com', 'site.s126@company.com', 'manager.s126@company.com'],
      'S151': ['andyop210904@gmail.com', 'site.s151@company.com', 'manager.s151@company.com'],
      'S152': ['andyop210904@gmail.com', 'site.s152@company.com', 'manager.s152@company.com'],
      'S168': ['andyop210904@gmail.com', 'site.s168@company.com', 'manager.s168@company.com']
    }
    
    return siteEmails[siteId] || ['andyop210904@gmail.com', 'general.site@company.com']
  }
}
