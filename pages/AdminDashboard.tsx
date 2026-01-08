import React, { useEffect, useState } from 'react';
import { db, createSecondaryApp } from '../services/firebase';
import { deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { ClientRecord, ClientStatus, UserRole } from '../types';
import { Button, Card, Input } from '../components/ui/Components';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PDFDocument } from '../components/PDFDocument';
import { LogOut, FileText, UserPlus, Eye, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { auth } from '../services/firebase';

export const AdminDashboard: React.FC = () => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null); // Full form data
  const [newClient, setNewClient] = useState({ email: '', password: '', companyName: '' });
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [creditToggleId, setCreditToggleId] = useState<string | null>(null);

  useEffect(() => {
    // onSnapshot Compat
    const unsub = db.collection('clients').onSnapshot(
      (snap) => {
        const list = snap.docs.map(d => d.data() as ClientRecord);
        setClients(list);
        setPermissionError(null);
      },
      (error) => {
        console.error("Firestore Error:", error);
        if (error.code === 'permission-denied') {
          setPermissionError("Permission Denied: Missing or insufficient permissions. Please check your Firestore Security Rules in the Firebase Console.");
        } else {
          setPermissionError("Error fetching clients: " + error.message);
        }
      }
    );
    return () => unsub();
  }, []);

  const regReopenCount = clients.filter(c => (c as any).reopenStatus === 'REG_REOPEN_PENDING').length;
  const creditReopenCount = clients.filter(c => (c as any).creditReopenStatus === 'CREDIT_REOPEN_PENDING').length;

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use secondary app to prevent Admin logout
      const secondaryApp = createSecondaryApp();
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newClient.email, newClient.password);
      const uid = cred.user.uid;

      // Create Client Profile using db (compat)
      await db.collection('clients').doc(uid).set({
        clientId: uid,
        uid,
        email: newClient.email,
        companyName: newClient.companyName,
        status: ClientStatus.CREATED,
        creditRequestStatus: 'none',
        hasCreditAccess: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Create Blank Form
      await db.collection('client_forms').doc(uid).set({
        formId: uid,
        clientId: uid,
        uid,
        status: ClientStatus.CREATED,
        sectionA: { companyName: newClient.companyName }, // Pre-fill name
        sectionB: [],
        sectionC: [],
        sectionD: [],
        uploads: {},
        timestamps: { createdAt: Date.now() }
      });

      await deleteApp(secondaryApp);
      setIsCreating(false);
      setNewClient({ email: '', password: '', companyName: '' });
      alert("Client created successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openClientForm = async (uid: string) => {
    try {
      const [formSnap, profileSnap, creditSnap] = await Promise.all([
        db.collection('client_forms').doc(uid).get(),
        db.collection('clients').doc(uid).get(),
        db.collection('credit_applications').doc(uid).get()
      ]);
      if (formSnap.exists) {
        const formData = formSnap.data() || {};
        const creditData = creditSnap.exists ? creditSnap.data() : {};
        const attestedCreditUrl =
          (creditData as any)?.attestedDocumentUrl ||
          (formData as any)?.uploads?.creditAttestedDocumentUrl;
        setSelectedClient({
          ...formData,
          ...(profileSnap.data() || {}),
          creditApplication: (creditData as any)?.creditApplication || (formData as any).creditApplication,
          creditApplicationStatus: (creditData as any)?.status || (formData as any).creditApplicationStatus,
          uploads: {
            ...((formData as any).uploads || {}),
            ...(attestedCreditUrl ? { creditAttestedDocumentUrl: attestedCreditUrl } : {})
          }
        });
      } else {
        alert("Client form not found.");
      }
    } catch (err: any) {
      alert("Error opening form: " + err.message);
    }
  };

  const toggleCreditAccess = async (uid: string, enabled: boolean, currentStatus?: string) => {
    try {
      setCreditToggleId(uid);
      await db.collection('clients').doc(uid).update({
        hasCreditAccess: enabled,
        creditRequestStatus: enabled ? 'approved' : (currentStatus === 'requested' ? 'requested' : 'none'),
        updatedAt: Date.now()
      });
      setClients(prev => prev.map(c => c.clientId === uid ? { ...c, hasCreditAccess: enabled, creditRequestStatus: enabled ? 'approved' : c.creditRequestStatus } : c));
      setSelectedClient(prev => prev && prev.uid === uid ? { ...prev, hasCreditAccess: enabled, creditRequestStatus: enabled ? 'approved' : prev.creditRequestStatus } : prev);
    } catch (err: any) {
      alert("Error updating credit access: " + err.message);
    } finally {
      setCreditToggleId(null);
    }
  };

  const updateStatus = async (uid: string, status: ClientStatus) => {
      try {
        setStatusChangingId(uid);
        const now = Date.now();
        await db.collection('clients').doc(uid).update({ status, updatedAt: now });
        await db.collection('client_forms').doc(uid).update({ status, 'timestamps.updatedAt': now });
        if (selectedClient && selectedClient.uid === uid) {
          setSelectedClient({
            ...selectedClient,
            status,
            timestamps: { ...(selectedClient.timestamps || {}), updatedAt: now }
          });
        }
      } catch (err: any) {
        alert("Error updating status: " + err.message);
      } finally {
        setStatusChangingId(null);
      }
  };

  const approveReopenRequest = async (uid: string) => {
    try {
      setStatusChangingId(uid);
      await db.collection('clients').doc(uid).update({
        status: ClientStatus.SENT,
        reopenStatus: null,
        updatedAt: Date.now()
      });
      await db.collection('client_forms').doc(uid).update({
        status: ClientStatus.SENT,
        'timestamps.updatedAt': Date.now()
      });
      setClients(prev => prev.map(c => c.clientId === uid ? { ...c, status: ClientStatus.SENT, reopenStatus: null } : c));
      setSelectedClient(prev => prev && prev.uid === uid ? { ...prev, status: ClientStatus.SENT, reopenStatus: null } : prev);
      alert('Reopen request approved. Client can edit again.');
    } catch (err: any) {
      alert('Failed to approve reopen: ' + err.message);
    } finally {
      setStatusChangingId(null);
    }
  };

  const approveCreditReopen = async (uid: string) => {
    try {
      setStatusChangingId(uid);
      await db.collection('clients').doc(uid).update({
        creditReopenStatus: null,
        updatedAt: Date.now()
      });
      await db.collection('credit_applications').doc(uid).set({
        status: 'draft',
        reopenRequested: false,
        updatedAt: Date.now()
      }, { merge: true });
      setClients(prev => prev.map(c => c.clientId === uid ? { ...c, creditReopenStatus: null } : c));
      setSelectedClient(prev => prev && prev.uid === uid ? { ...prev, creditReopenStatus: null } : prev);
      alert('Credit application reopened. Client can edit again.');
    } catch (err: any) {
      alert('Failed to approve credit reopen: ' + err.message);
    } finally {
      setStatusChangingId(null);
    }
  };
  
  const handleOfficeUseUpdate = async (e: React.FormEvent) => {
     e.preventDefault();
     if(!selectedClient) return;
     try {
       // Update selectedClient.officeUse in DB
       await db.collection('client_forms').doc(selectedClient.uid).update({
           officeUse: selectedClient.officeUse
       });
       alert("Office section updated");
     } catch (err: any) {
       alert("Error saving data: " + err.message);
     }
  };

  if (selectedClient) {
      // Simple Review View
      return (
          <div className="p-4 sm:p-6 lg:p-8 bg-stone-50 min-h-screen">
              <Button onClick={() => setSelectedClient(null)} variant="secondary" className="mb-4 w-full sm:w-auto">← Back to Dashboard</Button>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                  <h1 className="text-2xl font-bold">{selectedClient.sectionA?.companyName || 'Client'} - Review</h1>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                      {(selectedClient as any).reopenStatus === 'REG_REOPEN_PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={statusChangingId === selectedClient.uid}
                          onClick={() => approveReopenRequest(selectedClient.uid)}
                        >
                          Approve Registration Reopen
                        </Button>
                      )}
                      {(selectedClient as any).creditReopenStatus === 'CREDIT_REOPEN_PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={statusChangingId === selectedClient.uid}
                          onClick={() => approveCreditReopen(selectedClient.uid)}
                        >
                          Approve Credit Reopen
                        </Button>
                      )}
                  </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                      <Card title="Internal Office Use">
                          <form onSubmit={handleOfficeUseUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input label="Approved Credit Limit (AED)" value={selectedClient.officeUse?.approvedCreditLimit || ''} onChange={e => setSelectedClient({...selectedClient, officeUse: {...selectedClient.officeUse, approvedCreditLimit: e.target.value}})} />
                              <Input label="Credit Period" value={selectedClient.officeUse?.creditPeriod || ''} onChange={e => setSelectedClient({...selectedClient, officeUse: {...selectedClient.officeUse, creditPeriod: e.target.value}})} />
                              <div className="md:col-span-2">
                                  <Input label="Finance Manager Comments" value={selectedClient.officeUse?.financeManagerComments || ''} onChange={e => setSelectedClient({...selectedClient, officeUse: {...selectedClient.officeUse, financeManagerComments: e.target.value}})} />
                              </div>
                              <Button type="submit" size="sm" className="md:col-span-2 w-full md:w-auto">Save Internal Data</Button>
                          </form>
                      </Card>

                      <Card title="Attested Documents">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-semibold text-stone-800">Client Registration</span>
                            <Button
                              as="a"
                              href={selectedClient.uploads?.attestedDocumentUrl as string | undefined}
                              target="_blank"
                              rel="noreferrer"
                              disabled={!selectedClient.uploads?.attestedDocumentUrl}
                              variant={selectedClient.uploads?.attestedDocumentUrl ? 'primary' : 'outline'}
                            >
                              {selectedClient.uploads?.attestedDocumentUrl ? 'Download Attested Registration Doc' : 'Not Uploaded'}
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-semibold text-stone-800">Credit Application</span>
                            <Button
                              as="a"
                              href={selectedClient.uploads?.creditAttestedDocumentUrl as string | undefined}
                              target="_blank"
                              rel="noreferrer"
                              disabled={!selectedClient.uploads?.creditAttestedDocumentUrl}
                              variant={selectedClient.uploads?.creditAttestedDocumentUrl ? 'primary' : 'outline'}
                            >
                              {selectedClient.uploads?.creditAttestedDocumentUrl ? 'Download Attested Credit Doc' : 'Not Uploaded'}
                            </Button>
                            <Button
                              as="a"
                              href={undefined}
                              disabled
                              className="hidden"
                            />
                          </div>
                          <p className="text-sm text-stone-600">Attested version is the source of truth for signatures. System PDF remains available for reference.</p>
                        </div>
                      </Card>

                      <Card title="Submitted Attachments">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(selectedClient.uploads || {}).length === 0 && <p className="text-stone-400 text-sm p-4 col-span-full">No attachments uploaded yet.</p>}
                              {Object.entries(selectedClient.uploads || {}).map(([key, url]) => (
                                  <a key={key} href={url as string} target="_blank" rel="noreferrer" className="block p-4 border rounded hover:bg-stone-100 text-sm truncate text-blue-600">
                                      {key}
                                  </a>
                              ))}
                          </div>
                      </Card>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-800">Admin Dashboard</h1>
            <p className="text-stone-500">Manage client registrations</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1.5 rounded-full border border-stone-200 text-sm text-stone-700 bg-white shadow-sm">
              Client Reopen Requests: <span className="font-semibold">{regReopenCount}</span>
            </span>
            <span className="px-3 py-1.5 rounded-full border border-stone-200 text-sm text-stone-700 bg-white shadow-sm">
              Credit Reopen Requests: <span className="font-semibold">{creditReopenCount}</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto"><UserPlus className="w-4 h-4 mr-2"/> New Client</Button>
              <Button variant="ghost" onClick={() => signOut(auth)} className="w-full sm:w-auto"><LogOut className="w-4 h-4"/></Button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">

        {permissionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-semibold">Access Error</p>
              <p>{permissionError}</p>
            </div>
          </div>
        )}

        {isCreating && (
          <Card className="mb-8 bg-white border-primary-100" title="Create New Client Access">
            <form onSubmit={handleCreateClient} className="flex flex-col gap-4 md:flex-row md:items-end">
              <Input label="Company Name" value={newClient.companyName} onChange={e => setNewClient({...newClient, companyName: e.target.value})} required className="flex-1" />
              <Input label="Email" type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} required className="flex-1" />
              <Input label="Password" type="password" value={newClient.password} onChange={e => setNewClient({...newClient, password: e.target.value})} required className="flex-1" />
              <Button type="submit" className="w-full md:w-auto">Create User</Button>
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="w-full md:w-auto">Cancel</Button>
            </form>
          </Card>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="p-4 font-semibold text-stone-600">Company</th>
                <th className="p-4 font-semibold text-stone-600">Email</th>
                <th className="p-4 font-semibold text-stone-600">Status</th>
                <th className="p-4 font-semibold text-stone-600">Credit Access</th>
                <th className="p-4 font-semibold text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && !permissionError && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-400">
                    No clients found.
                  </td>
                </tr>
              )}
              {clients.map(client => (
                <tr key={client.clientId} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="p-4 font-medium">{client.companyName}</td>
                  <td className="p-4 text-stone-600">{client.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      client.status === ClientStatus.FINISHED ? 'bg-green-100 text-green-800' :
                      client.status === ClientStatus.SENT ? 'bg-blue-100 text-blue-800' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {client.status.replace('_', ' ')}
                    </span>
                    {(client as any).reopenStatus === 'REG_REOPEN_PENDING' && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Reopen requested</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCreditAccess(client.uid, !client.hasCreditAccess, client.creditRequestStatus)}
                        disabled={creditToggleId === client.uid}
                        className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${client.hasCreditAccess ? 'bg-green-100 text-green-700 border-green-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}
                        title={client.creditRequestStatus === 'requested' && !client.hasCreditAccess ? 'Client requested access' : 'Toggle credit access'}
                      >
                        {creditToggleId === client.uid ? 'Saving...' : client.hasCreditAccess ? 'Granted' : (client.creditRequestStatus === 'requested' ? 'Grant Access' : 'Locked')}
                      </button>
                      {client.creditRequestStatus === 'requested' && !client.hasCreditAccess && <Lock className="w-4 h-4 text-amber-600" />}
                      {client.hasCreditAccess && <Unlock className="w-4 h-4 text-green-600" />}
                    </div>
                  </td>
                  <td className="p-4 flex flex-wrap gap-2">
                    {client.status === ClientStatus.CREATED && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(client.clientId, ClientStatus.CREDENTIALS_SENT)}>Mark Credentials Sent</Button>
                    )}
                    {(client as any).reopenStatus === 'REG_REOPEN_PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={statusChangingId === client.clientId}
                        onClick={() => approveReopenRequest(client.clientId)}
                      >
                        Approve Reopen
                      </Button>
                    )}
                    {(client as any).creditReopenStatus === 'CREDIT_REOPEN_PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={statusChangingId === client.clientId}
                        onClick={() => approveCreditReopen(client.clientId)}
                      >
                        Approve Credit Reopen
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openClientForm(client.uid)}><Eye className="w-4 h-4"/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
