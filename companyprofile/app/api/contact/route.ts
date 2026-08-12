import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'ptdarrahmanm9@gmail.com'

function sanitize(val: string): string {
  return val.replace(/[&<>"'/]/g, (c) => {
    const m: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;' }
    return m[c] || c
  })
}

function createTransporter() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, subject, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    const transporter = createTransporter()

    if (!transporter) {
      console.error('Contact form: SMTP/Resend not configured — cannot send email')
      return NextResponse.json(
        { error: 'Mail service not configured. Please contact us directly via phone.' },
        { status: 500 }
      )
    }

    const safeName = sanitize(name)
    const safeEmail = sanitize(email)
    const safePhone = sanitize(phone || '')
    const safeSubject = sanitize(subject || '')
    const safeMessage = sanitize(message).replace(/\n/g, '<br/>')

    await transporter.sendMail({
      from: `"PTDARRAHMAN Contact" <${process.env.SMTP_USER || 'noreply@ptdarrahman.sch.id'}>`,
      to: TO_EMAIL,
      replyTo: email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ? email : TO_EMAIL,
      subject: `[PTDARRAHMAN Contact] ${safeSubject || 'No Subject'} — ${safeName}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px">
          <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${safeName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px">${safeEmail}</td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${safePhone}</td></tr>` : ''}
          ${subject ? `<tr><td style="padding:8px;font-weight:bold">Subject</td><td style="padding:8px">${safeSubject}</td></tr>` : ''}
          <tr><td style="padding:8px;font-weight:bold;vertical-align:top">Message</td><td style="padding:8px">${safeMessage}</td></tr>
        </table>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact API error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
