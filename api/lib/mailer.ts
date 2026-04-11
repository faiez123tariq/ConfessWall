import nodemailer from 'nodemailer'

/**
 * Gmail SMTP via Nodemailer (design.md §11). Uses an App Password, not the account password.
 */
export function createMailTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER?.trim()
  const pass = process.env.GMAIL_APP_PASSWORD?.trim()
  if (!user || !pass) {
    return null
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export function getGmailFromAddress(): string | null {
  const user = process.env.GMAIL_USER?.trim()
  return user || null
}
