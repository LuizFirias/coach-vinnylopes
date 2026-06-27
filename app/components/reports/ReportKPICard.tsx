import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 10,
    flex: 1,
    marginHorizontal: 3,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 56,
  },
  label: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6B6B6B',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  sub: {
    fontSize: 8,
    color: '#B8902F',
    marginTop: 2,
    textAlign: 'center',
  }
});

interface ReportKPICardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function ReportKPICard({ label, value, sub }: ReportKPICardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}
