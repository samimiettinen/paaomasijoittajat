import type { Member } from './types';

export function parseCSV(content: string): { first_name: string; last_name: string; mobile_phone: string }[] {
  const lines = content.trim().split('\n');
  const members: { first_name: string; last_name: string; mobile_phone: string }[] = [];
  
  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('phone') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma or semicolon
    const parts = line.split(/[,;]/).map(p => p.trim().replace(/"/g, ''));
    
    if (parts.length >= 2) {
      const nameParts = parts[0].split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const phone = parts[1] || '';
      
      if (firstName && phone) {
        members.push({
          first_name: firstName,
          last_name: lastName,
          mobile_phone: phone,
        });
      }
    }
  }
  
  return members;
}

export function exportMembersToCSV(members: Member[]): string {
  const headers = ['Nimi', 'Puhelin', 'Sähköposti', 'Organisaatio', 'Rooli', 'LinkedIn', 'GitHub', 'Tila'];
  
  const rows = members.map(member => [
    `${member.first_name} ${member.last_name}`,
    member.mobile_phone,
    member.email || '',
    member.organization || '',
    member.organization_role || '',
    member.linkedin_url || '',
    member.github_url || '',
    member.membership_status,
  ]);
  
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
  ].join('\n');
  
  return csvContent;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
