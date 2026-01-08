import React, { useEffect, useState } from 'react';
import { auth, db } from './services/firebase';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// Removed modular firestore imports
import { ClientDashboard } from './pages/ClientDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Input, Button, Card } from './components/ui/Components';

const ADMIN_EMAIL = "accounts@dmdligts.com";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'client' | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Determine role
          if (currentUser.email === ADMIN_EMAIL) {
              setRole('admin');
          } else {
              // Check if client exists
              const clientDoc = await db.collection('clients').doc(currentUser.uid).get();
              if (clientDoc.exists) {
                  setRole('client');
              } else {
                  // Fallback: If not found in clients, default to admin for the owner email
                  setRole('admin'); 
              }
          }
        } catch (error: any) {
          console.error("Error determining role:", error);
          if (error.code === 'permission-denied') {
             // If we are denied reading 'clients', but email is ADMIN_EMAIL, allow as admin
             if (currentUser.email === ADMIN_EMAIL) {
               setRole('admin');
             } else {
               setGlobalError("Access Denied: You do not have permission to access the system.");
             }
          } else {
             setGlobalError("System Error: " + error.message);
          }
        }
      } else {
        setRole(null);
        setGlobalError(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      alert("Login failed: " + err.message);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-stone-50">Loading EliteForms...</div>;

  if (globalError) {
     return (
       <div className="h-screen flex items-center justify-center bg-red-50 p-4">
         <div className="text-center">
            <h2 className="text-xl font-bold text-red-700 mb-2">System Error</h2>
            <p className="text-red-600 mb-4">{globalError}</p>
            <Button onClick={handleSignOut}>Sign Out</Button>
         </div>
       </div>
     )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <Card className="w-full max-w-md p-8" title="EliteForms Login">
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
          <p className="text-xs text-center text-stone-400 mt-4">Restricted Access Portal</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      {role === 'admin' && <AdminDashboard />}
      {role === 'client' && <ClientDashboard />}
    </>
  );
}

export default App;