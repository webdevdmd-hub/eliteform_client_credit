import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import {
  ClientForm,
  SectionA,
  Uploads,
  InvoiceContact,
  Signatory,
  BankReference,
  TradeReference,
  OwnerEntry
} from '../types';
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
  page: { padding: 18, backgroundColor: colors.pageBg, fontFamily: 'Helvetica' },
  card: { backgroundColor: colors.cardBg, borderRadius: 10, padding: 12, borderColor: '#e4e4df', borderWidth: 1 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: colors.brandGreen, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1 },
  label: { fontSize: 9, color: colors.text, marginRight: 6 },
  dotted: {
    borderBottomWidth: 0.8,
    borderStyle: 'dotted',
    borderColor: colors.line,
    flex: 1,
    minHeight: 10,
    paddingVertical: 2,
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  value: { fontSize: 9, color: colors.text },
  group: { marginBottom: 10 },
  duo: { flexDirection: 'row', gap: 8 },
  subText: { fontSize: 8, color: colors.subtle },
  signatureBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 6,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#fff'
  },
  signatureImg: { width: '100%', height: 40, objectFit: 'contain' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flex: 1 },
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
  docLabel: { fontSize: 9, color: colors.text },
  declarationText: { fontSize: 8, color: colors.text, lineHeight: 1.35, marginBottom: 4 },
  bulletList: { marginLeft: 10, marginTop: 4, marginBottom: 6 },
  bulletItem: { fontSize: 8, color: colors.text, lineHeight: 1.35, marginBottom: 2 },
  ackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  ackBox: { width: 12, height: 12, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', alignItems: 'center' },
  ackMark: { width: 8, height: 8, backgroundColor: colors.brandGreen },
  inlineSignature: {
    borderBottomWidth: 0.8,
    borderStyle: 'dotted',
    borderColor: colors.line,
    minHeight: 22,
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center'
  },
  inlineStamp: {
    borderWidth: 0.8,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 4,
    minHeight: 28,
    padding: 4,
    justifyContent: 'center'
  },
  inlineImage: { height: 30, objectFit: 'contain' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 16, gap: 12 },
  logo: { width: 110, height: 60, objectFit: 'contain' },
  headerText: { alignItems: 'flex-start', textAlign: 'left' },
  brandName: { fontSize: 14, fontWeight: 'bold', color: colors.text, textAlign: 'left' },
  formTitle: { fontSize: 11, fontWeight: 'bold', marginTop: 4, textDecoration: 'underline', textAlign: 'left' }
});

const isPdfAsset = (src?: string) => {
  if (!src) return false;
  return /(^data:application\/pdf)|(\.pdf($|\?))/i.test(src);
};

const LineField = ({ label, value, flex = 1 }: { label: string; value?: string; flex?: number }) => (
  <View style={[styles.row, { flex, marginBottom: 8 }]} wrap={false}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.dotted}>{!!value && <Text style={styles.value}>{value}</Text>}</View>
  </View>
);

const InlineField = ({
  label,
  value,
  flex = 1,
  gap = 6
}: {
  label: string;
  value?: string;
  flex?: number;
  gap?: number;
}) => (
  <View style={[styles.row, { flex, marginBottom: 8 }]}>
    <Text style={[styles.label, { marginRight: gap }]}>{label}</Text>
    <View style={styles.dotted}>{!!value && <Text style={styles.value}>{value}</Text>}</View>
  </View>
);

const SignatureBlock = ({ label, src }: { label: string; src?: string }) => (
  <View style={{ flex: 1, marginRight: 10 }}>
    <Text style={[styles.label, { marginBottom: 4 }]}>{label}</Text>
    <View style={styles.signatureBox}>
      {src ? (
        isPdfAsset(src) ? <Text style={styles.subText}>See attached PDF</Text> : <Image src={src} style={styles.signatureImg} />
      ) : (
        <Text style={styles.subText}>Signature</Text>
      )}
    </View>
  </View>
);

