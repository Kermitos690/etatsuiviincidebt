import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Incident } from '@/types/incident';

interface KPIs {
  total: number;
  ouverts: number;
  nonResolus: number;
  transmisJP: number;
  scoreMoyen: number;
}

interface ChartData {
  chartByStatus: { name: string; value: number }[];
  chartByGravite: { name: string; value: number; fill: string }[];
  chartByInstitution: { name: string; value: number }[];
  chartEvolution: { name: string; total: number; transmisJP: number; critiques: number }[];
  topIncidents: { name: string; score: number; gravite: string }[];
}

export function useDashboardPDF(kpis: KPIs, chartData: ChartData, incidents: Incident[]) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const exportDashboardPDF = useCallback(async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = 15;

      const colors = {
        primary: [37, 99, 235],
        secondary: [139, 92, 246],
        success: [34, 197, 94],
        warning: [251, 191, 36],
        danger: [239, 68, 68],
        orange: [249, 115, 22],
        cyan: [6, 182, 212],
        pink: [236, 72, 153],
        slate: [100, 116, 139],
        dark: [30, 41, 59]
      };

      const setColor = (color: number[], type: 'fill' | 'text' | 'draw' = 'fill') => {
        if (type === 'fill') doc.setFillColor(color[0], color[1], color[2]);
        else if (type === 'text') doc.setTextColor(color[0], color[1], color[2]);
        else doc.setDrawColor(color[0], color[1], color[2]);
      };

      const addPageIfNeeded = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - 20) {
          doc.addPage();
          y = 20;
          return true;
        }
        return false;
      };

      const drawSectionHeader = (title: string) => {
        addPageIfNeeded(25);
        setColor(colors.primary, 'fill');
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, 'F');
        setColor(colors.secondary, 'fill');
        doc.roundedRect(pageWidth - margin - 60, y, 60, 12, 2, 2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 5, y + 8);
        y += 18;
      };

      // Header
      setColor(colors.dark, 'fill');
      doc.rect(0, 0, pageWidth, 45, 'F');
      setColor(colors.primary, 'fill');
      doc.rect(0, 0, pageWidth * 0.7, 45, 'F');
      setColor(colors.secondary, 'fill');
      doc.rect(pageWidth * 0.7, 0, pageWidth * 0.3, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('TABLEAU DE BORD', margin, 22);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Registre des Incidents - Rapport Analytique', margin, 34);
      
      doc.setFontSize(9);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - 55, 8, 45, 14, 3, 3, 'F');
      setColor(colors.primary, 'text');
      doc.text(format(new Date(), "dd MMM yyyy", { locale: fr }), pageWidth - 52, 17);
      
      y = 55;

      // KPI Cards
      const kpiData = [
        { label: 'Total', value: kpis.total, color: colors.primary },
        { label: 'Ouverts', value: kpis.ouverts, color: colors.warning },
        { label: 'Non résolus', value: kpis.nonResolus, color: colors.orange },
        { label: 'Transmis JP', value: kpis.transmisJP, color: colors.secondary },
        { label: 'Score moyen', value: kpis.scoreMoyen, color: colors.success }
      ];

      const cardWidth = (pageWidth - 2 * margin - 16) / 5;
      kpiData.forEach((kpi, idx) => {
        const x = margin + idx * (cardWidth + 4);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardWidth, 28, 3, 3, 'F');
        setColor(kpi.color, 'fill');
        doc.roundedRect(x, y, cardWidth, 5, 3, 3, 'F');
        doc.rect(x, y + 3, cardWidth, 2, 'F');
        setColor(colors.dark, 'text');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(String(kpi.value), x + cardWidth / 2, y + 17, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.label, x + cardWidth / 2, y + 24, { align: 'center' });
      });
      y += 38;

      drawSectionHeader('RÉPARTITIONS STATISTIQUES');

      // Charts section (simplified)
      const barChartX = margin;
      const barChartWidth = pageWidth - 2 * margin;
      const maxStatusValue = Math.max(...chartData.chartByStatus.map(s => s.value), 1);
      
      let barY = y + 8;
      const statusColors = [colors.primary, colors.success, colors.warning, colors.orange, colors.secondary, colors.pink];
      chartData.chartByStatus.filter(s => s.value > 0).slice(0, 6).forEach((status, idx) => {
        const barWidth = (status.value / maxStatusValue) * (barChartWidth - 60);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(barChartX + 50, barY, barChartWidth - 60, 8, 2, 2, 'F');
        setColor(statusColors[idx % statusColors.length], 'fill');
        doc.roundedRect(barChartX + 50, barY, Math.max(barWidth, 5), 8, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        setColor(colors.dark, 'text');
        doc.text(status.name, barChartX, barY + 6);
        doc.text(String(status.value), barChartX + 50 + barWidth + 5, barY + 6);
        barY += 11;
      });

      y = barY + 10;

      // Evolution table
      addPageIfNeeded(70);
      drawSectionHeader('ÉVOLUTION SUR 6 MOIS');
      
      setColor(colors.dark, 'fill');
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Mois', margin + 8, y + 7);
      doc.text('Total', margin + 50, y + 7);
      doc.text('Transmis JP', margin + 85, y + 7);
      doc.text('Critiques', margin + 130, y + 7);
      y += 12;

      chartData.chartEvolution.forEach((m, idx) => {
        const bgColor = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
        
        setColor(colors.dark, 'text');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(m.name, margin + 8, y + 6);
        doc.text(String(m.total), margin + 54, y + 6);
        doc.text(String(m.transmisJP), margin + 91, y + 6);
        doc.text(String(m.critiques), margin + 134, y + 6);
        y += 9;
      });
      y += 10;

      // Top incidents
      addPageIfNeeded(70);
      drawSectionHeader('TOP 5 INCIDENTS PAR SCORE');
      
      chartData.topIncidents.forEach((inc, idx) => {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, 'F');
        
        setColor(colors.primary, 'fill');
        doc.circle(margin + 8, y + 6, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(String(idx + 1), margin + 8, y + 8, { align: 'center' });
        
        setColor(colors.dark, 'text');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(inc.name, margin + 18, y + 7);
        
        const scoreColor = inc.score >= 70 ? colors.danger : inc.score >= 50 ? colors.orange : colors.success;
        setColor(scoreColor, 'fill');
        doc.roundedRect(pageWidth - margin - 35, y + 2, 25, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(`Score: ${inc.score}`, pageWidth - margin - 22.5, y + 7.5, { align: 'center' });
        
        y += 14;
      });

      // Incidents list
      if (incidents.length > 0) {
        doc.addPage();
        y = 10;
        
        setColor(colors.primary, 'fill');
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('LISTE DÉTAILLÉE DES INCIDENTS', margin, 17);
        y = 35;

        incidents.slice(0, 20).forEach((inc, idx) => {
          addPageIfNeeded(20);
          
          const bgColor = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.roundedRect(margin, y, pageWidth - 2 * margin, 16, 2, 2, 'F');
          
          setColor(colors.primary, 'fill');
          doc.roundedRect(margin + 2, y + 2, 15, 12, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`#${inc.numero}`, margin + 9.5, y + 10, { align: 'center' });
          
          setColor(colors.dark, 'text');
          doc.setFontSize(8);
          const titre = inc.titre.length > 45 ? inc.titre.substring(0, 42) + '...' : inc.titre;
          doc.text(titre, margin + 20, y + 7);
          
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          setColor(colors.slate, 'text');
          doc.text(`${inc.dateIncident} | ${inc.institution} | ${inc.gravite} | ${inc.statut}`, margin + 20, y + 13);
          
          y += 18;
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
        setColor(colors.slate, 'text');
        doc.setFontSize(7);
        doc.text(
          `Registre des Incidents | Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })} | Page ${i}/${pageCount}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      doc.save('dashboard_incidents_' + format(new Date(), 'yyyy-MM-dd_HHmm') + '.pdf');
      toast.success('Dashboard exporté en PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPdf(false);
    }
  }, [kpis, chartData, incidents]);

  return { exportingPdf, exportDashboardPDF };
}
