export enum ClientStatus {
  CREATED = 'CREATED',
  CREDENTIALS_SENT = 'CREDENTIALS_SENT',
  SENT = 'SENT',
  FINISHED = 'FINISHED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  companyName?: string;
}

export interface ClientRecord {
  clientId: string;
  uid: string; // Links to Auth
  email: string;
  companyName: string;
  status: ClientStatus;
  creditRequestStatus?: 'none' | 'requested' | 'approved';
  hasCreditAccess?: boolean;
  createdAt: number;
  updatedAt: number;
  pdfUrl?: string;
}

// --- Form Data Interfaces ---

export interface SectionA {
  companyName: string;
  division: string;
  poBox: string;
  emirate: string;
  location: string;
  telephone: string;
  fax: string;
  email: string;
  natureOfBusiness: string;
  periodInUAE: string;
  legalStatus: string;
  tradeLicenseNo: string;
  tradeLicenseExpiry: string;
  sponsorName: string;
  contactNo: string;
}

export interface OwnerEntry {
  name: string;
  nationality: string;
  position: string; // 1-3 are Owners/Partners, 4 is GM
  isGeneralManager?: boolean;
  contactNo?: string; // Only for GM
}

export interface Signatory {
  name: string;
  designation: string;
  signatureUrl?: string; // Storage URL
  contactNo?: string;
  poBox?: string;
  emirate?: string;
  location?: string;
}

export interface InvoiceContact {
  name: string;
  designation: string;
  poBox: string;
  emirate: string;
  location: string;
  contactNo: string;
  fax: string;
  email: string;
}

export interface BankReference {
  bankName: string;
  accountNo: string;
  telNo: string;
}

export interface TradeReference {
  companyName: string;
  since: string;
  telNo: string;
}

export interface Uploads {
  tradeLicenseUrl?: string;
  chamberCertUrl?: string;
  sponsorPassportUrl?: string;
  attestedSignatureUrl?: string;
  authPassportUrl?: string;
  securityChequeUrl?: string;
  advanceChequeUrl?: string;
  companyStampUrl?: string;
  finalSignatureUrl?: string;
  attestedDocumentUrl?: string;
  creditAttestedDocumentUrl?: string;
  vatCertificateUrl?: string;
  emiratesIdOwnersUrl?: string;
  visaOwnersUrl?: string;
  passportOwnersUrl?: string;
  bankStatementUrl?: string;
}

export interface OfficeUse {
  salesComments: string;
  salesStaffName: string;
  salesDate: string;
  divisionManagerComments: string;
  divisionManagerName: string;
  divisionManagerDate: string;
  financeManagerComments: string;
  approvedCreditLimit: string;
  creditPeriod: string;
}

export interface ClientForm {
  formId: string;
  clientId: string;
  uid: string;
  status: ClientStatus;
  creditApplication?: CreditApplication;
  
  // Sections
  sectionA: SectionA;
  sectionB: OwnerEntry[]; // 4 entries
  sectionC: Signatory[]; // LPO (2 entries)
  sectionD: Signatory[]; // Cheques (2 entries)
  sectionE: InvoiceContact;
  sectionF: InvoiceContact; // Finance Head (Reuse InvoiceContact structure mostly)
  sectionG: BankReference[];
  sectionH: TradeReference[];
  uploads: Uploads;
  
  declarationAgreed: boolean;
  finalSignatoryName: string;
  finalSignatoryDesignation: string;
  finalSignatoryDate: string;

  officeUse?: OfficeUse;

  timestamps: {
    createdAt: number;
    updatedAt: number;
    submittedAt?: number;
  };
}

export interface CreditApplication {
  companyInfo: {
    companyName: string;
    tradingName: string;
    officeAddress: string;
    city: string;
    poBox: string;
    landline: string;
    mobile: string;
    email: string;
    website: string;
  };
  businessDetails: {
    typeOfBusiness: string;
    yearEstablished: string;
    numberOfEmployees: string;
    natureOfBusiness: string;
    authorizedSignatoryName: string;
    designation: string;
    mobile: string;
    email: string;
  };
  creditRequest: {
    creditLimitAed: string;
    preferredPaymentTerms: string;
    estimatedMonthlyPurchases: string;
  };
  bankDetails: {
    bankName: string;
    branch: string;
    accountName: string;
    accountNumber: string;
    iban: string;
  };
  tradeReferences: Array<{
    companyName: string;
    contactPerson: string;
    mobile: string;
    email: string;
  }>;
  documents: {
    tradeLicenseUrl?: string;
    vatCertificateUrl?: string;
    emiratesIdUrl?: string;
    visaCopyUrl?: string;
    passportCopyUrl?: string;
    bankStatementUrl?: string;
  };
  questionnaire: {
    hasCreditFacilities?: boolean;
    creditFacilitiesDetails?: string;
    hasDefaultedPayments?: boolean;
    defaultedPaymentsDetails?: string;
    purchaseOrdersBeforeDelivery?: boolean;
    financiallyStable?: boolean;
    preferredCommunication: string;
  };
  declaration: {
    agreed: boolean;
    name: string;
    designation: string;
    signatureUrl?: string;
    date: string;
  };
}
