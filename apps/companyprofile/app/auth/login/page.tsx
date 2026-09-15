import type { Metadata } from 'next'
import AuthClient from './AuthClient'

export const metadata: Metadata = {
  title: 'Masuk | PTDARRAHMAN',
  description: 'Masuk untuk mengakses panel admin.',
}

export default function AuthPage() {
  return <AuthClient />
}
