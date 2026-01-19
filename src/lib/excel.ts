import * as XLSX from 'xlsx';
import type { Member } from './types';

export function exportMembersToExcel(members: Member[]): void {
  const data = members.map(member => ({
    'Nimi': `${member.first_name} ${member.last_name}`,
    'Puhelin': member.mobile_phone,
    'Sähköposti': member.email || '',
    'Organisaatio': member.organization || '',
    'Rooli': member.organization_role || '',
    'LinkedIn': member.linkedin_url || '',
    'GitHub': member.github_url || '',
    'Tila': member.membership_status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jäsenet');
  
  // Auto-size columns
  const maxWidth = 30;
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.min(maxWidth, Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row] || '').length)))
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, 'jasenet.xlsx');
}

export function parseExcel(file: File): Promise<{ first_name: string; last_name: string; mobile_phone: string }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);
        
        const members = jsonData.map(row => {
          // Try to find name column (various formats)
          const nameValue = row['Nimi'] || row['Name'] || row['nimi'] || row['name'] || '';
          const nameParts = nameValue.split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Try to find phone column
          const phone = row['Puhelin'] || row['Phone'] || row['puhelin'] || row['phone'] || 
                       row['Puhelinnumero'] || row['Mobile'] || '';
          
          return {
            first_name: firstName,
            last_name: lastName,
            mobile_phone: String(phone),
          };
        }).filter(m => m.first_name && m.mobile_phone);
        
        resolve(members);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Tiedoston lukeminen epäonnistui'));
    reader.readAsArrayBuffer(file);
  });
}
