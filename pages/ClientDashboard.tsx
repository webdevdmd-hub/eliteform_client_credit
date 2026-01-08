import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { ClientForm, ClientStatus, CreditApplication } from '../types';
import { Button, Card, Checkbox } from '../components/ui/Components';
import { FileUpload } from '../components/form/FileUpload';
import { SignaturePad } from '../components/form/SignaturePad';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PDFDocument } from '../components/PDFDocument';
import { CreditPDFDocument } from '../components/CreditPDFDocument';
import { ClipboardList, FileText, Lock, LogOut, Menu } from 'lucide-react';
import { saveCreditDraft, submitCreditApplication } from '../services/creditApplication';
import dmdLogo from '../components/assets/dmd-logo.png';

const steps = ['Company', 'Owners', 'LPO & Cheques', 'Invoice & Finance', 'References', 'Documents', 'Review'];

export const ClientDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ClientForm | null>(null);
  const [formDocId, setFormDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<ClientForm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditRequestStatus, setCreditRequestStatus] = useState<'none' | 'requested' | 'approved'>('none');
  const [hasCreditAccess, setHasCreditAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'client' | 'credit'>('client');
  const [creditDocId, setCreditDocId] = useState<string | null>(null);
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditLastSaved, setCreditLastSaved] = useState<Date | null>(null);
  const [creditMessage, setCreditMessage] = useState<string | null>(null);
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const [creditSubmitted, setCreditSubmitted] = useState(false);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [regReopenStatus, setRegReopenStatus] = useState<string | null>(null);
  const [creditReopenStatus, setCreditReopenStatus] = useState<string | null>(null);
  const stripDeprecatedFields = (input: any) => {
    if (!input?.sectionA) return input;
    const { chamberCertNo, chamberCertExpiry, ...restSectionA } = input.sectionA;
    return { ...input, sectionA: restSectionA };
  };
  const sanitizeForFirestore = (input: any): any => {
    if (input === undefined) return null;
    if (Array.isArray(input)) return input.map(sanitizeForFirestore);
    if (input && typeof input === 'object') {
      const out: any = {};
      Object.keys(input).forEach((k) => {
        const val = sanitizeForFirestore(input[k]);
        if (val !== undefined) out[k] = val;
      });
      return out;
    }
    return input;
  };

  const applyRegistrationDocs = (creditApp: CreditApplication, uploads?: ClientForm['uploads']): CreditApplication => {
    const docs = creditApp.documents || ({} as any);
    return {
      ...creditApp,
      documents: {
        ...docs,
        tradeLicenseUrl: docs.tradeLicenseUrl || uploads?.tradeLicenseUrl,
        vatCertificateUrl: docs.vatCertificateUrl || uploads?.vatCertificateUrl,
        emiratesIdUrl: docs.emiratesIdUrl || uploads?.emiratesIdOwnersUrl,
        visaCopyUrl: docs.visaCopyUrl || uploads?.visaOwnersUrl,
        passportCopyUrl: docs.passportCopyUrl || uploads?.passportOwnersUrl || uploads?.sponsorPassportUrl,
        bankStatementUrl: docs.bankStatementUrl || uploads?.bankStatementUrl
      }
    };
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const methods = useForm<ClientForm>();
  const { register, control, handleSubmit, reset, watch, setValue, trigger, formState: { errors, isDirty } } = methods;
  
  // Field Arrays for dynamic sections
  const owners = useFieldArray({ control, name: "sectionB" });
  const lpo = useFieldArray({ control, name: "sectionC" });
  const cheques = useFieldArray({ control, name: "sectionD" });
  const bankRefs = useFieldArray({ control, name: "sectionG" });
  const tradeRefs = useFieldArray({ control, name: "sectionH" });
  const creditRefs = useFieldArray({ control, name: "creditApplication.tradeReferences" });
  
  // Watch form data for auto-save
  const watchedData = watch();

  // Load initial data
  useEffect(() => {
    const buildCreditDefaults = (data: ClientForm): CreditApplication => {
      const sectionA = data.sectionA || ({} as any);
      const tradeReferenceDefaults = (data.sectionH || []).slice(0, 2).map(ref => ({
        companyName: ref.companyName || "",
        contactPerson: ref.companyName ? `${ref.companyName} Contact` : "",
        mobile: ref.telNo || "",
        email: ""
      }));

      return applyRegistrationDocs({
        companyInfo: {
          companyName: sectionA.companyName || "",
          tradingName: "",
          officeAddress: sectionA.location || "",
          city: sectionA.emirate || "",
          poBox: sectionA.poBox || "",
          landline: sectionA.telephone || "",
          mobile: sectionA.contactNo || "",
          email: sectionA.email || "",
          website: ""
        },
        businessDetails: {
          typeOfBusiness: sectionA.natureOfBusiness || "",
          yearEstablished: sectionA.periodInUAE || "",
          numberOfEmployees: "",
          natureOfBusiness: sectionA.natureOfBusiness || "",
          authorizedSignatoryName: data.sectionC?.[0]?.name || "",
          designation: data.sectionC?.[0]?.designation || "",
          mobile: data.sectionC?.[0]?.contactNo || "",
          email: data.sectionC?.[0]?.signatureUrl ? "" : ""
        },
        creditRequest: {
          creditLimitAed: "",
          preferredPaymentTerms: "",
          estimatedMonthlyPurchases: ""
        },
        bankDetails: {
          bankName: "",
          branch: "",
          accountName: "",
          accountNumber: "",
          iban: ""
        },
        tradeReferences: tradeReferenceDefaults.length ? tradeReferenceDefaults : [
          { companyName: "", contactPerson: "", mobile: "", email: "" },
          { companyName: "", contactPerson: "", mobile: "", email: "" }
        ],
        documents: {
          tradeLicenseUrl: data.uploads?.tradeLicenseUrl,
          vatCertificateUrl: data.uploads?.vatCertificateUrl,
          emiratesIdUrl: data.uploads?.emiratesIdOwnersUrl,
          visaCopyUrl: data.uploads?.visaOwnersUrl,
          passportCopyUrl: data.uploads?.passportOwnersUrl || data.uploads?.sponsorPassportUrl,
          bankStatementUrl: data.uploads?.bankStatementUrl
        } as any,
        questionnaire: {
          hasCreditFacilities: undefined,
          creditFacilitiesDetails: "",
          hasDefaultedPayments: undefined,
          defaultedPaymentsDetails: "",
          purchaseOrdersBeforeDelivery: undefined,
          financiallyStable: undefined,
          preferredCommunication: ""
        },
        declaration: {
          agreed: false,
          name: "",
          designation: "",
          signatureUrl: "",
          date: getTodayDate()
        }
      }, data.uploads);
    };

    const loadData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const clientProfileRef = db.collection('clients').doc(user.uid);
        const clientProfile = await clientProfileRef.get();
        
        if (clientProfile.exists) {
           const profileData = clientProfile.data();
           setCreditRequestStatus(profileData?.creditRequestStatus || 'none');
           setHasCreditAccess(profileData?.hasCreditAccess || false);
           setRegReopenStatus(profileData?.reopenStatus || null);
           setCreditReopenStatus(profileData?.creditReopenStatus || null);
           // Update status to SENT if it was CREDENTIALS_SENT
           if (profileData?.status === ClientStatus.CREDENTIALS_SENT) {
              await clientProfileRef.update({ status: ClientStatus.SENT });
           }

           const formRef = db.collection('client_forms').doc(user.uid);
           const formSnap = await formRef.get();
           if (formSnap.exists) {
             setFormDocId(formSnap.id);
             const data = stripDeprecatedFields(formSnap.data()) as ClientForm;
             if (!data.creditApplication) {
               data.creditApplication = buildCreditDefaults(data);
             } else {
               data.creditApplication = applyRegistrationDocs(data.creditApplication, data.uploads);
             }
             const registrationSignatures = [
               data.uploads?.finalSignatureUrl,
               data.uploads?.companyStampUrl,
               ...(data.sectionC || []).map((entry) => entry?.signatureUrl),
               ...(data.sectionD || []).map((entry) => entry?.signatureUrl)
             ].filter(Boolean) as string[];
             if (data.creditApplication?.declaration?.signatureUrl && registrationSignatures.includes(data.creditApplication.declaration.signatureUrl)) {
               data.creditApplication.declaration.signatureUrl = '';
             }
             setFormData(data);
             reset(data); // Populate form
             if (!data.finalSignatoryDate) {
               setValue('finalSignatoryDate', getTodayDate(), { shouldDirty: true });
             }
             if (!data.creditApplication?.declaration?.date) {
               setValue('creditApplication.declaration.date', getTodayDate(), { shouldDirty: true });
             }
           } else {
             setError("Form data not found.");
           }
        } else {
           setError("Client profile not found.");
        }
      } catch (err: any) {
        console.error("Load Data Error", err);
        setError("Failed to load data: " + err.message + " (Check Permissions)");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [reset, setValue]);

  useEffect(() => {
    if (owners.fields.length > 0) return;
    owners.append(
      Array.from({ length: 4 }, (_, index) => ({
        name: "",
        nationality: "",
        position: "",
        isGeneralManager: index === 3,
        contactNo: ""
      })),
      { shouldFocus: false }
    );
  }, [owners]);

  useEffect(() => {
    if (lpo.fields.length > 0) return;
    lpo.append(
      Array.from({ length: 2 }, () => ({
        name: "",
        designation: "",
        signatureUrl: ""
      })),
      { shouldFocus: false }
    );
  }, [lpo]);

  useEffect(() => {
    if (cheques.fields.length > 0) return;
    cheques.append(
      Array.from({ length: 2 }, () => ({
        name: "",
        designation: "",
        signatureUrl: ""
      })),
      { shouldFocus: false }
    );
  }, [cheques]);

  useEffect(() => {
    if (bankRefs.fields.length > 0) return;
    bankRefs.append(
      Array.from({ length: 2 }, () => ({
        bankName: "",
        accountNo: "",
        telNo: ""
      })),
      { shouldFocus: false }
    );
  }, [bankRefs]);

  useEffect(() => {
    if (tradeRefs.fields.length > 0) return;
    tradeRefs.append(
      Array.from({ length: 2 }, () => ({
        companyName: "",
        since: "",
        telNo: ""
      })),
      { shouldFocus: false }
    );
  }, [tradeRefs]);

  useEffect(() => {
    if (creditRefs.fields.length > 0) return;
    creditRefs.append(
      Array.from({ length: 2 }, () => ({
        companyName: "",
        contactPerson: "",
        mobile: "",
        email: ""
      })),
      { shouldFocus: false }
    );
  }, [creditRefs]);

  // Load credit application doc separately when access is granted
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !hasCreditAccess) return;
    const loadCredit = async () => {
      try {
        const ref = db.collection('credit_applications').doc(user.uid);
        const snap = await ref.get();
        if (snap.exists) {
          const data = snap.data();
          setCreditDocId(snap.id);
          setCreditSubmitted(data?.status === 'submitted');
          if (data?.creditApplication) {
            const merged = applyRegistrationDocs(data.creditApplication as CreditApplication, watch('uploads') as any);
            reset((prev) => ({ ...(prev as any), creditApplication: merged }));
            if (!merged?.declaration?.date) {
              setValue('creditApplication.declaration.date', getTodayDate(), { shouldDirty: true });
            }
          }
        } else {
          setCreditSubmitted(false);
        }
      } catch (err: any) {
        const msg = err?.message || '';
        if (err?.code === 'permission-denied' || /insufficient permissions/i.test(msg)) {
          setCreditMessage('You do not have permission to view the credit application. Please request access from Admin.');
        } else {
          setCreditMessage('Unable to load credit application. Please try again or contact support.');
        }
      }
    };
    loadCredit();
  }, [reset, hasCreditAccess]);


  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = db.collection('clients').doc(user.uid).onSnapshot(
      (snap) => {
        const data = snap.data();
        setCreditRequestStatus((data?.creditRequestStatus as any) || 'none');
        setHasCreditAccess(!!data?.hasCreditAccess);
      },
      (err) => console.error("Credit access listener error:", err)
    );
    return () => unsub();
  }, []);

  const onSaveDraft = async (data: ClientForm) => {
    if (!formDocId) return;
    setIsSaving(true);
    try {
      const cleaned = sanitizeForFirestore(stripDeprecatedFields(data));
      await db.collection('client_forms').doc(formDocId).update({
        ...cleaned,
        'timestamps.updatedAt': Date.now()
      });
      setLastSaved(new Date());
      setCreditMessage(null);
    } catch (err: any) {
      setCreditMessage("Failed to save draft: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAttempt = handleSubmit(
    (data) => {
      setPendingSubmitData(data);
      setShowSubmitConfirm(true);
    },
    (formErrors) => {
      const first = getFirstErrorPath(formErrors);
      const step = getStepForPath(first);
      if (step !== null) setCurrentStep(step);
    }
  );

  const requestCreditForm = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await db.collection('clients').doc(user.uid).update({
        creditRequestStatus: 'requested',
        updatedAt: Date.now()
      });
      setCreditRequestStatus('requested');
      alert('Credit application access requested. An admin will review your request.');
    } catch (err: any) {
      alert('Failed to request credit form: ' + err.message);
    }
  };

  const onSubmitFinal = async (data: ClientForm) => {
    const cleanedData = stripDeprecatedFields(data);
    if (!data.declarationAgreed) {
      alert("Please agree to the declaration.");
      return;
    }
    if (!formDocId) return;
    
    try {
      const cleaned = sanitizeForFirestore(cleanedData);
      await db.collection('client_forms').doc(formDocId).update({
        ...cleaned,
        status: ClientStatus.FINISHED,
        'timestamps.submittedAt': Date.now()
      });
      
      const user = auth.currentUser;
      if (user) await db.collection('clients').doc(user.uid).update({ status: ClientStatus.FINISHED });

      setFormData(prev => {
        const base = prev || cleanedData;
        return {
          ...base,
          ...cleanedData,
          status: ClientStatus.FINISHED,
          timestamps: {
            ...(base.timestamps || cleanedData.timestamps || {}),
            submittedAt: Date.now()
          }
        };
      });
      setCurrentStep(6);
    } catch (err: any) {
      alert("Failed to submit: " + err.message);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!pendingSubmitData) return;
    setIsSubmitting(true);
    await onSubmitFinal(pendingSubmitData);
    setIsSubmitting(false);
    setShowSubmitConfirm(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-800 p-6 rounded-lg max-w-lg text-center border border-red-200">
           <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
           <p className="mb-4">{error}</p>
           <Button variant="ghost" onClick={() => signOut(auth)}><LogOut className="w-4 h-4 mr-2"/> Logout</Button>
        </div>
      </div>
    );
  }

  if (!formData) return <div className="p-8">No form assigned. Contact Admin.</div>;

  const isLocked = formData.status === ClientStatus.FINISHED;
  const clientId = auth.currentUser?.uid || 'unknown';
  const lineInputClass =
    "min-w-0 flex-1 border-b border-dashed border-stone-400 bg-transparent px-2 py-1 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-700";
  const resolveErrorPath = (path: string) => path.split('.').reduce((acc: any, key) => (acc ? acc[key] : undefined), errors as any);
  const getErrorMessage = (path: string) => {
    const err = resolveErrorPath(path);
    if (!err) return '';
    if (Array.isArray(err)) return '';
    return err.message || '';
  };
  const renderError = (path: string) => {
    const message = getErrorMessage(path);
    return message ? <p className="text-xs text-red-600 mt-1">{message}</p> : null;
  };
  const stepValidationMap: Record<number, string[]> = {
    0: ['sectionA.companyName', 'sectionA.email', 'sectionA.tradeLicenseNo'],
    5: [
      'uploads.tradeLicenseUrl',
      'uploads.vatCertificateUrl',
      'uploads.emiratesIdOwnersUrl',
      'uploads.visaOwnersUrl',
      'uploads.passportOwnersUrl'
    ],
    6: ['declarationAgreed', 'finalSignatoryDate', 'finalSignatoryName', 'finalSignatoryDesignation']
  };
  const handleNextStep = async () => {
    const fields = stepValidationMap[currentStep];
    if (fields?.length) {
      const valid = await trigger(fields as any, { shouldFocus: true });
      if (!valid) return;
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };
  const getFirstErrorPath = (errObj: any, prefix = ''): string | null => {
    for (const key of Object.keys(errObj)) {
      const value = errObj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      if (value?.type) return path;
      if (value && typeof value === 'object') {
        const deeper = getFirstErrorPath(value, path);
        if (deeper) return deeper;
      }
    }
    return null;
  };
  const getStepForPath = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('sectionA')) return 0;
    if (path.startsWith('sectionB')) return 1;
    if (path.startsWith('sectionC') || path.startsWith('sectionD')) return 2;
    if (path.startsWith('sectionE') || path.startsWith('sectionF')) return 3;
    if (path.startsWith('sectionG') || path.startsWith('sectionH')) return 4;
    if (path.startsWith('uploads')) return 5;
    if (path.startsWith('final') || path.startsWith('declaration')) return 6;
    return null;
  };

  const requestReopen = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await db.collection('clients').doc(user.uid).update({
        reopenStatus: 'REG_REOPEN_PENDING',
        updatedAt: Date.now()
      });
      setRegReopenStatus('REG_REOPEN_PENDING');
      alert('Request sent. Our team will review and reopen your registration form.');
    } catch (err: any) {
      alert('Failed to send request: ' + err.message);
    }
  };

  const requestCreditReopen = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await db.collection('clients').doc(user.uid).update({
        creditReopenStatus: 'CREDIT_REOPEN_PENDING',
        updatedAt: Date.now()
      });
      await db.collection('credit_applications').doc(user.uid).set({
        reopenRequested: true,
        status: 'submitted'
      }, { merge: true });
      setCreditReopenStatus('CREDIT_REOPEN_PENDING');
      alert('Request sent. Our team will review and reopen your credit application.');
    } catch (err: any) {
      alert('Failed to send request: ' + err.message);
    }
  };

  const registrationUploads = watch('uploads') || ({} as ClientForm['uploads']);
  const creditDocs = watch('creditApplication.documents') || ({} as any);
  const resolvedCreditDocs = {
    tradeLicenseUrl: creditDocs.tradeLicenseUrl || registrationUploads?.tradeLicenseUrl,
    vatCertificateUrl: creditDocs.vatCertificateUrl || registrationUploads?.vatCertificateUrl,
    emiratesIdUrl: creditDocs.emiratesIdUrl || registrationUploads?.emiratesIdOwnersUrl,
    visaCopyUrl: creditDocs.visaCopyUrl || registrationUploads?.visaOwnersUrl,
    passportCopyUrl: creditDocs.passportCopyUrl || registrationUploads?.passportOwnersUrl || registrationUploads?.sponsorPassportUrl,
    bankStatementUrl: creditDocs.bankStatementUrl || registrationUploads?.bankStatementUrl
  };

  const saveCreditApplication = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setCreditSaving(true);
      const creditData = sanitizeForFirestore(
        applyRegistrationDocs(watch('creditApplication') as CreditApplication, registrationUploads)
      ) as CreditApplication;
      const docId = await saveCreditDraft({
        userId: user.uid,
        creditApplication: creditData,
        creditDocId,
      });
      setCreditDocId(docId);
      setCreditLastSaved(new Date());
      setCreditMessage('Credit application saved.');
    } catch (err: any) {
      setCreditMessage('Failed to save credit application: ' + err.message);
    } finally {
      setCreditSaving(false);
    }
  };

  const handleCreditSubmit = async () => {
    setCreditSubmitting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const creditData = sanitizeForFirestore(
          applyRegistrationDocs(watch('creditApplication') as CreditApplication, registrationUploads)
        ) as CreditApplication;
        const docId = await submitCreditApplication({
          userId: user.uid,
          creditApplication: creditData,
          creditDocId
        });
        setCreditDocId(docId);
      }
      setCreditSubmitted(true);
      setCreditMessage('Credit application submitted. You can download your PDF below.');
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      if (/permission/i.test(msg)) {
        setCreditMessage('Failed to submit credit application: Missing or insufficient permissions. Please contact admin to grant credit access.');
      } else {
        setCreditMessage('Failed to submit credit application: ' + msg);
      }
    } finally {
      setShowCreditConfirm(false);
      setCreditSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-stone-50">
      <button
        type="button"
        aria-label="Toggle navigation"
        className="lg:hidden px-4 py-3 flex items-center gap-2 text-stone-700"
        onClick={() => setShowNav(true)}
      >
        <Menu className="w-5 h-5" /> Menu
      </button>
      <aside
        className={`w-64 bg-white border-r border-stone-200 flex flex-col lg:sticky lg:top-0 lg:h-screen fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ${
          showNav ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-4 py-5 flex items-center justify-between">
          <img src={dmdLogo} alt="DMD Logo" className="h-10 w-auto" />
          <span className="text-[10px] uppercase tracking-wide text-stone-500">Registration</span>
        </div>
        <div className="px-4 pb-4">
          <h2 className="text-lg font-semibold text-stone-800">Registration</h2>
          <p className="text-xs text-stone-500 mt-1">Complete each stage</p>
        </div>
        <nav className="flex-1">
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors ${activeTab === 'client' ? 'bg-stone-100 border-stone-800 text-stone-900' : 'border-transparent text-stone-600 hover:bg-stone-50'}`}
            onClick={() => {
              setActiveTab('client');
              setShowNav(false);
            }}
          >
            <FileText className="w-4 h-4" />
            Client Registration
          </button>
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors ${activeTab === 'credit' ? 'bg-stone-100 border-stone-800 text-stone-900' : 'border-transparent text-stone-600 hover:bg-stone-50'} ${!hasCreditAccess ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (!hasCreditAccess) {
                alert('Credit Application is locked. Please request access from Admin.');
                return;
              }
              setActiveTab('credit');
              setShowNav(false);
            }}
            disabled={!hasCreditAccess}
            title={!hasCreditAccess ? 'Please complete registration and request access from Admin.' : ''}
          >
            {hasCreditAccess ? <ClipboardList className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            Credit Application
          </button>
        </nav>
        {!hasCreditAccess && (
          <div className="px-4 py-4 text-xs text-stone-600 border-t border-stone-200">
            <div className="flex items-center gap-2 font-semibold text-stone-800">
              <Lock className="w-4 h-4" /> Credit Form Locked
            </div>
            <p className="mt-1 text-stone-500">Request access after submitting registration.</p>
          </div>
        )}
      </aside>
      {showNav && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setShowNav(false)}
        />
      )}

      {/* Use padding instead of margin so the header spans full width while clearing the sidebar */}
      <div className="flex-1 lg:pl-64">
        <div className="min-h-screen pb-20">
          <header className="bg-transparent sticky top-0 z-20 w-full">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-h-[88px]">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Stage</p>
                <h1 className="text-xl font-bold text-stone-800">
                  {activeTab === 'client' ? 'Client Information' : 'Credit Application'}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center sm:justify-end">
                {activeTab === 'client' && isLocked && (
                  <PDFDownloadLink document={<PDFDocument data={watch()} />} fileName="registration.pdf">
                    {({ loading }) => (
                      <Button variant="outline" disabled={loading} className="w-full sm:w-auto">Download Registration PDF</Button>
                    )}
                  </PDFDownloadLink>
                )}
                {activeTab === 'credit' && (
                  <PDFDownloadLink document={<CreditPDFDocument data={watch('creditApplication')} />} fileName="credit-application.pdf">
                    {({ loading }) => (
                      <Button variant="outline" disabled={loading} className="w-full sm:w-auto">
                        {loading ? 'Generating PDF...' : 'Download Credit Application PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                )}
                <Button variant="ghost" onClick={() => signOut(auth)} className="w-full sm:w-auto"><LogOut className="w-4 h-4 mr-2"/> Logout</Button>
              </div>
            </div>
          </header>

          {!isLocked && activeTab === 'client' && (
            <div className="max-w-5xl mx-auto lg:mx-0 mt-8 px-4 sm:px-6 lg:pr-8 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {steps.map((s, i) => {
                  const isBlocked = false;
                  const isActive = currentStep === i;
                  const isComplete = i < currentStep;
                  return (
                    <div key={i} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                      <div
                        onClick={() => {
                          if (isBlocked) return;
                          setCurrentStep(i);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isBlocked
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            : 'cursor-pointer ' + (isActive ? 'bg-stone-800 text-white' : isComplete ? 'bg-green-600 text-white' : 'bg-stone-200 text-stone-500')
                        }`}
                        title={isBlocked ? 'Locked until admin authorizes credit form' : s}
                      >
                        {i + 1}
                      </div>
                      {i < steps.length - 1 && <div className={`h-0.5 w-8 mx-2 ${isComplete ? 'bg-green-600' : 'bg-stone-200'}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="text-center font-semibold mt-2 text-stone-700 flex items-center justify-center gap-2">
                {steps[currentStep]}
              </div>
            </div>
          )}

          {activeTab === 'client' && (
          <main className="max-w-5xl mx-auto lg:mx-0 mt-8 px-4 sm:px-6 lg:pr-8">
            <FormProvider {...methods}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                {isLocked ? (
                    <div className="text-center py-20">
                      <div className="text-5xl mb-4">🎉</div>
                      <h2 className="text-2xl font-bold text-stone-800">Submission Received</h2>
                      <p className="text-stone-600 mt-2">Thank you. We have received your registration and will confirm the next steps shortly.</p>
                      <p className="text-sm text-stone-500 mt-2">If you need to make any edits, please contact our team and we will reopen the form for you.</p>
                      <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="w-full max-w-md text-left space-y-2 border border-stone-200 rounded-lg p-4 bg-white">
                          <div className="font-semibold text-stone-800">Upload Attested Document</div>
                          <p className="text-sm text-stone-600">Please upload the signed & stamped PDF (mandatory).</p>
                          <FileUpload
                            label="Upload Attested Document"
                            required
                            path={`clients/${clientId}/attestedDocument`}
                            currentUrl={watch('uploads.attestedDocumentUrl')}
                            onUploadComplete={async (url) => {
                              setValue('uploads.attestedDocumentUrl', url, { shouldDirty: false });
                              if (formDocId) {
                                await db.collection('client_forms').doc(formDocId).update({
                                  'uploads.attestedDocumentUrl': url,
                                  'timestamps.updatedAt': Date.now()
                                });
                              }
                            }}
                          />
                        </div>
                        {regReopenStatus !== 'REG_REOPEN_PENDING' && (
                          <Button variant="outline" className="w-full sm:w-auto" onClick={requestReopen}>
                            Request Reopen for Edits
                          </Button>
                        )}
                        {regReopenStatus === 'REG_REOPEN_PENDING' && (
                          <span className="text-sm text-stone-600">Reopen request sent. We will notify you once it is processed.</span>
                        )}
                        {creditRequestStatus === 'none' && !hasCreditAccess && (
                          <Button onClick={requestCreditForm} className="w-full sm:w-auto">Request Credit Application</Button>
                        )}
                        {creditRequestStatus === 'requested' && !hasCreditAccess && (
                          <span className="text-sm text-stone-600">Credit application requested. Waiting for admin approval.</span>
                        )}
                        {hasCreditAccess && (
                          <span className="text-sm text-green-700">Credit application enabled. You can access it from the sidebar.</span>
                        )}
                      </div>
                  </div>
                ) : (
                  <>
                    {/* Step 0: Company Info */}
                    {currentStep === 0 && (
                      <Card>
                        <div className="mb-5 text-sm font-semibold text-lime-700">A) Company Information</div>
                        <div className="space-y-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label htmlFor="companyName" className="text-sm text-stone-700 md:w-48">Name of the Company :</label>
                            <input
                              id="companyName"
                              className={lineInputClass}
                              {...register('sectionA.companyName', { required: 'Company name is required' })}
                            />
                            {renderError('sectionA.companyName')}
                          </div>

                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label htmlFor="division" className="text-sm text-stone-700 md:w-48">Division :</label>
                            <input id="division" className={lineInputClass} {...register('sectionA.division')} />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="poBox" className="text-sm text-stone-700 md:w-32">P.O. Box :</label>
                              <input id="poBox" className={lineInputClass} {...register('sectionA.poBox')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="emirate" className="text-sm text-stone-700 md:w-28">Emirate :</label>
                              <input id="emirate" className={lineInputClass} {...register('sectionA.emirate')} />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label htmlFor="location" className="text-sm text-stone-700 md:w-48">Location :</label>
                            <input id="location" className={lineInputClass} {...register('sectionA.location')} />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="telephone" className="text-sm text-stone-700 md:w-24">Telephone :</label>
                              <input id="telephone" type="tel" className={lineInputClass} {...register('sectionA.telephone')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="fax" className="text-sm text-stone-700 md:w-16">Fax :</label>
                              <input id="fax" type="tel" className={lineInputClass} {...register('sectionA.fax')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="email" className="text-sm text-stone-700 md:w-16">E-mail :</label>
                              <input id="email" type="email" className={lineInputClass} {...register('sectionA.email', { required: 'Email is required' })} />
                            </div>
                            {renderError('sectionA.email')}
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="natureOfBusiness" className="text-sm text-stone-700 md:w-48">Nature of Business :</label>
                              <input id="natureOfBusiness" className={lineInputClass} {...register('sectionA.natureOfBusiness')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="periodInUAE" className="text-sm text-stone-700 md:w-52">Period of Business in UAE :</label>
                              <input id="periodInUAE" className={lineInputClass} {...register('sectionA.periodInUAE')} />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label htmlFor="legalStatus" className="text-sm text-stone-700 md:w-48">Legal Status :</label>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <input id="legalStatus" className={lineInputClass} {...register('sectionA.legalStatus')} />
                              <span className="text-xs text-stone-500">(Sole Proprietor / Partnership / LLC / FZCO / FZCE / Others)</span>
                            </div>
                          </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="tradeLicenseNo" className="text-sm text-stone-700 md:w-48">Trade License No :</label>
                                <input id="tradeLicenseNo" className={lineInputClass} {...register('sectionA.tradeLicenseNo', { required: 'Trade license number is required' })} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="tradeLicenseExpiry" className="text-sm text-stone-700 md:w-28">Expiry Date :</label>
                                <input id="tradeLicenseExpiry" type="date" className={lineInputClass} {...register('sectionA.tradeLicenseExpiry')} />
                              </div>
                            </div>
                            {renderError('sectionA.tradeLicenseNo')}

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="sponsorName" className="text-sm text-stone-700 md:w-48">Sponsor Name :</label>
                              <input id="sponsorName" className={lineInputClass} {...register('sectionA.sponsorName')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label htmlFor="contactNo" className="text-sm text-stone-700 md:w-28">Contact no. :</label>
                              <input id="contactNo" type="tel" className={lineInputClass} {...register('sectionA.contactNo')} />
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Step 1: Owners */}
                    {currentStep === 1 && (
                      <Card>
                        <div className="mb-5 text-sm font-semibold text-lime-700">B) Information of the Owner/ Partner/ Directors</div>
                        <div className="space-y-5">
                          {owners.fields.map((field, index) => {
                            const isGeneralManager = index === 3;
                            const nameLabel = isGeneralManager ? "General Manager's Name" : `${index + 1}. Name`;
                            return (
                              <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:items-center">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`owner-name-${index}`} className="text-sm text-stone-700 md:w-48">{nameLabel} :</label>
                                  <input
                                    id={`owner-name-${index}`}
                                    className={`${lineInputClass} md:max-w-none`}
                                    {...register(`sectionB.${index}.name` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`owner-nationality-${index}`} className="text-sm text-stone-700 md:w-32">Nationality :</label>
                                  <input
                                    id={`owner-nationality-${index}`}
                                    className={`${lineInputClass} md:max-w-none`}
                                    {...register(`sectionB.${index}.nationality` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:col-span-2">
                                  <label
                                    htmlFor={`owner-${isGeneralManager ? "contact" : "position"}-${index}`}
                                    className="text-sm text-stone-700 md:w-32"
                                  >
                                    {isGeneralManager ? "Contact no." : "Position"} :
                                  </label>
                                  <input
                                    id={`owner-${isGeneralManager ? "contact" : "position"}-${index}`}
                                    className={`${lineInputClass} md:max-w-none`}
                                    {...register(
                                      isGeneralManager
                                        ? (`sectionB.${index}.contactNo` as const)
                                        : (`sectionB.${index}.position` as const)
                                    )}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}

                    {/* Step 2: LPO & Cheques */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <Card>
                          <div className="mb-5 text-sm font-semibold text-lime-700">C) Information of the Authorized person to sign LPO</div>
                          <div className="space-y-3">
                            {lpo.fields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_0.7fr_0.9fr] md:items-center">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`lpo-name-${index}`} className="text-sm text-stone-700 md:w-24">{index + 1}. Name :</label>
                                  <input
                                    id={`lpo-name-${index}`}
                                    className={lineInputClass}
                                    {...register(`sectionC.${index}.name` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`lpo-designation-${index}`} className="text-sm text-stone-700 md:w-28">Designation :</label>
                                  <input
                                    id={`lpo-designation-${index}`}
                                    className={lineInputClass}
                                    {...register(`sectionC.${index}.designation` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:col-span-3">
                                  <label className="text-sm text-stone-700 md:w-20 md:pt-2">Signature :</label>
                                  <div className="min-w-0 flex-1">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                      <SignaturePad
                                        label="Draw signature"
                                        value={watch(`sectionC.${index}.signatureUrl` as const)}
                                        onChange={(dataUrl) => setValue(`sectionC.${index}.signatureUrl` as const, dataUrl, { shouldDirty: true })}
                                        disabled={isLocked}
                                        height={110}
                                      />
                                      <FileUpload
                                        label="Upload signature (image or PDF)"
                                        path={`clients/${clientId}/signatures/lpo-${index + 1}`}
                                        onUploadComplete={(url) => setValue(`sectionC.${index}.signatureUrl` as const, url, { shouldDirty: true })}
                                        currentUrl={watch(`sectionC.${index}.signatureUrl` as const)}
                                        accept="image/*,.pdf"
                                        disabled={isLocked}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card>
                          <div className="mb-5 text-sm font-semibold text-lime-700">D) Information of the Authorized person to sign Cheques</div>
                          <div className="space-y-3">
                            {cheques.fields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_0.7fr_0.9fr] md:items-center">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`cheque-name-${index}`} className="text-sm text-stone-700 md:w-24">{index + 1}. Name :</label>
                                  <input
                                    id={`cheque-name-${index}`}
                                    className={lineInputClass}
                                    {...register(`sectionD.${index}.name` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`cheque-designation-${index}`} className="text-sm text-stone-700 md:w-28">Designation :</label>
                                  <input
                                    id={`cheque-designation-${index}`}
                                    className={lineInputClass}
                                    {...register(`sectionD.${index}.designation` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:col-span-3">
                                  <label className="text-sm text-stone-700 md:w-20 md:pt-2">Signature :</label>
                                  <div className="min-w-0 flex-1">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                      <SignaturePad
                                        label="Draw signature"
                                        value={watch(`sectionD.${index}.signatureUrl` as const)}
                                        onChange={(dataUrl) => setValue(`sectionD.${index}.signatureUrl` as const, dataUrl, { shouldDirty: true })}
                                        disabled={isLocked}
                                        height={110}
                                      />
                                      <FileUpload
                                        label="Upload signature (image or PDF)"
                                        path={`clients/${clientId}/signatures/cheque-${index + 1}`}
                                        onUploadComplete={(url) => setValue(`sectionD.${index}.signatureUrl` as const, url, { shouldDirty: true })}
                                        currentUrl={watch(`sectionD.${index}.signatureUrl` as const)}
                                        accept="image/*,.pdf"
                                        disabled={isLocked}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Step 3: Invoice & Finance */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <Card>
                          <div className="mb-5 text-sm font-semibold text-lime-700">E) Particulars of person to whom the Invoice to be submitted</div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-name" className="text-sm text-stone-700 md:w-20">Name :</label>
                                <input id="invoice-name" className={lineInputClass} {...register('sectionE.name')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-designation" className="text-sm text-stone-700 md:w-28">Designation :</label>
                                <input id="invoice-designation" className={lineInputClass} {...register('sectionE.designation')} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-poBox" className="text-sm text-stone-700 md:w-20">P.O.Box :</label>
                                <input id="invoice-poBox" className={lineInputClass} {...register('sectionE.poBox')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-emirate" className="text-sm text-stone-700 md:w-20">Emirate :</label>
                                <input id="invoice-emirate" className={lineInputClass} {...register('sectionE.emirate')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-location" className="text-sm text-stone-700 md:w-20">Location :</label>
                                <input id="invoice-location" className={lineInputClass} {...register('sectionE.location')} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-contactNo" className="text-sm text-stone-700 md:w-24">Contact no. :</label>
                                <input id="invoice-contactNo" className={lineInputClass} {...register('sectionE.contactNo')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-fax" className="text-sm text-stone-700 md:w-20">Fax no. :</label>
                                <input id="invoice-fax" className={lineInputClass} {...register('sectionE.fax')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="invoice-email" className="text-sm text-stone-700 md:w-20">E-mail :</label>
                                <input id="invoice-email" type="email" className={lineInputClass} {...register('sectionE.email')} />
                              </div>
                            </div>
                          </div>
                        </Card>

                        <Card>
                          <div className="mb-5 text-sm font-semibold text-lime-700">F) Particulars of Person who makes the payment (Head of Finance Department)</div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-name" className="text-sm text-stone-700 md:w-20">Name :</label>
                                <input id="finance-name" className={lineInputClass} {...register('sectionF.name')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-designation" className="text-sm text-stone-700 md:w-28">Designation :</label>
                                <input id="finance-designation" className={lineInputClass} {...register('sectionF.designation')} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-poBox" className="text-sm text-stone-700 md:w-20">P.O.Box :</label>
                                <input id="finance-poBox" className={lineInputClass} {...register('sectionF.poBox')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-emirate" className="text-sm text-stone-700 md:w-20">Emirate :</label>
                                <input id="finance-emirate" className={lineInputClass} {...register('sectionF.emirate')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-location" className="text-sm text-stone-700 md:w-20">Location :</label>
                                <input id="finance-location" className={lineInputClass} {...register('sectionF.location')} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-contactNo" className="text-sm text-stone-700 md:w-24">Contact no. :</label>
                                <input id="finance-contactNo" className={lineInputClass} {...register('sectionF.contactNo')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-fax" className="text-sm text-stone-700 md:w-20">Fax no. :</label>
                                <input id="finance-fax" className={lineInputClass} {...register('sectionF.fax')} />
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <label htmlFor="finance-email" className="text-sm text-stone-700 md:w-20">E-mail :</label>
                                <input id="finance-email" type="email" className={lineInputClass} {...register('sectionF.email')} />
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Step 4: References */}
                    {currentStep === 4 && (
                      <div className="space-y-6">
                        <Card>
                          <div className="mb-5 text-sm font-semibold text-lime-700">G) Bank References (Name of the banks you are dealing with)</div>
                          <div className="space-y-5">
                            {bankRefs.fields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-center">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:col-span-2">
                                  <label htmlFor={`bank-name-${index}`} className="text-sm text-stone-700 md:w-40">{index + 1}. Bank & Branch :</label>
                                  <input
                                    id={`bank-name-${index}`}
                                    className={`${lineInputClass} md:max-w-none`}
                                    {...register(`sectionG.${index}.bankName` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`bank-account-${index}`} className="text-sm text-stone-700 md:w-28">A/C no. :</label>
                                  <input
                                    id={`bank-account-${index}`}
                                    className={`${lineInputClass} md:max-w-none`}
                                    {...register(`sectionG.${index}.accountNo` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`bank-tel-${index}`} className="text-sm text-stone-700 md:w-20">Tel no. :</label>
                                  <input
                                    id={`bank-tel-${index}`}
                                    className={`${lineInputClass} md:max-w-none`}
                                    {...register(`sectionG.${index}.telNo` as const)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card>
                          <div className="mb-5 text-sm font-semibold text-lime-700">H) Trade Credit References (Name of Companies you are dealing with on credit)</div>
                          <div className="space-y-3">
                            {tradeRefs.fields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_0.8fr_0.7fr] md:items-center">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`trade-company-${index}`} className="text-sm text-stone-700 md:w-10">{index + 1}.</label>
                                  <input
                                    id={`trade-company-${index}`}
                                    className={lineInputClass}
                                    {...register(`sectionH.${index}.companyName` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`trade-since-${index}`} className="text-sm text-stone-700 md:w-16">Since :</label>
                                  <input
                                    id={`trade-since-${index}`}
                                    className={lineInputClass}
                                    {...register(`sectionH.${index}.since` as const)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                  <label htmlFor={`trade-tel-${index}`} className="text-sm text-stone-700 md:w-16">Tel no. :</label>
                                  <input
                                    id={`trade-tel-${index}`}
                                    className={lineInputClass}
                                    {...register(`sectionH.${index}.telNo` as const)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Step 5: Documents (Simplified for brevity) */}
                {currentStep === 5 && (
                    <Card title="I. Documents Annexed">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="hidden"
                        value={watch('uploads.tradeLicenseUrl') || ''}
                        {...register('uploads.tradeLicenseUrl', { required: 'Trade License is required' })}
                      />
                      <FileUpload
                        label="Trade License"
                        required
                        path={`clients/${clientId}/docs/tradeLicense`}
                        onUploadComplete={(url) => methods.setValue('uploads.tradeLicenseUrl', url, { shouldDirty: true, shouldValidate: true })}
                        currentUrl={watch('uploads.tradeLicenseUrl')}
                        errorMessage={getErrorMessage('uploads.tradeLicenseUrl')}
                      />
                      <input
                        type="hidden"
                        value={watch('uploads.vatCertificateUrl') || ''}
                        {...register('uploads.vatCertificateUrl', { required: 'VAT Certificate is required' })}
                      />
                      <FileUpload
                        label="VAT Certificate"
                        required
                        path={`clients/${clientId}/docs/vatCertificate`}
                        onUploadComplete={(url) => methods.setValue('uploads.vatCertificateUrl', url, { shouldDirty: true, shouldValidate: true })}
                        currentUrl={watch('uploads.vatCertificateUrl')}
                        errorMessage={getErrorMessage('uploads.vatCertificateUrl')}
                      />
                      <input
                        type="hidden"
                        value={watch('uploads.emiratesIdOwnersUrl') || ''}
                        {...register('uploads.emiratesIdOwnersUrl', { required: 'Emirates ID Copy is required' })}
                      />
                      <FileUpload
                        label="Emirates ID Copy (Owners)"
                        required
                        path={`clients/${clientId}/docs/emiratesIdOwners`}
                        onUploadComplete={(url) => methods.setValue('uploads.emiratesIdOwnersUrl', url, { shouldDirty: true, shouldValidate: true })}
                        currentUrl={watch('uploads.emiratesIdOwnersUrl')}
                        errorMessage={getErrorMessage('uploads.emiratesIdOwnersUrl')}
                      />
                      <input
                        type="hidden"
                        value={watch('uploads.visaOwnersUrl') || ''}
                        {...register('uploads.visaOwnersUrl', { required: 'Visa Copy is required' })}
                      />
                      <FileUpload
                        label="Visa Copy (Owners)"
                        required
                        path={`clients/${clientId}/docs/visaOwners`}
                        onUploadComplete={(url) => methods.setValue('uploads.visaOwnersUrl', url, { shouldDirty: true, shouldValidate: true })}
                        currentUrl={watch('uploads.visaOwnersUrl')}
                        errorMessage={getErrorMessage('uploads.visaOwnersUrl')}
                      />
                      <input
                        type="hidden"
                        value={watch('uploads.passportOwnersUrl') || ''}
                        {...register('uploads.passportOwnersUrl', { required: 'Passport Copy is required' })}
                      />
                      <FileUpload
                        label="Passport Copy (Partners)"
                        required
                        path={`clients/${clientId}/docs/passportOwners`}
                        onUploadComplete={(url) => methods.setValue('uploads.passportOwnersUrl', url, { shouldDirty: true, shouldValidate: true })}
                        currentUrl={watch('uploads.passportOwnersUrl')}
                        errorMessage={getErrorMessage('uploads.passportOwnersUrl')}
                      />
                    </div>
                  </Card>
                )}

                {/* Step 6: Final Review */}
                {currentStep === 6 && (
                  <Card>
                    <div className="mb-4 text-sm font-semibold text-lime-700">Declaration & Signature</div>
                    <div className="space-y-4 text-xs text-stone-600 leading-relaxed">
                      <p>
                        I/We believe and assure you that our firm is financial sound enough and able to meet any commitments we have made to pay your invoices according to
                        mutually agreed terms. In this case you may check with our bankers for which we have no objection. We further undertake to abide by the following:
                      </p>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li>All requests for goods will be made in writing on your company's Letter head / Purchase Order / Authorized Registered Email.</li>
                        <li>
                          All Invoices will be settled as per the credit limit / credit period approved by Diamond Lights General Trading L.L.C. Failure to settle the account
                          as per the credit limit / credit period gives Diamond Lights General Trading L.L.C. the right to take necessary legal action to recover the due amount
                          and the right to repossess the goods without prior notice.
                        </li>
                        <li>While settle your invoices on due dates no deduction shall be made by us whatsoever, without your written acceptance.</li>
                        <li>
                          Payment shall be made to you directly without any adjustment of your group of companies' invoices if any. I/We further declare that I/We have read,
                          have understood and hold myself/ourselves legally bound by the conditions laid down on this form. I also confirm contents included in page no. 1 to 2
                          and those of any authorized attachments there to.
                        </li>
                      </ol>
                    </div>

                    <div className="mt-5">
                      <Checkbox label="I agree to the above declaration" {...register('declarationAgreed', { required: 'Please confirm the declaration' })} />
                      {renderError('declarationAgreed')}
                    </div>

                    <div className="mt-6 space-y-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_0.6fr] md:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-40">Authorized Signature :</label>
                            <div className="min-w-0 flex-1">
                              <FileUpload
                                label="Upload signature (image or PDF)"
                                path={`clients/${clientId}/docs/finalSignature`}
                                onUploadComplete={(url) => setValue('uploads.finalSignatureUrl', url, { shouldDirty: true })}
                                currentUrl={watch('uploads.finalSignatureUrl')}
                                accept="image/*,.pdf"
                                disabled={isLocked}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-stone-500 italic">(Please attach a copy of Court attestation of Signature OR Power of Attorney)</div>
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label htmlFor="finalSignatoryDate" className="text-sm text-stone-700 md:w-16">Date :</label>
                          <input
                            type="hidden"
                            value={watch('finalSignatoryDate') || ''}
                            {...register('finalSignatoryDate', { required: 'Date is required' })}
                          />
                          <input
                            id="finalSignatoryDate"
                            type="date"
                            className={lineInputClass}
                            value={watch('finalSignatoryDate') || ''}
                            disabled
                            readOnly
                          />
                        </div>
                        {renderError('finalSignatoryDate')}
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_0.6fr]">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label htmlFor="finalSignatoryName" className="text-sm text-stone-700 md:w-24">Name :</label>
                            <input
                              id="finalSignatoryName"
                              className={lineInputClass}
                              {...register('finalSignatoryName', { required: 'Name is required' })}
                            />
                          </div>
                          {renderError('finalSignatoryName')}
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label htmlFor="finalSignatoryDesignation" className="text-sm text-stone-700 md:w-24">Designation :</label>
                            <input
                              id="finalSignatoryDesignation"
                              className={lineInputClass}
                              {...register('finalSignatoryDesignation', { required: 'Designation is required' })}
                            />
                          </div>
                          {renderError('finalSignatoryDesignation')}
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-stone-700">Company Stamp :</div>
                          <FileUpload
                            label="Upload company stamp (image or PDF)"
                            path={`clients/${clientId}/docs/companyStamp`}
                            onUploadComplete={(url) => setValue('uploads.companyStampUrl', url, { shouldDirty: true })}
                            currentUrl={watch('uploads.companyStampUrl')}
                            accept="image/*,.pdf"
                            disabled={isLocked}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
                  </>
                )}

                {/* Sticky Action Bar */}
                {!isLocked && (
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-lg z-30">
                    <div className="max-w-5xl mx-auto lg:mx-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>Back</Button>
                      
                      <div className="text-xs text-stone-400 font-medium hidden sm:block">
                         {isSaving ? "Saving changes..." : lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : ""}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onSaveDraft(watch())}>Save Draft</Button>
                        
                        {currentStep < steps.length - 1 ? (
                          <Button type="button" className="w-full sm:w-auto" onClick={handleNextStep}>Next Step</Button>
                        ) : (
                          <Button type="button" className="w-full sm:w-auto" onClick={handleSubmitAttempt}>Submit Registration</Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </FormProvider>
          </main>
          )}

          {activeTab === 'credit' && (
            <main className="max-w-5xl mx-auto lg:mx-0 mt-8 px-4 sm:px-6 lg:pr-8">
              {hasCreditAccess ? (
                creditSubmitted ? (
                  <div className="text-center py-20">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-stone-800">Submission Received</h2>
                      <p className="text-stone-600 mt-2">Thank you. We have received your credit application and will confirm the next steps shortly.</p>
                      <p className="text-sm text-stone-500 mt-2">If you need to make any edits, please contact our team and we will reopen the form for you.</p>
                      <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="w-full max-w-md text-left space-y-2 border border-stone-200 rounded-lg p-4 bg-white">
                          <div className="font-semibold text-stone-800">Upload Attested Document</div>
                          <p className="text-sm text-stone-600">Please upload the signed & stamped credit application PDF (mandatory).</p>
                        <FileUpload
                          label="Upload Attested Credit Document"
                          required
                          path={`clients/${clientId}/credit/attestedDocument`}
                          currentUrl={watch('uploads.creditAttestedDocumentUrl')}
                          onUploadComplete={async (url) => {
                            setValue('uploads.creditAttestedDocumentUrl', url, { shouldDirty: false });
                            if (formDocId) {
                              await db.collection('client_forms').doc(formDocId).update({
                                'uploads.creditAttestedDocumentUrl': url,
                                'timestamps.updatedAt': Date.now()
                              });
                            }
                            if (creditDocId) {
                              await db.collection('credit_applications').doc(clientId).set({
                                attestedDocumentUrl: url,
                                updatedAt: Date.now()
                              }, { merge: true });
                            }
                          }}
                        />
                      </div>
                      {creditReopenStatus !== 'CREDIT_REOPEN_PENDING' && (
                        <Button variant="outline" className="w-full sm:w-auto" onClick={requestCreditReopen}>
                          Request Edit Access
                        </Button>
                      )}
                      {creditReopenStatus === 'CREDIT_REOPEN_PENDING' && (
                        <span className="text-sm text-stone-600">Edit access requested. We will notify you once it is approved.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <FormProvider {...methods}>
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                      <Card>
                        <div className="mb-5 text-sm font-semibold text-lime-700">1) Company Information</div>
                        <div className="space-y-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-48">Company Name :</label>
                            <input className={lineInputClass} {...register('creditApplication.companyInfo.companyName')} />
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-48">Trading Name (if different) :</label>
                            <input className={lineInputClass} {...register('creditApplication.companyInfo.tradingName')} />
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-48">Office Address :</label>
                            <input className={lineInputClass} {...register('creditApplication.companyInfo.officeAddress')} />
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-24">City :</label>
                              <input className={lineInputClass} {...register('creditApplication.companyInfo.city')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-24">P.O. Box :</label>
                              <input className={lineInputClass} {...register('creditApplication.companyInfo.poBox')} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-28">Landline :</label>
                              <input className={lineInputClass} {...register('creditApplication.companyInfo.landline')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-24">Mobile :</label>
                              <input className={lineInputClass} {...register('creditApplication.companyInfo.mobile')} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-20">Email :</label>
                              <input className={lineInputClass} type="email" {...register('creditApplication.companyInfo.email')} />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-24">Website :</label>
                            <input className={lineInputClass} {...register('creditApplication.companyInfo.website')} />
                          </div>
                        </div>
                      </Card>

                    <Card>
                      <div className="mb-5 text-sm font-semibold text-lime-700">2) Business Details</div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-48">Type of Business :</label>
                          <input className={lineInputClass} {...register('creditApplication.businessDetails.typeOfBusiness')} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-40">Year Established :</label>
                            <input className={lineInputClass} {...register('creditApplication.businessDetails.yearEstablished')} />
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-40">Number of Employees :</label>
                            <input className={lineInputClass} {...register('creditApplication.businessDetails.numberOfEmployees')} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-48">Nature of Business / Activities :</label>
                          <input className={lineInputClass} {...register('creditApplication.businessDetails.natureOfBusiness')} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-48">Authorized Signatory Name :</label>
                            <input className={lineInputClass} {...register('creditApplication.businessDetails.authorizedSignatoryName')} />
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-28">Designation :</label>
                            <input className={lineInputClass} {...register('creditApplication.businessDetails.designation')} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-20">Mobile :</label>
                            <input className={lineInputClass} {...register('creditApplication.businessDetails.mobile')} />
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-20">Email :</label>
                            <input className={lineInputClass} type="email" {...register('creditApplication.businessDetails.email')} />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <div className="mb-5 text-sm font-semibold text-lime-700">3) Credit Request</div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-56">Credit Limit Requested (AED) :</label>
                          <input className={lineInputClass} {...register('creditApplication.creditRequest.creditLimitAed')} />
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-56">Preferred Payment Terms :</label>
                          <input className={lineInputClass} placeholder="30 / 45 / 60 Days / Other" {...register('creditApplication.creditRequest.preferredPaymentTerms')} />
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-56">Estimated Monthly Purchases (AED) :</label>
                          <input className={lineInputClass} {...register('creditApplication.creditRequest.estimatedMonthlyPurchases')} />
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <div className="mb-5 text-sm font-semibold text-lime-700">4) Bank Details</div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-32">Bank Name :</label>
                          <input className={lineInputClass} {...register('creditApplication.bankDetails.bankName')} />
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-24">Branch :</label>
                          <input className={lineInputClass} {...register('creditApplication.bankDetails.branch')} />
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-32">Account Name :</label>
                          <input className={lineInputClass} {...register('creditApplication.bankDetails.accountName')} />
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-32">Account Number :</label>
                          <input className={lineInputClass} {...register('creditApplication.bankDetails.accountNumber')} />
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-16">IBAN :</label>
                          <input className={lineInputClass} {...register('creditApplication.bankDetails.iban')} />
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <div className="mb-5 text-sm font-semibold text-lime-700">5) Trade References</div>
                      <div className="space-y-4">
                        {creditRefs.fields.map((field, index) => (
                          <div key={field.id} className="border border-stone-200 rounded-xl p-4 space-y-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-32">Company Name :</label>
                              <input className={lineInputClass} {...register(`creditApplication.tradeReferences.${index}.companyName` as const)} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-32">Contact Person :</label>
                              <input className={lineInputClass} {...register(`creditApplication.tradeReferences.${index}.contactPerson` as const)} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-20">Mobile :</label>
                              <input className={lineInputClass} {...register(`creditApplication.tradeReferences.${index}.mobile` as const)} />
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <label className="text-sm text-stone-700 md:w-20">Email :</label>
                              <input className={lineInputClass} type="email" {...register(`creditApplication.tradeReferences.${index}.email` as const)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card>
                      <div className="mb-5 text-sm font-semibold text-lime-700">6) Required Supporting Documents</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FileUpload
                            label="Trade License"
                            required={!resolvedCreditDocs.tradeLicenseUrl}
                            path={`clients/${clientId}/credit/tradeLicense`}
                            onUploadComplete={(url) => setValue('creditApplication.documents.tradeLicenseUrl', url, { shouldDirty: true })}
                            currentUrl={resolvedCreditDocs.tradeLicenseUrl}
                            disabled={!!resolvedCreditDocs.tradeLicenseUrl}
                          />
                          {resolvedCreditDocs.tradeLicenseUrl && <div className="text-xs text-green-700 mt-2">Successfully Uploaded</div>}
                        </div>
                        <div>
                          <FileUpload
                            label="VAT Certificate"
                            required={!resolvedCreditDocs.vatCertificateUrl}
                            path={`clients/${clientId}/credit/vatCertificate`}
                            onUploadComplete={(url) => setValue('creditApplication.documents.vatCertificateUrl', url, { shouldDirty: true })}
                            currentUrl={resolvedCreditDocs.vatCertificateUrl}
                            disabled={!!resolvedCreditDocs.vatCertificateUrl}
                          />
                          {resolvedCreditDocs.vatCertificateUrl && <div className="text-xs text-green-700 mt-2">Successfully Uploaded</div>}
                        </div>
                        <div>
                          <FileUpload
                            label="Emirates ID Copy of Owners"
                            required={!resolvedCreditDocs.emiratesIdUrl}
                            path={`clients/${clientId}/credit/emiratesId`}
                            onUploadComplete={(url) => setValue('creditApplication.documents.emiratesIdUrl', url, { shouldDirty: true })}
                            currentUrl={resolvedCreditDocs.emiratesIdUrl}
                            disabled={!!resolvedCreditDocs.emiratesIdUrl}
                          />
                          {resolvedCreditDocs.emiratesIdUrl && <div className="text-xs text-green-700 mt-2">Successfully Uploaded</div>}
                        </div>
                        <div>
                          <FileUpload
                            label="Visa Copy of Owners"
                            required={!resolvedCreditDocs.visaCopyUrl}
                            path={`clients/${clientId}/credit/visaCopy`}
                            onUploadComplete={(url) => setValue('creditApplication.documents.visaCopyUrl', url, { shouldDirty: true })}
                            currentUrl={resolvedCreditDocs.visaCopyUrl}
                            disabled={!!resolvedCreditDocs.visaCopyUrl}
                          />
                          {resolvedCreditDocs.visaCopyUrl && <div className="text-xs text-green-700 mt-2">Successfully Uploaded</div>}
                        </div>
                        <div>
                          <FileUpload
                            label="Passport Copy of Owners"
                            required={!resolvedCreditDocs.passportCopyUrl}
                            path={`clients/${clientId}/credit/passportCopy`}
                            onUploadComplete={(url) => setValue('creditApplication.documents.passportCopyUrl', url, { shouldDirty: true })}
                            currentUrl={resolvedCreditDocs.passportCopyUrl}
                            disabled={!!resolvedCreditDocs.passportCopyUrl}
                          />
                          {resolvedCreditDocs.passportCopyUrl && <div className="text-xs text-green-700 mt-2">Successfully Uploaded</div>}
                        </div>
                        <div>
                          <FileUpload
                            label="Bank Statement (3–6 Months)"
                            required={!resolvedCreditDocs.bankStatementUrl}
                            path={`clients/${clientId}/credit/bankStatement`}
                            onUploadComplete={(url) => setValue('creditApplication.documents.bankStatementUrl', url, { shouldDirty: true })}
                            currentUrl={resolvedCreditDocs.bankStatementUrl}
                            disabled={!!resolvedCreditDocs.bankStatementUrl}
                          />
                          {resolvedCreditDocs.bankStatementUrl && <div className="text-xs text-green-700 mt-2">Successfully Uploaded</div>}
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <div className="mb-5 text-sm font-semibold text-lime-700">7) Questionnaire</div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-64">Credit facilities with other suppliers?</label>
                            <select className={lineInputClass} {...register('creditApplication.questionnaire.hasCreditFacilities')}>
                              <option value="">Select</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-48">If yes, provide details :</label>
                            <input className={lineInputClass} {...register('creditApplication.questionnaire.creditFacilitiesDetails')} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-64">Defaulted or delayed payments?</label>
                            <select className={lineInputClass} {...register('creditApplication.questionnaire.hasDefaultedPayments')}>
                              <option value="">Select</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-48">If yes, provide details :</label>
                            <input className={lineInputClass} {...register('creditApplication.questionnaire.defaultedPaymentsDetails')} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-64">Purchase orders issued before delivery?</label>
                            <select className={lineInputClass} {...register('creditApplication.questionnaire.purchaseOrdersBeforeDelivery')}>
                              <option value="">Select</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-64">Financially stable for credit obligations?</label>
                            <select className={lineInputClass} {...register('creditApplication.questionnaire.financiallyStable')}>
                              <option value="">Select</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <label className="text-sm text-stone-700 md:w-64">Preferred communication :</label>
                          <input className={lineInputClass} placeholder="Email / WhatsApp / Phone Call" {...register('creditApplication.questionnaire.preferredCommunication')} />
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <div className="mb-4 text-sm font-semibold text-lime-700">8) Declaration</div>
                      <div className="space-y-4">
                        <Checkbox label="I hereby declare that the above information is true and correct." {...register('creditApplication.declaration.agreed')} />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-24">Name :</label>
                            <input className={lineInputClass} {...register('creditApplication.declaration.name')} />
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-28">Designation :</label>
                            <input className={lineInputClass} {...register('creditApplication.declaration.designation')} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-28">Signature :</label>
                            <div className="min-w-0 flex-1">
                              <FileUpload
                                label="Upload Signature / Company Stamp"
                                path={`clients/${clientId}/credit/declarationSignature`}
                                currentUrl={watch('creditApplication.declaration.signatureUrl')}
                                onUploadComplete={(url) => setValue('creditApplication.declaration.signatureUrl', url, { shouldDirty: true })}
                                accept="image/*"
                                disabled={isLocked}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <label className="text-sm text-stone-700 md:w-16">Date :</label>
                            <input type="date" className={lineInputClass} {...register('creditApplication.declaration.date')} disabled />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-stone-200 pt-4">
                      <div className="text-xs text-stone-500">
                        {creditSaving
                          ? 'Saving credit application...'
                          : creditLastSaved
                          ? `Credit saved at ${creditLastSaved.toLocaleTimeString()}`
                          : ''}
                        {creditMessage && <div className="text-sm text-stone-700 mt-1">{creditMessage}</div>}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={saveCreditApplication} isLoading={creditSaving}>Save Credit Application</Button>
                        <Button type="button" className="w-full sm:w-auto" onClick={() => setShowCreditConfirm(true)} isLoading={creditSaving || creditSubmitting}>Submit Credit Application</Button>
                      </div>
                    </div>
                  </form>
                </FormProvider>
                )
              ) : (
                <div className="p-6 bg-white border border-stone-200 rounded-xl shadow-sm text-center text-stone-600">
                  <h3 className="text-lg font-semibold text-stone-800 mb-2">Credit Application Locked</h3>
                  <p className="text-sm">Please submit your registration and request access from Admin.</p>
                </div>
              )}
            </main>
          )}

          {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <h3 className="text-lg font-semibold text-stone-900">Confirm submission?</h3>
                <p className="text-sm text-stone-600">
                  You are about to submit your registration. You will not be able to edit the form after submission. Would you like to re-edit or confirm and submit?
                </p>
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowSubmitConfirm(false)}>Re-edit Form</Button>
                  <Button className="w-full sm:w-auto" onClick={handleConfirmSubmit} isLoading={isSubmitting}>Confirm & Submit</Button>
                </div>
              </div>
            </div>
          )}

          {showCreditConfirm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <h3 className="text-lg font-semibold text-stone-900">Confirm submission?</h3>
                <p className="text-sm text-stone-600">
                  You are about to submit your credit application. You will not be able to edit the form after submission. Would you like to re-edit or confirm and submit?
                </p>
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowCreditConfirm(false)}>Re-edit Form</Button>
                  <Button className="w-full sm:w-auto" onClick={handleCreditSubmit} isLoading={creditSubmitting}>Confirm &amp; Submit</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
