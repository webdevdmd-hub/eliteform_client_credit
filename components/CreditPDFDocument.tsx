import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { CreditApplication } from '../types';
import logoPng from './assets/dmd-logo.png';

const colors = {
  brandGreen: '#6d8e1b',
  text: '#262626',
  subtle: '#666',
  line: '#b3b3b3',
  cardBg: '#fbfbf8',
  pageBg: '#f7f6f2'
};

const styles = StyleSheet.create({
  page: { padding: 16, backgroundColor: colors.pageBg, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 10, gap: 10 },
  logo: { width: 90, height: 50, objectFit: 'contain' },
  headerText: { alignItems: 'flex-start', textAlign: 'left' },
  brandName: { fontSize: 12, fontWeight: 'bold', color: colors.text, textAlign: 'left' },
  formTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 2, textDecoration: 'underline', textAlign: 'left' },
  card: { backgroundColor: colors.cardBg, borderRadius: 8, padding: 12, borderColor: '#e4e4df', borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: colors.brandGreen, marginBottom: 8 },
  sectionBody: { gap: 6, display: 'flex', flexDirection: 'column' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 8.5, color: colors.text, marginRight: 8 },
  dotted: {
    borderBottomWidth: 0.8,
    borderStyle: 'dotted',
    borderColor: colors.line,
    flex: 1,
    minHeight: 12,
    paddingVertical: 3,
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  value: { fontSize: 8.5, color: colors.text },
  grid2: { flexDirection: 'row', gap: 12 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxMark: { width: 8, height: 8, backgroundColor: colors.brandGreen },
  docLabel: { fontSize: 7.5, color: colors.text },
  signatureBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 6,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#fff'
  },
  signatureImg: { width: '100%', height: 32, objectFit: 'contain' }
});

const InlineField = ({ label, value, flex = 1, gap = 6 }: { label: string; value?: string; flex?: number; gap?: number }) => (
  <View style={[styles.row, { flex }]}>
    <Text style={[styles.label, { marginRight: gap }]}>{label}</Text>
    <View style={styles.dotted}>{!!value && <Text style={styles.value}>{value}</Text>}</View>
  </View>
);

const DocItem = ({ label, checked }: { label: string; checked: boolean }) => (
  <View style={styles.docRow}>
    <View style={styles.checkbox}>{checked ? <View style={styles.checkboxMark} /> : null}</View>
    <Text style={styles.docLabel}>{label}</Text>
  </View>
);

interface Props {
  data?: CreditApplication;
}

