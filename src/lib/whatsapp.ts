export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

export function getWhatsAppLink(phone: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${formattedPhone}`;
}
