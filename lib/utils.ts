// TODO: install clsx and tailwind-merge
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString()
}

export function formatPhone(phone: string) {
  return phone
}