export const CreditPDFDocument: React.FC<Props> = ({ data }) => {
  const app: CreditApplication =
    data || {
      companyInfo: { companyName: '', tradingName: '', officeAddress: '', city: '', poBox: '', landline: '', mobile: '', email: '', website: '' },
      businessDetails: {
        typeOfBusiness: '',
        yearEstablished: '',
        numberOfEmployees: '',
        natureOfBusiness: '',
        authorizedSignatoryName: '',
        designation: '',
        mobile: '',
        email: ''
      },
      creditRequest: { creditLimitAed: '', preferredPaymentTerms: '', estimatedMonthlyPurchases: '' },
      bankDetails: { bankName: '', branch: '', accountName: '', accountNumber: '', iban: '' },
      tradeReferences: [
        { companyName: '', contactPerson: '', mobile: '', email: '' },
        { companyName: '', contactPerson: '', mobile: '', email: '' }
      ],
      documents: {},
      questionnaire: { preferredCommunication: '' },
      declaration: { agreed: false, name: '', designation: '', date: '', signatureUrl: '' }
    };

  const trades = [...app.tradeReferences, ...Array(Math.max(0, 4 - app.tradeReferences.length)).fill({ companyName: '', contactPerson: '', mobile: '', email: '' })].slice(
    0,
    4
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoPng} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.brandName}>DIAMOND LIGHTS GENERAL TRADING L.L.C</Text>
            <Text style={styles.formTitle}>CREDIT APPLICATION</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1) Company Information</Text>
          <View style={styles.sectionBody}>
            <InlineField label="Company Name :" value={app.companyInfo.companyName} />
            <InlineField label="Trading Name :" value={app.companyInfo.tradingName} />
            <View style={styles.grid2}>
              <InlineField label="Office Address :" value={app.companyInfo.officeAddress} flex={1.3} />
              <InlineField label="City :" value={app.companyInfo.city} flex={0.7} />
            </View>
            <View style={styles.grid2}>
              <InlineField label="P.O. Box :" value={app.companyInfo.poBox} />
              <InlineField label="Landline :" value={app.companyInfo.landline} />
            </View>
            <View style={styles.grid2}>
              <InlineField label="Mobile :" value={app.companyInfo.mobile} />
              <InlineField label="E-mail :" value={app.companyInfo.email} />
            </View>
            <InlineField label="Website :" value={app.companyInfo.website} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2) Business Details</Text>
          <View style={styles.sectionBody}>
            <View style={styles.grid2}>
              <InlineField label="Type of Business :" value={app.businessDetails.typeOfBusiness} />
              <InlineField label="Year Established :" value={app.businessDetails.yearEstablished} />
            </View>
            <InlineField label="Number of Employees :" value={app.businessDetails.numberOfEmployees} />
            <InlineField label="Nature of Business :" value={app.businessDetails.natureOfBusiness} />
            <View style={styles.grid2}>
              <InlineField label="Authorized Signatory Name :" value={app.businessDetails.authorizedSignatoryName} />
              <InlineField label="Designation :" value={app.businessDetails.designation} />
            </View>
            <View style={styles.grid2}>
              <InlineField label="Mobile :" value={app.businessDetails.mobile} />
              <InlineField label="E-mail :" value={app.businessDetails.email} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3) Credit Request</Text>
          <View style={styles.sectionBody}>
            <View style={styles.grid2}>
              <InlineField label="Requested Credit Limit (AED) :" value={app.creditRequest.creditLimitAed} />
              <InlineField label="Estimated Monthly Purchases :" value={app.creditRequest.estimatedMonthlyPurchases} />
            </View>
            <InlineField label="Preferred Payment Terms :" value={app.creditRequest.preferredPaymentTerms} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4) Bank Details</Text>
          <View style={styles.sectionBody}>
            <InlineField label="Bank Name :" value={app.bankDetails.bankName} />
            <View style={styles.grid2}>
              <InlineField label="Branch :" value={app.bankDetails.branch} />
              <InlineField label="Account Name :" value={app.bankDetails.accountName} />
            </View>
            <View style={styles.grid2}>
              <InlineField label="Account Number :" value={app.bankDetails.accountNumber} />
              <InlineField label="IBAN :" value={app.bankDetails.iban} />
            </View>
          </View>
        </View>
      </Page>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5) Trade References</Text>
          <View style={{ gap: 6 }}>
            {trades.map((t, idx) => (
              <View key={`trade-${idx}`} style={styles.grid2}>
                <InlineField label={`${idx + 1}. Company :`} value={t.companyName} flex={1.2} />
                <InlineField label="Contact Person :" value={t.contactPerson} flex={1} />
                <InlineField label="Mobile :" value={t.mobile} flex={0.8} />
                <InlineField label="Email :" value={t.email} flex={1} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>6) Documents Annexed</Text>
          <View style={{ gap: 8 }}>
            <View style={styles.grid2}>
              <DocItem label="Trade License" checked={!!app.documents.tradeLicenseUrl} />
              <DocItem label="VAT Certificate" checked={!!app.documents.vatCertificateUrl} />
            </View>
            <View style={styles.grid2}>
              <DocItem label="Emirates ID Copy" checked={!!app.documents.emiratesIdUrl} />
              <DocItem label="Visa Copy" checked={!!app.documents.visaCopyUrl} />
            </View>
            <View style={styles.grid2}>
              <DocItem label="Passport Copy" checked={!!app.documents.passportCopyUrl} />
              <DocItem label="Bank Statement (3–6 Months)" checked={!!app.documents.bankStatementUrl} />
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>7) Questionnaire</Text>
          <View style={styles.sectionBody}>
            <InlineField
              label="Credit facilities with other suppliers?"
              value={app.questionnaire.hasCreditFacilities === undefined ? '' : app.questionnaire.hasCreditFacilities ? 'Yes' : 'No'}
            />
            <InlineField label="Details :" value={app.questionnaire.creditFacilitiesDetails} />
            <InlineField
              label="Defaulted or delayed payments?"
              value={app.questionnaire.hasDefaultedPayments === undefined ? '' : app.questionnaire.hasDefaultedPayments ? 'Yes' : 'No'}
            />
            <InlineField label="Details :" value={app.questionnaire.defaultedPaymentsDetails} />
            <InlineField
              label="Purchase orders issued before delivery?"
              value={app.questionnaire.purchaseOrdersBeforeDelivery === undefined ? '' : app.questionnaire.purchaseOrdersBeforeDelivery ? 'Yes' : 'No'}
            />
            <InlineField
              label="Financially stable for credit obligations?"
              value={app.questionnaire.financiallyStable === undefined ? '' : app.questionnaire.financiallyStable ? 'Yes' : 'No'}
            />
            <InlineField label="Preferred communication :" value={app.questionnaire.preferredCommunication} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>8) Declaration</Text>
          <View style={styles.sectionBody}>
            <InlineField label="Name :" value={app.declaration.name} />
            <InlineField label="Designation :" value={app.declaration.designation} />
            <InlineField label="Date :" value={app.declaration.date} />
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.label, { marginRight: 6 }]}>Signature :</Text>
              <View style={[styles.signatureBox, { flex: 1 }]}>
                {app.declaration.signatureUrl ? <Image src={app.declaration.signatureUrl} style={styles.signatureImg} /> : <Text style={styles.value}>Signature</Text>}
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
