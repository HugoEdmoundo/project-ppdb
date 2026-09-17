const PASSWORD_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateSecurePassword(length = 8): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  let pass = ''
  for (let i = 0; i < length; i++) {
    pass += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length]
  }
  return pass
}
