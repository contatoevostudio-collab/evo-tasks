import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Invoice } from '../types';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#636366' },
  enviada:   { label: 'Enviada',   color: '#356BFF' },
  paga:      { label: 'Paga',      color: '#30d158' },
  cancelada: { label: 'Cancelada', color: '#ff453a' },
};

export interface InvoicePDFProps {
  inv: Invoice;
  clientName: string;
  accent: string;
  qrCodeSrc?: string;
  workspaceName: string;
  workspacePhotoUrl?: string;
}

export function InvoicePDF({ inv, clientName, accent, qrCodeSrc, workspaceName, workspacePhotoUrl }: InvoicePDFProps) {
  const status = STATUS_CFG[inv.status] ?? STATUS_CFG.rascunho;
  const hasTaxes = (inv.taxes ?? 0) > 0;
  const overdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paga';

  const s = StyleSheet.create({
    page:   { backgroundColor: '#ffffff', fontFamily: 'Helvetica', padding: 0 },
    bar:    { height: 6, backgroundColor: accent, width: '100%' },
    inner:  { padding: '32px 48px 40px' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    avatarImg: { width: 46, height: 46, borderRadius: 10 },
    avatarBox: { width: 46, height: 46, borderRadius: 10, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#fff', fontSize: 22, fontFamily: 'Helvetica-Bold' },
    wsName: { color: '#1a1a2e', fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 8 },
    wsTag:  { color: '#9ca3af', fontSize: 9, marginTop: 3 },
    invLabel: { color: '#9ca3af', fontSize: 8, textAlign: 'right', letterSpacing: 2 },
    invNum:   { color: '#1a1a2e', fontSize: 30, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 2 },
    badge:    { alignSelf: 'flex-end', marginTop: 6, backgroundColor: `${status.color}20`, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: status.color, fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 },

    // Dividers & labels
    divider: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 20 },
    secLabel: { color: '#9ca3af', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },

    // Client + dates
    cliDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    cliName:   { color: '#1a1a2e', fontSize: 19, fontFamily: 'Helvetica-Bold' },
    dtLabel:   { color: '#9ca3af', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
    dtValue:   { color: '#374151', fontSize: 12 },
    dtOverdue: { color: '#ff453a', fontSize: 12 },

    // Table
    tHead:      { flexDirection: 'row', paddingBottom: 8 },
    tRow:       { flexDirection: 'row', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#f3f4f6', alignItems: 'center' },
    thText:     { color: '#9ca3af', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 },
    tdDesc:     { color: '#1a1a2e', fontSize: 12 },
    tdNum:      { color: '#6b7280', fontSize: 11 },
    tdTotal:    { color: '#1a1a2e', fontSize: 12, fontFamily: 'Helvetica-Bold' },

    // Totals box
    totBox:     { backgroundColor: '#f9fafb', borderRadius: 10, padding: 16, marginTop: 12, marginBottom: 24 },
    totRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    totLbl:     { color: '#6b7280', fontSize: 12 },
    totVal:     { color: '#6b7280', fontSize: 12 },
    totDiv:     { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
    totFinalLbl: { color: '#1a1a2e', fontSize: 16, fontFamily: 'Helvetica-Bold' },
    totFinalVal: { color: accent, fontSize: 16, fontFamily: 'Helvetica-Bold' },

    // PIX
    pixKey:  { backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginTop: 8 },
    pixKeyT: { color: '#1a1a2e', fontSize: 12, fontFamily: 'Helvetica-Bold' },
    pixNote: { color: '#9ca3af', fontSize: 10, marginTop: 8, lineHeight: 1.5 },

    // Notes & footer
    notesText: { color: '#6b7280', fontSize: 12, lineHeight: 1.6 },
    footer:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    footerTxt: { color: '#d1d5db', fontSize: 9 },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Top accent stripe */}
        <View style={s.bar} />

        <View style={s.inner}>
          {/* Header: workspace + invoice number */}
          <View style={s.header}>
            <View>
              {workspacePhotoUrl
                ? <Image src={workspacePhotoUrl} style={s.avatarImg} />
                : <View style={s.avatarBox}><Text style={s.avatarLetter}>{workspaceName.charAt(0).toUpperCase()}</Text></View>
              }
              <Text style={s.wsName}>{workspaceName}</Text>
              <Text style={s.wsTag}>Serviços Criativos</Text>
            </View>
            <View>
              <Text style={s.invLabel}>FATURA</Text>
              <Text style={s.invNum}>#{String(inv.number).padStart(4, '0')}</Text>
              <View style={s.badge}><Text style={s.badgeText}>{status.label}</Text></View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Client + dates */}
          <View style={s.cliDateRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.secLabel}>Para</Text>
              <Text style={s.cliName}>{clientName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={s.dtLabel}>Emissão</Text>
                <Text style={s.dtValue}>{format(new Date(inv.date + 'T12:00'), "d 'de' MMMM yyyy", { locale: ptBR })}</Text>
              </View>
              {inv.dueDate && (
                <View>
                  <Text style={s.dtLabel}>Vencimento</Text>
                  <Text style={overdue ? s.dtOverdue : s.dtValue}>
                    {format(new Date(inv.dueDate + 'T12:00'), "d 'de' MMMM yyyy", { locale: ptBR })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.divider} />

          {/* Line items */}
          <View style={s.tHead}>
            <Text style={[s.thText, { flex: 1 }]}>Serviço / Produto</Text>
            <Text style={[s.thText, { width: 36, textAlign: 'center' }]}>Qtd</Text>
            <Text style={[s.thText, { width: 90, textAlign: 'right' }]}>Valor unit.</Text>
            <Text style={[s.thText, { width: 90, textAlign: 'right' }]}>Total</Text>
          </View>
          {inv.items.map(item => (
            <View key={item.id} style={s.tRow}>
              <Text style={[s.tdDesc, { flex: 1 }]}>{item.description || '—'}</Text>
              <Text style={[s.tdNum, { width: 36, textAlign: 'center' }]}>{item.qty}</Text>
              <Text style={[s.tdNum, { width: 90, textAlign: 'right' }]}>{fmt(item.unitPrice)}</Text>
              <Text style={[s.tdTotal, { width: 90, textAlign: 'right' }]}>{fmt(item.qty * item.unitPrice)}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={s.totBox}>
            <View style={s.totRow}>
              <Text style={s.totLbl}>Subtotal</Text>
              <Text style={s.totVal}>{fmt(inv.subtotal)}</Text>
            </View>
            {hasTaxes && (
              <View style={s.totRow}>
                <Text style={s.totLbl}>Impostos</Text>
                <Text style={s.totVal}>{fmt(inv.taxes ?? 0)}</Text>
              </View>
            )}
            <View style={s.totDiv} />
            <View style={[s.totRow, { marginBottom: 0 }]}>
              <Text style={s.totFinalLbl}>Total</Text>
              <Text style={s.totFinalVal}>{fmt(inv.total)}</Text>
            </View>
          </View>

          {/* PIX */}
          {inv.pixKey && (
            <>
              <View style={s.divider} />
              <View style={{ marginBottom: 24 }}>
                <Text style={s.secLabel}>Pagamento via PIX</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                  {qrCodeSrc && (
                    <Image src={qrCodeSrc} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 20 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#6b7280', fontSize: 10 }}>Chave PIX:</Text>
                    <View style={s.pixKey}>
                      <Text style={s.pixKeyT}>{inv.pixKey}</Text>
                    </View>
                    <Text style={s.pixNote}>
                      Transfira exatamente {fmt(inv.total)} para esta chave PIX.
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Notes */}
          {inv.notes && (
            <>
              <View style={s.divider} />
              <View style={{ marginBottom: 24 }}>
                <Text style={s.secLabel}>Observações</Text>
                <Text style={s.notesText}>{inv.notes}</Text>
              </View>
            </>
          )}

          {/* Footer */}
          <View style={s.divider} />
          <View style={s.footer}>
            <Text style={s.footerTxt}>Powered by EvoStudio</Text>
            <Text style={s.footerTxt}>#{String(inv.number).padStart(4, '0')} · {format(new Date(inv.createdAt), "d MMM yyyy", { locale: ptBR })}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
