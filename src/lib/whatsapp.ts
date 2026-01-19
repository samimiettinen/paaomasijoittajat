export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

export function getWhatsAppLink(phone: string, message?: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${formattedPhone}${encodedMessage}`;
}

export interface BulkWhatsAppMember {
  first_name: string;
  last_name: string;
  mobile_phone: string;
}

export function generateBulkWhatsAppLinks(
  members: BulkWhatsAppMember[],
  messageTemplate: string
): { member: BulkWhatsAppMember; link: string }[] {
  return members.map(member => {
    // Replace placeholders in message template
    const personalizedMessage = messageTemplate
      .replace(/\{first_name\}/g, member.first_name)
      .replace(/\{last_name\}/g, member.last_name)
      .replace(/\{full_name\}/g, `${member.first_name} ${member.last_name}`);
    
    return {
      member,
      link: getWhatsAppLink(member.mobile_phone, personalizedMessage),
    };
  });
}