const DocItem = ({ label, checked }: { label: string; checked: boolean }) => (
  <View style={styles.docRow}>
    <View style={styles.checkbox}>{checked ? <View style={styles.checkboxMark} /> : null}</View>
    <Text style={styles.docLabel}>{label}</Text>
  </View>
);

interface PDFProps {
  data: ClientForm;
}

export const PDFDocument: React.FC<PDFProps> = ({ data }) => {
  const sectionA = (data.sectionA || {}) as Partial<SectionA>;
  const sectionB = (data.sectionB || []) as Partial<OwnerEntry>[];
  const sectionC = (data.sectionC || []) as Partial<Signatory>[];
  const sectionD = (data.sectionD || []) as Partial<Signatory>[];
  const sectionG = (data.sectionG || []) as Partial<BankReference>[];
  const sectionH = (data.sectionH || []) as Partial<TradeReference>[];
  const sectionE = (data.sectionE || {}) as Partial<InvoiceContact>;
  const sectionF = (data.sectionF || {}) as Partial<InvoiceContact>;
  const uploads = (data.uploads || {}) as Partial<Uploads>;

  const padArray = <T,>(arr: T[] | undefined, size: number, filler: T): T[] => {
    const clone = [...(arr || [])];
    while (clone.length < size) clone.push(filler);
    return clone.slice(0, size);
  };

  const owners = padArray<Partial<OwnerEntry>>(sectionB, 4, {});
  const banks = padArray<Partial<BankReference>>(sectionG, 4, {});
  const trades = padArray<Partial<TradeReference>>(sectionH, 4, {});

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoPng} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.brandName}>DIAMOND LIGHTS GENERAL TRADING L.L.C</Text>
            <Text style={styles.formTitle}>CLIENT REGISTRATION FORM</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>A) Company Information</Text>
          <View style={styles.group}>
            <LineField label="Name of the Company :" value={sectionA.companyName} />
            <View style={{ height: 4 }} />
            <LineField label="Division :" value={sectionA.division} />
            <View style={styles.duo}>
              <LineField label="P.O. Box :" value={sectionA.poBox} />
              <LineField label="Emirate :" value={sectionA.emirate} />
            </View>
            <LineField label="Location :" value={sectionA.location} />
            <View style={[styles.duo, { gap: 10 }]}>
              <InlineField label="Telephone :" value={sectionA.telephone} />
              <InlineField label="Fax :" value={sectionA.fax} />
              <InlineField label="E-mail :" value={sectionA.email} />
            </View>
            <View style={styles.duo}>
              <LineField label="Nature of Business :" value={sectionA.natureOfBusiness} />
              <LineField label="Period of Business in UAE :" value={sectionA.periodInUAE} />
            </View>
            <LineField label="Legal Status :" value={sectionA.legalStatus} />
            <View style={styles.duo}>
              <LineField label="Trade License No :" value={sectionA.tradeLicenseNo} />
              <LineField label="Expiry Date :" value={sectionA.tradeLicenseExpiry} />
            </View>
            <View style={styles.duo}>
              <LineField label="Sponsor Name :" value={sectionA.sponsorName} />
              <LineField label="Contact no. :" value={sectionA.contactNo} />
            </View>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>B) Information of the Owner/ Partner/ Directors</Text>
          <View style={{ gap: 6 }}>
            {owners.slice(0, 3).map((owner: Partial<OwnerEntry>, idx) => (
              <View style={styles.row} key={`owner-${idx}`} wrap={false}>
                <InlineField label={`${idx + 1}. Name :`} value={owner.name} flex={1.2} />
                <InlineField label="Nationality :" value={owner.nationality} flex={1} />
                <InlineField label="Position :" value={owner.position} flex={1} />
              </View>
            ))}
            <View style={styles.row}>
              <InlineField label="General Manager's Name :" value={owners[3]?.name} flex={1.2} />
              <InlineField label="Nationality :" value={owners[3]?.nationality} flex={1} />
              <InlineField label="Contact no. :" value={owners[3]?.contactNo} flex={1} />
            </View>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card} wrap={false}>
          <Text style={styles.sectionTitle}>C) Information of the Authorized person to sign LPO</Text>
          <View style={{ gap: 10 }}>
            {padArray<Partial<Signatory>>(sectionC, 2, {}).map((signer: Partial<Signatory>, idx) => (
              <View key={`lpo-${idx}`} style={{ gap: 6 }}>
                <View style={styles.row}>
                  <InlineField label={`${idx + 1}. Name :`} value={signer.name} flex={1.2} />
                  <InlineField label="Designation :" value={signer.designation} flex={1} />
                </View>
                <View style={styles.row}>
                  <SignatureBlock label="Signature :" src={signer.signatureUrl} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.card} wrap={false}>
          <Text style={styles.sectionTitle}>D) Information of the Authorized person to sign Cheques</Text>
          <View style={{ gap: 10 }}>
            {padArray<Partial<Signatory>>(sectionD, 2, {}).map((signer: Partial<Signatory>, idx) => (
              <View key={`cheque-${idx}`} style={{ gap: 6 }}>
                <View style={styles.row}>
                  <InlineField label={`${idx + 1}. Name :`} value={signer.name} flex={1.2} />
                  <InlineField label="Designation :" value={signer.designation} flex={1} />
                </View>
                <View style={styles.row}>
                  <SignatureBlock label="Signature :" src={signer.signatureUrl} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>E) Particulars of person to whom the Invoice to be submitted</Text>
          <View style={{ gap: 8 }}>
            <View style={styles.row}>
              <InlineField label="Name :" value={sectionE.name} flex={1} />
              <InlineField label="Designation :" value={sectionE.designation} flex={1} />
            </View>
            <View style={styles.row}>
              <InlineField label="P.O.Box :" value={sectionE.poBox} flex={1} />
              <InlineField label="Emirate :" value={sectionE.emirate} flex={1} />
              <InlineField label="Location :" value={sectionE.location} flex={1} />
            </View>
            <View style={styles.row}>
              <InlineField label="Contact no. :" value={sectionE.contactNo} flex={1} />
              <InlineField label="Fax no. :" value={sectionE.fax} flex={1} />
              <InlineField label="E-mail :" value={sectionE.email} flex={1} />
            </View>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>F) Particulars of Person who makes the payment (Head of Finance Department)</Text>
          <View style={{ gap: 8 }}>
            <View style={styles.row}>
              <InlineField label="Name :" value={sectionF.name} flex={1} />
              <InlineField label="Designation :" value={sectionF.designation} flex={1} />
            </View>
            <View style={styles.row}>
              <InlineField label="P.O.Box :" value={sectionF.poBox} flex={1} />
              <InlineField label="Emirate :" value={sectionF.emirate} flex={1} />
              <InlineField label="Location :" value={sectionF.location} flex={1} />
            </View>
            <View style={styles.row}>
              <InlineField label="Contact no. :" value={sectionF.contactNo} flex={1} />
              <InlineField label="Fax no. :" value={sectionF.fax} flex={1} />
              <InlineField label="E-mail :" value={sectionF.email} flex={1} />
            </View>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>G) Bank References (Name of the banks you are dealing with)</Text>
          <View style={{ gap: 6 }}>
            {banks.map((bank: Partial<BankReference>, idx) => (
              <View key={`bank-${idx}`} style={styles.row}>
                <InlineField label={`${idx + 1}. Bank & Branch :`} value={bank.bankName} flex={1.3} />
                <InlineField label="A/C no. :" value={bank.accountNo} flex={0.8} />
                <InlineField label="Tel no. :" value={bank.telNo} flex={0.9} />
              </View>
            ))}
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>H) Trade Credit References (Name of Companies you are dealing with on credit)</Text>
          <View style={{ gap: 6 }}>
            {trades.map((trade: Partial<TradeReference>, idx) => (
              <View key={`trade-${idx}`} style={styles.row}>
                <InlineField label={`${idx + 1}.`} value={trade.companyName} flex={1.2} />
                <InlineField label="Since :" value={trade.since} flex={0.8} />
                <InlineField label="Tel no. :" value={trade.telNo} flex={0.8} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>I) Documents Annexed</Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <DocItem label="Trade License" checked={!!uploads.tradeLicenseUrl} />
              <DocItem label="VAT Certificate" checked={!!uploads.vatCertificateUrl} />
            </View>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <DocItem label="Emirates ID Copy (Owners)" checked={!!uploads.emiratesIdOwnersUrl} />
              <DocItem label="Visa Copy (Owners)" checked={!!uploads.visaOwnersUrl} />
            </View>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <DocItem label="Passport Copy (Owners)" checked={!!uploads.passportOwnersUrl} />
              <View style={{ flex: 1 }} />
            </View>
          </View>
        </View>
        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Declaration & Signature</Text>
          <View style={{ gap: 8 }}>
            <Text style={styles.declarationText}>
              I/We believe and assure you that our firm is financially sound enough and able to meet any commitments we have made to pay your invoices according to mutually agreed terms. In this case you may check with our bankers for which we have no objection. We further undertake to abide by the following:
            </Text>
            <View style={styles.bulletList}>
              {[
                "All requests for goods will be made in writing on your company's Letter head / Purchase Order / Authorized Registered Email.",
                "All invoices will be settled as per the credit limit / credit period approved by Diamond Lights General Trading L.L.C. Failure to settle the account as per the credit limit / credit period gives Diamond Lights General Trading L.L.C. the right to take necessary legal action to recover the due amount and the right to repossess the goods without prior notice.",
                "While settle your invoices on due dates no deduction shall be made by us whatsoever, without your written acceptance.",
                "Payment shall be made to you directly without any adjustment of your group of companies' invoices if any. I/We further declare that I/We have read, have understood and hold myself/ourselves legally bound by the conditions laid down on this form. I also confirm contents included in page no. 1 to 2 and those of any authorized attachments there to."
              ].map((text, idx) => (
                <Text key={`bullet-${idx}`} style={styles.bulletItem}>{`${idx + 1}. ${text}`}</Text>
              ))}
            </View>
            <View style={styles.ackRow}>
              <View style={styles.ackBox}>{data.declarationAgreed ? <View style={styles.ackMark} /> : null}</View>
              <Text style={styles.declarationText}>I agree to the above declaration</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.label}>Authorized Signature :</Text>
                <View style={[styles.inlineSignature, { flex: 1 }]}>
                  {uploads.finalSignatureUrl ? (
                    isPdfAsset(uploads.finalSignatureUrl)
                      ? <Text style={styles.subText}>See attached PDF</Text>
                      : <Image src={uploads.finalSignatureUrl} style={styles.inlineImage} />
                  ) : null}
                </View>
              </View>
              <View style={{ width: 120, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.label}>Date :</Text>
                <View style={[styles.inlineSignature, { flex: 1 }]}>
                  {!!data.finalSignatoryDate && <Text style={styles.value}>{data.finalSignatoryDate}</Text>}
                </View>
              </View>
            </View>
            <Text style={[styles.subText, { marginTop: 2 }]}>
              (Please attach a copy of Court attestation of Signature OR Power of Attorney)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.label}>Name :</Text>
                <View style={[styles.inlineSignature, { flex: 1 }]}>
                  {!!data.finalSignatoryName && <Text style={styles.value}>{data.finalSignatoryName}</Text>}
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.label}>Designation :</Text>
                <View style={[styles.inlineSignature, { flex: 1 }]}>
                  {!!data.finalSignatoryDesignation && <Text style={styles.value}>{data.finalSignatoryDesignation}</Text>}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.label}>Company Stamp :</Text>
                <View style={[styles.inlineStamp, { flex: 1 }]}>
                  {uploads.companyStampUrl ? (
                    isPdfAsset(uploads.companyStampUrl)
                      ? <Text style={styles.subText}>See attached PDF</Text>
                      : <Image src={uploads.companyStampUrl} style={styles.inlineImage} />
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
