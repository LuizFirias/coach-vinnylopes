import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DinamicaCargaReportData } from '@/lib/reports/getDinamicaCargaReport';
import { ReportKPICard } from './ReportKPICard';
import { ComboChart } from './ComboChart';

// Registrar fontes não é necessário se usarmos Helvetica, que é nativa e rápida.
// Configurar estilos limpos para impressão (fundo branco, texto cinza/preto)
const styles = StyleSheet.create({
  document: {
    backgroundColor: '#FFFFFF',
  },
  page: {
    padding: 35,
    fontFamily: 'Helvetica',
    position: 'relative',
    minHeight: '100%',
  },
  // Capa/Resumo
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
    marginBottom: 16,
  },
  logo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#B8902F',
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6B6B6B',
  },
  titleContainer: {
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1A1A',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metaContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 5,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#EAEAEA',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1.5,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6B6B6B',
  },
  metaValue: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1A1A1A',
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#F9F9F9',
    borderWidth: 0.5,
    borderColor: '#EAEAEA',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1A1A',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  // Seções de exercícios
  exerciseSection: {
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 4,
  },
  exerciseTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1A1A',
  },
  muscleBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#B8902F',
    backgroundColor: 'rgba(212, 168, 67, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  // Tabela
  table: {
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EAEAEA',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  tableHeader: {
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 0.8,
    borderBottomColor: '#E0E0E0',
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6B6B6B',
    textTransform: 'uppercase',
  },
  tableCellText: {
    fontSize: 7.5,
    color: '#1A1A1A',
  },
  colData: { flex: 1.2 },
  colVolume: { flex: 1.5, textAlign: 'right' },
  colCarga: { flex: 1.2, textAlign: 'right' },
  colReps: { flex: 1.1, textAlign: 'center' },
  colSeries: { flex: 1.2, textAlign: 'center' },
  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 35,
    right: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#EAEAEA',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: '#999999',
    fontFamily: 'Helvetica',
  }
});

// Formatadores
function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return (kg / 1000).toFixed(1).replace('.', ',') + ' ton';
  }
  return kg.toLocaleString('pt-BR') + ' kg';
}

interface DinamicaCargaReportDocumentProps {
  data: DinamicaCargaReportData;
}

