import querystring from 'querystring'

// WhatsApp configuration (Bulk API)
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://example.com/whatsapp/api'
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'your-api-key-here'
const WHATSAPP_FROM = process.env.WHATSAPP_FROM || '1234567890'
const WHATSAPP_TEMPLATE_ID = process.env.WHATSAPP_TEMPLATE_ID || 'template_id_here'

// Admin notification numbers, comma separated
const ADMIN_ALERT_NUMBERS = (process.env.ADMIN_ALERT_NUMBERS || '').split(',').map(s => s.trim()).filter(Boolean)

export function normalizePhone(to: string | null | undefined): string | null {
  if (!to) return null
  // Keep only digits - use number as-is without adding country code
  let digits = to.replace(/\D+/g, '')
  
  // Add 91 prefix if it's a 10-digit Indian number for WhatsApp
  if (digits.length === 10) {
    digits = '91' + digits
  }
  
  if (digits.length < 8) return null
  return digits
}

export async function sendWhatsAppBulk(messages: Array<{ to: string; name: string }>) {
  if (messages.length === 0) {

    return []
  }

  const payload = messages.map(msg => {
    const normalized = normalizePhone(msg.to)
    if (!normalized) return null
    
    return {
      from: WHATSAPP_FROM,
      to: normalized,
      type: "template",
      message: {
        templateid: WHATSAPP_TEMPLATE_ID,
        placeholders: [msg.name || 'User']
      }
    }
  }).filter(Boolean)

  if (payload.length === 0) {
    console.warn('sendWhatsAppBulk: no valid phone numbers')
    return []
  }

  // API requires at least 2 messages, so duplicate first message if only 1
  if (payload.length === 1 && payload[0]) {

    payload.push(payload[0])
  }

  console.log('💬 Sending bulk WhatsApp to', messages.length, 'recipients')
  console.log('📦 Payload:', JSON.stringify(payload, null, 2))
  
  try {
    const res = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_KEY
      },
      body: JSON.stringify(payload)
    })
    
    const responseText = await res.text().catch(() => '')
    console.log('📡 WhatsApp API Response:', res.status, responseText)
    
    let responseJson: any = {}
    try {
      responseJson = JSON.parse(responseText)
    } catch (e) {
      // ignore parse errors
    }
    
    if (responseJson.status === 'failed') {
      console.warn('❌ sendWhatsAppBulk failed:', responseJson.message)
      return messages.map(() => ({ ok: false, message: responseJson.message, body: responseText }))
    }
    
    if (!res.ok) {
      console.warn('❌ sendWhatsAppBulk HTTP error', res.status, responseText)
      return messages.map(() => ({ ok: false, status: res.status, body: responseText }))
    }
    

    return messages.map(() => ({ ok: true, body: responseText }))
  } catch (err) {
    console.warn('❌ sendWhatsAppBulk exception', err)
    return messages.map(() => ({ ok: false, error: String(err) }))
  }
}

// Email sending - disabled
export async function sendEmail(to: string, subject: string, html: string) {
  console.warn('sendEmail: Email notifications disabled')
  return { ok: false, skipped: true }
}

export async function notifyAdminsNewSubmission(payload: { title: string; name?: string | null; phone?: string | null; email?: string | null }) {
  console.log('📢 notifyAdminsNewSubmission called')
  console.log('Admin numbers from env:', ADMIN_ALERT_NUMBERS)
  
  // Prepare messages for all admins
  const messages = ADMIN_ALERT_NUMBERS.map(n => ({
    to: n,
    name: 'Admin'
  }))
  
  // Send bulk WhatsApp
  const results = await sendWhatsAppBulk(messages)
  
  console.log('Admin WhatsApp notifications sent:', results.filter((r: any) => r.ok).length, 'success,', results.filter((r: any) => !r.ok).length, 'failed')
  console.log('Results:', results)
}

export async function notifyUserSubmissionReceived(payload: { toPhone?: string | null; title: string; name?: string | null }) {
  console.log('📢 notifyUserSubmissionReceived called for phone:', payload.toPhone)
  
  if (!payload.toPhone) {

    return
  }
  
  // Combine user + admin to satisfy "greater than 1" requirement
  const messages = [
    { to: payload.toPhone, name: payload.name || 'User' },
    ...(ADMIN_ALERT_NUMBERS.length > 0 ? [{ to: ADMIN_ALERT_NUMBERS[0], name: 'Admin' }] : [])
  ]
  
  const results = await sendWhatsAppBulk(messages)
  if (results[0]?.ok) {

  } else {
    console.error('Failed to send user acknowledgement:', results[0])
  }
}

export async function notifyUserSubmissionStatus(payload: { toPhone?: string | null; toEmail?: string | null; title: string; status: string; reason?: string | null }) {
  if (!payload.toPhone) {

    return
  }
  
  // Combine user + admin to satisfy "greater than 1" requirement
  const messages = [
    { to: payload.toPhone, name: 'User' },
    ...(ADMIN_ALERT_NUMBERS.length > 0 ? [{ to: ADMIN_ALERT_NUMBERS[0], name: 'Admin' }] : [])
  ]
  
  const results = await sendWhatsAppBulk(messages)
  if (results[0]?.ok) {

  } else {
    console.error('Failed to send status notification:', results[0])
  }
}
