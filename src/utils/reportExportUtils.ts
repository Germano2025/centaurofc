import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  periodLabel?: string;
  filtersApplied?: Array<{ label: string; value: string }>;
  summaryMetrics?: Array<{ label: string; value: string }>;
  columns: string[];
  rows: (string | number)[][];
  filename?: string;
  orientation?: 'portrait' | 'landscape';
}

export function exportReportToPDF({
  title,
  subtitle = 'Centro de Formação Centauro • Gestão Integrada',
  periodLabel,
  filtersApplied = [],
  summaryMetrics = [],
  columns,
  rows,
  filename = 'relatorio-gerencial',
  orientation = 'portrait',
}: PDFExportOptions) {
  const doc = new jsPDF(orientation === 'landscape' ? 'l' : 'p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Background Bar (Centauro Navy #0A1D37)
  doc.setFillColor(10, 29, 55);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Header Title
  doc.setTextColor(245, 186, 47); // Centauro Gold #F5BA2F
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CENTAURO • CENTRO DE FORMAÇÃO', 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(241, 245, 249);
  doc.text(subtitle, 14, 16);

  const emissionDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.text(`Emissão: ${emissionDate}`, pageWidth - 14, 16, { align: 'right' });

  let currentY = 32;

  // Report Main Title
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, currentY);
  currentY += 5;

  if (periodLabel) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Período de Referência: ${periodLabel}`, 14, currentY);
    currentY += 5;
  }

  // Filters Info Box
  if (filtersApplied.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    const filterText = `Filtros: ${filtersApplied.map((f) => `${f.label}: ${f.value}`).join(' | ')}`;
    doc.text(filterText, 14, currentY);
    currentY += 6;
  }

  // Summary Metrics Cards in PDF
  if (summaryMetrics.length > 0) {
    const cardWidth = Math.min(45, (pageWidth - 28) / summaryMetrics.length);
    const cardHeight = 14;
    summaryMetrics.slice(0, 5).forEach((metric, idx) => {
      const cardX = 14 + idx * (cardWidth + 3);
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'D');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(metric.label.toUpperCase().slice(0, 22), cardX + 3, currentY + 4.5);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(metric.value).slice(0, 16), cardX + 3, currentY + 10.5);
    });
    currentY += cardHeight + 6;
  }

  // Main Table
  autoTable(doc, {
    startY: currentY,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 15 },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Página ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
      doc.text('Centauro Gestão • Centro de Formação', 14, doc.internal.pageSize.getHeight() - 6);
    },
  });

  const finalName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalName);
}

export function exportReportToCSV(
  filename: string,
  columns: string[],
  rows: (string | number)[][]
) {
  // UTF-8 BOM for Microsoft Excel in Portuguese/Brazil
  const bom = '\uFEFF';
  const csvRows: string[] = [];

  // Header Row
  csvRows.push(columns.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'));

  // Body Rows
  rows.forEach((row) => {
    csvRows.push(
      row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')
    );
  });

  const content = bom + csvRows.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const finalFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