export function DinamicaCargaReportDocument({ data }: DinamicaCargaReportDocumentProps) {
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  // Calcular sessões agregadas para a capa
  const sessoesAgregadasMap = new Map<string, { data: string; dataCompleta: string; volumeTotal: number; cargaMaxima: number }>();
  data.exercicios.forEach(ex => {
    ex.sessoes.forEach(s => {
      const existing = sessoesAgregadasMap.get(s.data);
      if (existing) {
        existing.volumeTotal += s.volumeTotal;
        if (s.cargaMaxima > existing.cargaMaxima) {
          existing.cargaMaxima = s.cargaMaxima;
        }
      } else {
        sessoesAgregadasMap.set(s.data, {
          data: s.data,
          dataCompleta: s.dataCompleta,
          volumeTotal: s.volumeTotal,
          cargaMaxima: s.cargaMaxima
        });
      }
    });
  });
  const sessoesAgregadas = Array.from(sessoesAgregadasMap.values());
  sessoesAgregadas.sort((a, b) => new Date(a.dataCompleta).getTime() - new Date(b.dataCompleta).getTime());

  const volumeDestaqueStr = data.resumoGeral.evolucaoDestaquePercent > 0
    ? `${data.resumoGeral.exercicioComMaiorEvolucao} (+${data.resumoGeral.evolucaoDestaquePercent}% PR)`
    : data.resumoGeral.exercicioComMaiorEvolucao;

  return (
    <Document style={styles.document}>
      {/* ─── PÁGINA 1: CAPA & RESUMO EXECUTIVO ─── */}
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>COACH VINNY LOPES</Text>
            <Text style={styles.logoSub}>PROGRAMAÇÃO E ALTA PERFORMANCE</Text>
          </View>
          <Text style={{ fontSize: 7, color: '#6B6B6B' }}>{dataHoje}</Text>
        </View>

        {/* Título do Relatório */}
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Relatório de Dinâmica de Carga</Text>
          <Text style={{ fontSize: 9, color: '#6B6B6B' }}>
            Acompanhamento analítico da progressão de volume de treino e carga máxima.
          </Text>
        </View>

        {/* Metadados */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>ATLETA:</Text>
            <Text style={styles.metaValue}>{data.aluno.nome} ({data.aluno.email || '—'})</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>FICHA DE TREINO ATIVA:</Text>
            <Text style={styles.metaValue}>{data.nomeFicha}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>PERÍODO DO FILTRO:</Text>
            <Text style={styles.metaValue}>
              {data.periodo.tipo === 'semanal' ? 'Semanal' : 'Mensal'} (de {data.periodo.dataInicio} a {data.periodo.dataFim})
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>PREPARADOR RESPONSÁVEL:</Text>
            <Text style={styles.metaValue}>{data.coach.nome}</Text>
          </View>
        </View>

        {/* Grid de KPIs */}
        <View style={styles.kpiGrid}>
          <ReportKPICard
            label="Volume Acumulado"
            value={formatVolume(data.resumoGeral.volumeTotalPeriodo)}
            sub="Carga total deslocada"
          />
          <ReportKPICard
            label="Sessões Realizadas"
            value={data.resumoGeral.sessoesPeriodo}
            sub="Check-ins válidos"
          />
          <ReportKPICard
            label="Adesão Média"
            value={`${data.resumoGeral.taxaAdesaoMedia}%`}
            sub="Séries feitas/prescritas"
          />
          <ReportKPICard
            label="Destaque Evolução"
            value={data.resumoGeral.exercicioComMaiorEvolucao !== 'Nenhum' ? '+' + data.resumoGeral.evolucaoDestaquePercent + '%' : '—'}
            sub={data.resumoGeral.exercicioComMaiorEvolucao !== 'Nenhum' ? data.resumoGeral.exercicioComMaiorEvolucao : 'Sem alteração'}
          />
        </View>

        {/* Gráfico Agregado */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Dinâmica de Volume Agregada do Período</Text>
          <Text style={{ fontSize: 7, color: '#6B6B6B', marginBottom: 8 }}>
            Soma do volume de todas as sessões registradas por data
          </Text>
          <ComboChart
            data={sessoesAgregadas}
            width={480}
            height={190}
          />
        </View>

        {/* Rodapé da Capa */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Relatório Exclusivo do Preparador Físico · Confidencial</Text>
          <Text style={styles.footerText}>Página 1</Text>
        </View>
      </Page>

      {/* ─── PÁGINAS SEGUINTES: EXERCÍCIOS INDIVIDUAIS ─── */}
      {data.exercicios.length === 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.logo}>COACH VINNY LOPES</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#6B6B6B' }}>Nenhum histórico encontrado</Text>
            <Text style={{ fontSize: 9, color: '#999999', textAlign: 'center', maxWidth: 280 }}>
              Não existem registros de execução para os exercícios da ficha do atleta no período selecionado.
            </Text>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Relatório Exclusivo do Preparador Físico</Text>
            <Text style={styles.footerText}>Página 2</Text>
          </View>
        </Page>
      ) : (
        // Dividir exercícios e renderizar
        data.exercicios.map((ex, exIdx) => (
          <Page key={ex.nome} size="A4" style={styles.page}>
            {/* Mini cabeçalho */}
            <View style={styles.header}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#B8902F' }}>ANÁLISE DE EXERCÍCIO</Text>
              <Text style={{ fontSize: 7, color: '#6B6B6B' }}>{data.aluno.nome}</Text>
            </View>

            {/* Container do exercício para manter agrupado */}
            <View style={styles.exerciseSection}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseTitle}>{ex.nome}</Text>
                <Text style={styles.muscleBadge}>{ex.grupo_muscular}</Text>
              </View>

              {/* KPIs do exercício */}
              <View style={styles.kpiGrid}>
                <ReportKPICard
                  label="Carga Máxima (PR)"
                  value={`${ex.prAbsoluto.valor} kg`}
                  sub={`Alcançado em ${ex.prAbsoluto.data}`}
                />
                <ReportKPICard
                  label="Volume de Carga"
                  value={formatVolume(ex.volumeTotalPeriodo)}
                  sub="Acumulado do período"
                />
                <ReportKPICard
                  label="Variação de Volume"
                  value={ex.variacaoVolumePercent >= 0 ? `+${ex.variacaoVolumePercent}%` : `${ex.variacaoVolumePercent}%`}
                  sub="Evolução prim. vs ult. sessão"
                />
                <ReportKPICard
                  label="Adesão (Séries)"
                  value={`${ex.taxaAdesao}%`}
                  sub="Completas / Prescritas"
                />
              </View>

              {/* Gráfico do exercício */}
              <View style={[styles.chartContainer, { marginBottom: 12 }]}>
                <Text style={styles.chartTitle}>Evolução de Carga e Volume Individual</Text>
                <ComboChart
                  data={ex.sessoes}
                  width={460}
                  height={150}
                />
              </View>

              {/* Tabela de histórico */}
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1A1A1A', marginTop: 8, textTransform: 'uppercase' }}>
                Histórico de Execuções
              </Text>
              
              <View style={styles.table}>
                {/* Cabeçalho da tabela */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <View style={styles.colData}><Text style={styles.tableHeaderText}>Data</Text></View>
                  <View style={styles.colVolume}><Text style={styles.tableHeaderText}>Volume Total</Text></View>
                  <View style={styles.colCarga}><Text style={styles.tableHeaderText}>Carga Max</Text></View>
                  <View style={styles.colSeries}><Text style={styles.tableHeaderText}>Séries</Text></View>
                </View>

                {/* Linhas da tabela (Alternando cor de fundo - zebra stripe) */}
                {ex.sessoes.map((s, sIdx) => (
                  <View
                    key={sIdx}
                    style={[
                      styles.tableRow,
                      { backgroundColor: sIdx % 2 === 1 ? '#F9F9F9' : '#FFFFFF' }
                    ]}
                  >
                    <View style={styles.colData}>
                      <Text style={styles.tableCellText}>{s.data}</Text>
                    </View>
                    <View style={styles.colVolume}>
                      <Text style={[styles.tableCellText, { fontFamily: 'Helvetica-Bold' }]}>{formatVolume(s.volumeTotal)}</Text>
                    </View>
                    <View style={styles.colCarga}>
                      <Text style={styles.tableCellText}>{s.cargaMaxima} kg</Text>
                    </View>
                    <View style={styles.colSeries}>
                      <Text style={styles.tableCellText}>{s.seriesCompletadas}/{s.seriesPrescritas}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Rodapé da página de exercícios */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Relatório Exclusivo do Preparador Físico · Ficha de Cargas</Text>
              <Text style={styles.footerText}>Página {exIdx + 2}</Text>
            </View>
          </Page>
        ))
      )}
    </Document>
  );
}
