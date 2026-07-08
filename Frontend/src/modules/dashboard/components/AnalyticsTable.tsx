import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../../../design-system/tokens';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAlertStore } from '../../../store/alertStore';

export interface EntityAnalyticsData {
  name: string;
  farmers: any[];
  villageCount: number;
}

interface AnalyticsTableProps {
  entities: EntityAnalyticsData[];
  title?: string;
}

export const AnalyticsTable = ({ entities, title }: AnalyticsTableProps) => {

  const computeMetrics = (farmers: any[], villageCount: number) => {
    if (!farmers || farmers.length === 0) {
      return {
        villageCount, totalFarmers: 0, completed: 0, drafts: 0, fsppCount: 0, avgScore: 0,
        totalLand: '0', committedLand: '0', avgLand: '0', topCrops: '—', topSoils: '—',
        primaryStage: '—', lastVisited: '—'
      };
    }

    const totalFarmers = farmers.length;
    const completed = farmers.filter(f => !f.isDraft && !f.is_draft).length;
    const drafts = farmers.filter(f => f.isDraft || f.is_draft).length;
    const fspp = farmers.filter(f => {
      const fd = f.raw?.fspp_details || f.fspp_details || {};
      return Object.keys(fd).length > 0;
    });
    
    const avgScore = fspp.length > 0 
      ? Math.round(fspp.reduce((sum: number, f: any) => sum + Number((f.raw?.fspp_details || f.fspp_details)?.score || 0), 0) / fspp.length) 
      : 0;

    const farmersWithLand = farmers.filter(f => Number((f.raw?.farm_details || f.farm_details)?.totalLand || 0) > 0);
    const totalLand = farmersWithLand.reduce((sum: number, f: any) => sum + Number((f.raw?.farm_details || f.farm_details)?.totalLand || 0), 0);
    const committedLand = fspp.reduce((sum: number, f: any) => sum + Number((f.raw?.fspp_details || f.fspp_details)?.committedLand || 0), 0);
    const avgLand = farmersWithLand.length > 0 ? (totalLand / farmersWithLand.length).toFixed(1) : '0';

    const cropMap = new Map();
    let cropTotal = 0;
    
    const soilMap = new Map();
    let soilTotal = 0;
    
    farmers.forEach(f => {
      const fd = f.raw?.farm_details || f.farm_details || {};
      (fd.majorCrops || []).forEach((c: string) => {
        cropMap.set(c, (cropMap.get(c) || 0) + 1);
        cropTotal++;
      });
      (fd.soilType || []).forEach((s: string) => {
        soilMap.set(s, (soilMap.get(s) || 0) + 1);
        soilTotal++;
      });
    });
    
    const topCrops = cropTotal > 0
      ? Array.from(cropMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(e => `${e[0]} (${Math.round((e[1]/cropTotal)*100)}%)`)
          .join(', ')
      : '—';

    const topSoils = soilTotal > 0 
      ? Array.from(soilMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(e => `${e[0]} (${Math.round((e[1]/soilTotal)*100)}%)`)
          .join(', ') 
      : '—';

    const dates = farmers.map(f => new Date(f.updatedAt || f.updated_at || f.created_at || 0).getTime()).filter(t => !isNaN(t) && t > 0);
    const lastVisited = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const bioMap = new Map();
    let bioTotal = 0;
    
    farmers.forEach(f => {
      const fd = f.raw?.farm_details || f.farm_details || {};
      const fs = f.raw?.fspp_details || f.fspp_details || {};
      const stage = fd.biofertilizer || fs.statusLabel || 'Unknown';
      bioMap.set(stage, (bioMap.get(stage) || 0) + 1);
      bioTotal++;
    });
    
    const primaryStage = bioTotal > 0
      ? Array.from(bioMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(e => `${e[0]} (${Math.round((e[1]/bioTotal)*100)}%)`)
          .join(', ')
      : '—';

    return {
      villageCount, totalFarmers, completed, drafts, fsppCount: fspp.length, avgScore,
      totalLand: totalLand.toFixed(1), committedLand: committedLand.toFixed(1), avgLand,
      topCrops, topSoils, primaryStage, lastVisited
    };
  };

  const columnData = entities.map(e => computeMetrics(e.farmers, e.villageCount));

  const rows = [
    { label: "Number of Villages", key: "villageCount" },
    { label: "Number of Farmers", key: "totalFarmers" },
    { label: "Completed Profile Farmer", key: "completed" },
    { label: "Draft Farmer", key: "drafts" },
    { label: "FSPP Enrolled Farmer", key: "fsppCount" },
    { label: "Average Score", key: "avgScore" },
    { label: "Total Land (Acres)", key: "totalLand" },
    { label: "Committed Land for Bio", key: "committedLand" },
    { label: "Average Land/Farmer (Acres)", key: "avgLand" },
    { label: "Major Crops", key: "topCrops" },
    { label: "Soil Type & %", key: "topSoils" },
    { label: "Biofertilizer Stage", key: "primaryStage" },
    { label: "Last Visited on", key: "lastVisited" }
  ];

  const exportToPDF = async () => {
    try {
      const headersHtml = `<th>Metrics</th>` + entities.map(e => `<th>${e.name}</th>`).join('');

      const rowsHtml = rows.map((row) => {
        const rowDataHtml = columnData.map(data => `<td>${data[row.key as keyof typeof data]}</td>`).join('');
        return `<tr>
            <td><strong>${row.label}</strong></td>
            ${rowDataHtml}
        </tr>`;
      }).join('');
      
      const htmlContent = `
        <html>
          <head>
            <title>Territory Analytics Export</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h2 { text-align: center; color: #333; margin-bottom: 5px; }
              p { text-align: center; color: #666; font-size: 12px; margin-top: 0; }
              table { border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
              th { background-color: #f4f4f5; color: #333; }
              td:first-child { text-align: left; background-color: #fafafa; white-space: nowrap; }
              @media print {
                @page { size: landscape; margin: 10mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <h2>Territory Analysis Report</h2>
            <p>Export Date: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>${headersHtml}</tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Save Analytics PDF' });
    } catch (e: any) {
      useAlertStore.getState().showAlert("PDF Error", "Failed to generate or share PDF.");
      console.error(e);
    }
  };

  if (entities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available to display.</Text>
      </View>
    );
  }

  // Pure React Native trick to keep the first column sticky: 
  // We render the first column separately from the horizontal scroll view.
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title || 'Analysis'}</Text>
        <Pressable onPress={exportToPDF} style={styles.pdfButton}>
          <MaterialIcons name="file-download" size={20} color={colors.primary} />
          <Text style={styles.pdfButtonText}>PDF</Text>
        </Pressable>
      </View>

      <View style={styles.tableWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
          <ScrollView showsVerticalScrollIndicator={true} bounces={false}>
            <View>
              {/* Header Row */}
              <View style={[styles.row, styles.headerBg, { minHeight: 48 }]}>
                <View style={[styles.cell, styles.stickyColumn, styles.headerBg]}>
                  <Text style={styles.headerText}>Metrics</Text>
                </View>
                {entities.map((e, i) => (
                  <View key={i} style={[styles.cell, styles.valueCell]}>
                    <Text style={[styles.headerText, { textAlign: 'center' }]}>{e.name}</Text>
                  </View>
                ))}
              </View>
              
              {/* Data Rows */}
              {rows.map((row, i) => (
                <View key={i} style={[styles.row, i % 2 !== 0 ? styles.stripeBg : { backgroundColor: colors.surface }]}>
                  <View style={[styles.cell, styles.stickyColumn, i % 2 !== 0 ? styles.stripeBg : { backgroundColor: colors.surface }]}>
                    <Text style={styles.rowLabelText}>{row.label}</Text>
                  </View>
                  {columnData.map((data, colIdx) => (
                    <View key={colIdx} style={[styles.cell, styles.valueCell]}>
                      <Text style={[
                        styles.valueText,
                        ['topCrops', 'topSoils', 'primaryStage'].includes(row.key) && styles.multilineText
                      ]}>
                        {String(data[row.key as keyof typeof data])}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  pdfButtonText: {
    color: colors.primary,
    fontWeight: '800',
    marginLeft: 6,
    fontSize: 14,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  tableWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBg: {
    backgroundColor: '#F8FAFC',
  },
  stripeBg: {
    backgroundColor: '#FAFAFA',
  },
  cell: {
    padding: spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  stickyColumnWrapper: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    elevation: 2, // shadow for android
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  stickyColumn: {
    width: 140,
  },
  valueCell: {
    width: 160,
    alignItems: 'center',
  },
  headerText: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 13,
  },
  rowLabelText: {
    fontWeight: '600',
    color: colors.textMuted,
    fontSize: 12,
  },
  valueText: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 13,
    textAlign: 'center',
  },
  multilineText: {
    fontSize: 11,
    lineHeight: 16,
  }
});
