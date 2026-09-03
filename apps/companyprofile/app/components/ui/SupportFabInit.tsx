import { getContactInfo, getSettings } from '@/app/lib/api'
import SupportFab from './SupportFab'

export default async function SupportFabInit() {
  let phone: string | undefined
  let whatsapp: string | undefined
  let email: string | undefined
  let whatsappMessage: string | undefined
  try {
    const contact = await getContactInfo()
    if (contact?.phone_primary) phone = String(contact.phone_primary)
    if (contact?.whatsapp) whatsapp = String(contact.whatsapp)
    if (contact?.email_primary) email = String(contact.email_primary)
  } catch {}
  try {
    const settings = await getSettings()
    const msg = settings.find((s) => s.key === 'whatsapp_message')?.value
    if (msg) whatsappMessage = msg
  } catch {}
  return <SupportFab phone={phone} whatsapp={whatsapp} email={email} whatsappMessage={whatsappMessage} />
}
