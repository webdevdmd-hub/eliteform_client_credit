import React, { useState } from 'react';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ClipboardList, Lock } from 'lucide-react';
import { ClientForm } from '../types';
import { Button, Card, Checkbox } from '../components/ui/Components';
import { FileUpload } from '../components/form/FileUpload';
import { SignaturePad } from '../components/form/SignaturePad';
import { CreditPDFDocument } from '../components/CreditPDFDocument';

type CreditApplicationDashboardProps = {
  hasCreditAccess: boolean;
  creditRequestStatus: 'none' | 'requested' | 'approved';
  onRequestCredit: () => void;
  registrationData: ClientForm | null;
  methods: UseFormReturn<ClientForm>;
  creditRefs: any;
  lineInputClass: string;
  clientId: string;
  creditState: {
    creditSubmitted: boolean;
    creditSaving: boolean;
    creditSubmitting: boolean;
    creditLastSaved: Date | null;
    creditMessage: string | null;
    showCreditConfirm: boolean;
  };
  setShowCreditConfirm: (show: boolean) => void;
  saveCreditApplication: () => Promise<void>;
  handleCreditSubmit: () => Promise<void>;
};

export const CreditApplicationDashboard: React.FC<CreditApplicationDashboardProps> = ({
  hasCreditAccess,
  creditRequestStatus,
  onRequestCredit,
  registrationData,
  methods,
  creditRefs,
  lineInputClass,
  clientId,
  creditState,
  setShowCreditConfirm,
  saveCreditApplication,
  handleCreditSubmit
}) => {
  const { register, watch, setValue, formState: { errors } } = methods;
  const { creditSubmitted, creditSaving, creditSubmitting, creditLastSaved, creditMessage, showCreditConfirm } = creditState;
  const registrationUploads = registrationData?.uploads;
  const creditDocs = watch('creditApplication.documents') || ({} as any);
  const resolvedCreditDocs = {
    tradeLicenseUrl: creditDocs.tradeLicenseUrl || registrationUploads?.tradeLicenseUrl,
    vatCertificateUrl: creditDocs.vatCertificateUrl || registrationUploads?.vatCertificateUrl,
    emiratesIdUrl: creditDocs.emiratesIdUrl || registrationUploads?.emiratesIdOwnersUrl,
    visaCopyUrl: creditDocs.visaCopyUrl || registrationUploads?.visaOwnersUrl,
    passportCopyUrl: creditDocs.passportCopyUrl || registrationUploads?.passportOwnersUrl || registrationUploads?.sponsorPassportUrl,
    bankStatementUrl: creditDocs.bankStatementUrl || registrationUploads?.bankStatementUrl
  };

  React.useEffect(() => {
    if (!registrationUploads) return;
    if (!creditDocs.tradeLicenseUrl && registrationUploads.tradeLicenseUrl) {
      setValue('creditApplication.documents.tradeLicenseUrl', registrationUploads.tradeLicenseUrl, { shouldDirty: true });
    }
    if (!creditDocs.vatCertificateUrl && registrationUploads.vatCertificateUrl) {
      setValue('creditApplication.documents.vatCertificateUrl', registrationUploads.vatCertificateUrl, { shouldDirty: true });
    }
    if (!creditDocs.emiratesIdUrl && registrationUploads.emiratesIdOwnersUrl) {
      setValue('creditApplication.documents.emiratesIdUrl', registrationUploads.emiratesIdOwnersUrl, { shouldDirty: true });
    }
    if (!creditDocs.visaCopyUrl && registrationUploads.visaOwnersUrl) {
      setValue('creditApplication.documents.visaCopyUrl', registrationUploads.visaOwnersUrl, { shouldDirty: true });
    }
    if (!creditDocs.passportCopyUrl && (registrationUploads.passportOwnersUrl || registrationUploads.sponsorPassportUrl)) {
      setValue('creditApplication.documents.passportCopyUrl', registrationUploads.passportOwnersUrl || registrationUploads.sponsorPassportUrl, { shouldDirty: true });
    }
    if (!creditDocs.bankStatementUrl && registrationUploads.bankStatementUrl) {
      setValue('creditApplication.documents.bankStatementUrl', registrationUploads.bankStatementUrl, { shouldDirty: true });
    }
  }, [creditDocs, registrationUploads, setValue]);

  if (!hasCreditAccess) {
    return (
      <div className="p-6 bg-white border border-stone-200 rounded-xl shadow-sm text-center text-stone-600">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">Credit Application Locked</h3>
        <p className="text-sm">Please submit your registration and request access from Admin.</p>
      </div>
    );
  }

  if (creditSubmitted) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-stone-800">Submission Received</h2>
        <p className="text-stone-600 mt-2">Thank you. We have received your credit application and will confirm the next steps shortly.</p>
        <p className="text-sm text-stone-500 mt-2">If you need to make any edits, please contact our team and we will reopen the form for you.</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <PDFDownloadLink document={<CreditPDFDocument data={watch('creditApplication')} />} fileName="credit-application.pdf">
            {({ loading }) => (
              <Button variant="outline" disabled={loading}>
                {loading ? 'Generating PDF...' : 'Download Credit Application PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>
    );
  }

  return (
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
            {creditRefs.fields.map((field: any, index: number) => (
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
                    <SignaturePad
                      label="Draw signature"
                      value={watch('creditApplication.declaration.signatureUrl')}
                      onChange={(dataUrl) => setValue('creditApplication.declaration.signatureUrl', dataUrl, { shouldDirty: true })}
                      height={110}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <label className="text-sm text-stone-700 md:w-16">Date :</label>
                  <input type="date" className={lineInputClass} {...register('creditApplication.declaration.date')} />
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
    </FormProvider>
  );
};
