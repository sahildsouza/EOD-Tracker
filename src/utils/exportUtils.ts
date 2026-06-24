import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}
