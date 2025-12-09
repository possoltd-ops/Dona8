import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Smartphone, Tablet, Terminal, Check, ChevronRight, CreditCard, Send, RotateCcw, Search, MapPin, AlertCircle, Landmark, Sparkles } from 'lucide-react';

// --- STYLES ---
// Minimal tailwind-like styles via inline objects for simplicity in this env
const styles = {
  container: "min-h-screen bg-gray-100 font-sans text-gray-800",
  card: "bg-white shadow-lg rounded-xl overflow-hidden",
  button: "bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
  secondaryButton: "bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
  input: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none",
  label: "block text-sm font-medium text-gray-700 mb-1",
  header: "bg-slate-900 text-white p-4 flex justify-between items-center",
  navBtn: "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
  activeNav: "bg-blue-500 text-white",
  inactiveNav: "text-slate-300 hover:text-white hover:bg-slate-800",
};

// --- MOCK BACKEND DATABASE ---
// This simulates the Node.js/Postgres backend in the browser memory
const MockDB = {
  donations: [] as any[],
  declarations: [] as any[],
  
  createDonation: async (amount: number, phone: string) => {
    await new Promise(r => setTimeout(r, 800)); // Network delay
    
    // Simulate error for specific number for testing
    if (phone === '00000') {
        throw new Error("Simulated backend error");
    }

    const token = Math.random().toString(36).substring(7);
    const donation = {
      id: crypto.randomUUID(),
      amountPence: amount,
      phoneNumber: phone,
      giftAidToken: token,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    MockDB.donations.push(donation);
    return donation;
  },

  getDonation: async (token: string) => {
    await new Promise(r => setTimeout(r, 300));
    return MockDB.donations.find(d => d.giftAidToken === token);
  },

  completeGiftAid: async (token: string, data: any) => {
    await new Promise(r => setTimeout(r, 800));
    const donation = MockDB.donations.find(d => d.giftAidToken === token);
    if (!donation) throw new Error('Not found');
    donation.status = 'COMPLETED';
    MockDB.declarations.push({ ...data, donationId: donation.id });
    return true;
  }
};

// --- MOCK POSTCODE SERVICE ---
const MockPostcodeService = {
  lookup: async (postcode: string) => {
    await new Promise(r => setTimeout(r, 600)); // Network delay
    const pc = postcode.replace(/\s/g, '').toUpperCase();
    
    // Easter egg for demo
    if (pc === 'SW1A1AA') {
        return [
            { line1: 'Buckingham Palace', line2: '', city: 'London', postcode: 'SW1A 1AA' },
            { line1: 'The Royal Mews', line2: 'Buckingham Palace', city: 'London', postcode: 'SW1A 1AA' }
        ];
    }
    
    // Generic generation based on input
    const valid = pc.length > 4;
    if (!valid) throw new Error('Invalid postcode');

    return [
        { line1: '1 High Street', line2: '', city: 'Sampletown', postcode: postcode.toUpperCase() },
        { line1: 'Flat 4, The Gables', line2: '12 High Street', city: 'Sampletown', postcode: postcode.toUpperCase() },
        { line1: 'Riverside House', line2: 'High Street', city: 'Sampletown', postcode: postcode.toUpperCase() },
    ];
  }
};

// --- REACT COMPONENTS ---

// 1. ANDROID KIOSK SIMULATOR
const KioskApp = ({ onSmsSent }: { onSmsSent: (token: string, amount: number) => void }) => {
  const [screen, setScreen] = useState<'START' | 'AMOUNT' | 'CUSTOM' | 'PAYMENT' | 'PHONE' | 'SUCCESS'>('START');
  const [amount, setAmount] = useState<number>(0);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const amounts = [200, 500, 1000, 2000, 5000, 10000];

  const handlePay = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000)); // Fake payment processing
    setLoading(false);
    setScreen('PHONE');
  };

  const handleCustomSubmit = () => {
    const val = parseFloat(customInput);
    if (!isNaN(val) && val > 0) {
      setAmount(Math.round(val * 100));
      setScreen('PAYMENT');
    }
  };

  const handleSendSms = async () => {
    if (!phone) return;
    setLoading(true);
    setSmsError(null);

    try {
        const donation = await MockDB.createDonation(amount, phone);
        setLoading(false);
        setScreen('SUCCESS');
        onSmsSent(donation.giftAidToken, amount);
        
        // Reset kiosk after delay
        setTimeout(() => {
          setScreen('START');
          setAmount(0);
          setPhone('');
          setSmsError(null);
          setCustomInput('');
        }, 8000);
    } catch (err) {
        setLoading(false);
        setSmsError("Failed to send SMS. Please check internet connection and try again.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-800 h-[650px] relative flex flex-col">
        {/* Kiosk Status Bar */}
        <div className="bg-slate-800 h-6 w-full flex justify-end px-4 items-center shrink-0">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>

        {/* Screens */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          
          {screen === 'START' && (
             <div 
               onClick={() => setScreen('AMOUNT')}
               className="absolute inset-0 bg-gradient-to-b from-orange-500 to-red-900 flex flex-col items-center justify-center text-center cursor-pointer p-6 space-y-8 animate-in fade-in duration-500"
             >
                {/* Decorative Pattern Background */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
                
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="w-32 h-32 rounded-full bg-amber-100/10 border-4 border-amber-300 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                        <Landmark size={64} className="text-amber-300" />
                    </div>
                    
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-white tracking-wide drop-shadow-md">
                            Sri Balaji Temple
                        </h1>
                        <div className="h-1 w-24 bg-amber-400 mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="mt-12 animate-bounce">
                        <p className="text-amber-200 uppercase tracking-widest font-bold text-lg">Touch to Donate</p>
                    </div>
                </div>

                <div className="absolute bottom-8 left-0 right-0 text-center">
                    <p className="text-white/60 text-sm font-medium flex items-center justify-center gap-2">
                        <Sparkles size={14} className="text-amber-400"/> 
                        May your donation bring blessings
                        <Sparkles size={14} className="text-amber-400"/>
                    </p>
                </div>
             </div>
          )}

          {screen === 'AMOUNT' && (
            <div className="w-full h-full p-6 flex flex-col animate-in fade-in slide-in-from-bottom-4 bg-slate-50">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setScreen('START')} className="text-slate-400 hover:text-slate-600">Back</button>
                <h2 className="text-xl font-bold text-slate-800">Select Donation</h2>
                <div className="w-8"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {amounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setAmount(amt); setScreen('PAYMENT'); }}
                    className="h-20 bg-white hover:bg-orange-50 border-2 border-slate-200 hover:border-orange-500 rounded-xl text-2xl font-bold text-slate-700 hover:text-orange-700 transition-all active:scale-95 shadow-sm"
                  >
                    £{(amt/100).toFixed(0)}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setScreen('CUSTOM')}
                className="w-full py-4 mt-auto text-slate-600 font-medium bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-colors"
              >
                Other Amount
              </button>
            </div>
          )}

          {screen === 'CUSTOM' && (
            <div className="w-full h-full p-6 flex flex-col animate-in slide-in-from-right-4 bg-slate-50">
              <h2 className="text-2xl font-bold text-center text-slate-800 mt-8 mb-8">Enter Amount</h2>
              <div className="relative mb-8">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl text-slate-400 font-light">£</span>
                <input 
                  type="number" 
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                  className="w-full text-center text-5xl font-bold p-6 pl-12 rounded-2xl border-2 border-orange-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-none text-slate-800 bg-white shadow-sm"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <button 
                  onClick={() => { setScreen('AMOUNT'); setCustomInput(''); }}
                  className="py-4 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleCustomSubmit}
                  disabled={!customInput || parseFloat(customInput) <= 0}
                  className="py-4 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  Donate
                </button>
              </div>
            </div>
          )}

          {screen === 'PAYMENT' && (
            <div className="w-full p-6 text-center space-y-6 animate-in zoom-in-95">
              <h3 className="text-xl text-slate-600">Donating to Sri Balaji Temple</h3>
              <div className="text-6xl font-bold text-slate-900 tracking-tight">£{(amount/100).toFixed(2)}</div>
              
              <div className="h-40 w-full flex items-center justify-center">
                 {loading ? (
                   <div className="flex flex-col items-center gap-3">
                     <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-slate-600 font-medium animate-pulse">Processing Payment...</p>
                   </div>
                 ) : (
                   <button 
                    onClick={handlePay}
                    className="w-full bg-slate-900 text-white py-5 rounded-xl flex items-center justify-center gap-3 text-lg font-bold shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
                   >
                     <CreditCard size={24} />
                     Tap Card to Pay
                   </button>
                 )}
              </div>
              {!loading && (
                <button onClick={() => setScreen('AMOUNT')} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
              )}
            </div>
          )}

          {screen === 'PHONE' && (
            <div className="w-full h-full p-6 flex flex-col animate-in slide-in-from-right-4">
              <div className="text-center mt-4">
                <h2 className="text-xl font-bold text-slate-900">Add Gift Aid</h2>
                <p className="text-slate-500 text-sm mt-2">Enter mobile number to receive a secure link.</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07700 900000"
                  className={`w-full text-center text-3xl tracking-widest p-4 border-b-2 ${smsError ? 'border-red-500 text-red-600' : 'border-orange-500'} focus:outline-none bg-transparent placeholder:text-slate-300`}
                  autoFocus
                />

                {smsError && (
                    <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-200 flex items-center justify-center gap-2 animate-in zoom-in-95">
                        <AlertCircle size={16} />
                        {smsError}
                    </div>
                )}

                <div className="mt-6 flex items-start justify-center gap-2 text-xs text-slate-500 px-2">
                  <input type="checkbox" className="mt-0.5 accent-orange-600" defaultChecked />
                  <span>Send me a receipt by SMS</span>
                </div>
              </div>

              <div className="space-y-3 mt-auto">
                <button 
                  onClick={handleSendSms}
                  disabled={loading || phone.length < 5}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Sending...' : 'Send Gift Aid Link'}
                </button>
                
                <button onClick={() => setScreen('SUCCESS')} className="w-full py-3 text-slate-400 text-sm hover:text-slate-600">Skip</button>
              </div>
            </div>
          )}

          {screen === 'SUCCESS' && (
            <div className="w-full p-6 text-center space-y-6 animate-in zoom-in-50 flex flex-col items-center justify-center h-full">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                <Check size={48} strokeWidth={4} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Thank You!</h2>
                <p className="text-slate-600 mt-1">Your donation was successful.</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-xl text-orange-800 text-sm font-medium border border-orange-100 w-full max-w-xs">
                ✓ Link sent to {phone}
              </div>
              <p className="text-sm text-slate-400 mt-8">Screen will reset shortly...</p>
            </div>
          )}

        </div>
      </div>
      <p className="mt-4 text-slate-400 text-sm font-mono">Simulated Android Kiosk Device</p>
    </div>
  );
};

// 2. GIFT AID WEB FORM (THE MAIN DELIVERABLE)
const GiftAidWeb = ({ token }: { token: string | null }) => {
  const [donation, setDonation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  // Address lookup state
  const [lookingUp, setLookingUp] = useState(false);
  const [addressResults, setAddressResults] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    isUkTaxpayer: false,
    coversFuture: false,
    coversPast: false,
  });

  useEffect(() => {
    if (!token) {
      setError("No token provided");
      setLoading(false);
      return;
    }
    
    // Simulate GET /api/gift-aid/:token
    MockDB.getDonation(token).then(d => {
      if (!d) setError("Invalid or expired link.");
      else if (d.status === 'COMPLETED') setError("Gift Aid already added for this donation.");
      else setDonation(d);
      setLoading(false);
    });
  }, [token]);

  const handleLookup = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!formData.postcode || formData.postcode.length < 4) return;
    
    setLookingUp(true);
    setAddressResults([]);
    
    try {
        const results = await MockPostcodeService.lookup(formData.postcode);
        setAddressResults(results);
    } catch(err) {
        // Fallback or error indication
    } finally {
        setLookingUp(false);
    }
  };

  const selectAddress = (addr: any) => {
    setFormData({
        ...formData,
        addressLine1: addr.line1,
        addressLine2: addr.line2,
        city: addr.city,
        postcode: addr.postcode
    });
    setAddressResults([]); // Clear results to hide list
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isUkTaxpayer) {
      alert("You must be a UK Taxpayer to claim Gift Aid.");
      return;
    }
    
    setLoading(true);
    // Simulate POST /api/gift-aid
    try {
      await MockDB.completeGiftAid(token!, formData);
      setCompleted(true);
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (error) return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="bg-red-50 text-red-700 p-6 rounded-xl max-w-sm">
        <h3 className="font-bold text-lg mb-2">Error</h3>
        <p>{error}</p>
      </div>
    </div>
  );

  if (completed) return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-green-50">
      <div className="w-16 h-16 bg-green-200 text-green-700 rounded-full flex items-center justify-center mb-4">
        <Check size={32} />
      </div>
      <h2 className="text-2xl font-bold text-green-900 mb-2">Gift Aid Added</h2>
      <p className="text-green-800">Thank you. Your declaration has been recorded successfully.</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen sm:min-h-0 sm:shadow-sm sm:my-8 sm:rounded-xl overflow-hidden">
      <div className="bg-orange-600 text-white p-6 relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
        <div className="relative z-10">
            <h1 className="text-2xl font-bold font-serif">Add Gift Aid</h1>
            <p className="text-orange-100 mt-2">Boost your donation of <strong className="text-white">£{(donation.amountPence/100).toFixed(2)}</strong> by 25p for every £1 you donate.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">Your Details</div>
        
        <div>
          <label className={styles.label}>Full Name</label>
          <input required type="text" className={styles.input} placeholder="e.g. John Smith"
            value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
        </div>

        {/* Address Section */}
        <div className="space-y-4 pt-2 border-t border-slate-100 mt-2">
            
            {/* Postcode Lookup */}
            <div>
              <label className={styles.label}>Postcode</label>
              <div className="flex gap-2">
                <input required type="text" className={`${styles.input} uppercase`} placeholder="SW1A 1AA"
                  value={formData.postcode} onChange={e => setFormData({...formData, postcode: e.target.value})} />
                <button 
                    type="button" 
                    onClick={handleLookup}
                    disabled={lookingUp || !formData.postcode}
                    className="bg-slate-800 text-white px-4 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                >
                    {lookingUp ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Search size={18}/>}
                    Find
                </button>
              </div>
            </div>

            {/* Address Selector */}
            {addressResults.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden animate-in slide-in-from-top-2">
                    <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Select your address</div>
                    {addressResults.map((addr, idx) => (
                        <button 
                            key={idx} 
                            type="button"
                            onClick={() => selectAddress(addr)}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 hover:text-orange-700 border-t border-slate-200 text-sm flex items-start gap-2"
                        >
                            <MapPin size={16} className="mt-0.5 shrink-0 opacity-50"/>
                            <div>
                                <div className="font-medium">{addr.line1}</div>
                                <div className="text-xs opacity-75">{addr.line2 ? `${addr.line2}, ` : ''}{addr.city}</div>
                            </div>
                        </button>
                    ))}
                    <button 
                        type="button"
                        onClick={() => setAddressResults([])}
                        className="w-full text-left px-4 py-2 bg-slate-100 text-xs text-slate-500 hover:bg-slate-200 border-t border-slate-200"
                    >
                        Enter manually instead...
                    </button>
                </div>
            )}

            <div>
              <label className={styles.label}>Address Line 1</label>
              <input required type="text" className={styles.input} placeholder="House number and street"
                value={formData.addressLine1} onChange={e => setFormData({...formData, addressLine1: e.target.value})} />
            </div>
            
            <div>
              <label className={styles.label}>Address Line 2 <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" className={styles.input} placeholder=""
                value={formData.addressLine2} onChange={e => setFormData({...formData, addressLine2: e.target.value})} />
            </div>

            <div>
                <label className={styles.label}>City</label>
                <input required type="text" className={styles.input}
                value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" required checked={formData.isUkTaxpayer} 
              onChange={e => setFormData({...formData, isUkTaxpayer: e.target.checked})}
              className="mt-1 w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300 accent-orange-600" />
            <span className="text-sm text-slate-700 leading-relaxed">
              <strong>I am a UK taxpayer</strong> and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.
            </span>
          </label>
        </div>

        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formData.coversFuture} 
              onChange={e => setFormData({...formData, coversFuture: e.target.checked})}
              className="w-4 h-4 text-orange-600 rounded accent-orange-600" />
            <span className="text-sm text-slate-600">Apply to future donations</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formData.coversPast} 
              onChange={e => setFormData({...formData, coversPast: e.target.checked})}
              className="w-4 h-4 text-orange-600 rounded accent-orange-600" />
            <span className="text-sm text-slate-600">Apply to donations in past 4 years</span>
          </label>
        </div>

        <button type="submit" disabled={loading} className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Confirm Gift Aid'}
        </button>

        <p className="text-xs text-center text-slate-400 mt-4">
          Charity Reg No. 123456 • Sri Balaji Temple
        </p>
      </form>
    </div>
  );
};

// --- SIMULATOR CONTAINER (Main Entry) ---
const Simulator = () => {
  const [activeTab, setActiveTab] = useState<'KIOSK' | 'PHONE' | 'BACKEND'>('KIOSK');
  const [pendingSms, setPendingSms] = useState<{token: string, amount: number} | null>(null);

  const handleSmsSent = (token: string, amount: number) => {
    setPendingSms({ token, amount });
    // Show notification
    const notification = document.createElement('div');
    notification.className = "fixed top-4 right-4 bg-slate-900 text-white px-6 py-4 rounded-lg shadow-2xl z-50 animate-in slide-in-from-top-2 flex flex-col gap-2";
    notification.innerHTML = `
      <div class="font-bold flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> SMS Sent</div>
      <div class="text-sm opacity-90">Click to open on phone</div>
    `;
    notification.onclick = () => {
      setActiveTab('PHONE');
      notification.remove();
    };
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 6000);
  };

  return (
    <div className={styles.container}>
      {/* Simulation Header */}
      <div className={styles.header}>
        <div className="flex items-center gap-2 font-bold text-lg">
          <RotateCcw className="text-blue-400" />
          <span>Donation System Demo</span>
        </div>
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('KIOSK')}
            className={`${styles.navBtn} ${activeTab === 'KIOSK' ? styles.activeNav : styles.inactiveNav}`}
          >
            <span className="flex items-center gap-2"><Tablet size={16}/> Kiosk App</span>
          </button>
          <button 
            onClick={() => setActiveTab('PHONE')}
            className={`${styles.navBtn} ${activeTab === 'PHONE' ? styles.activeNav : styles.inactiveNav}`}
          >
            <span className="flex items-center gap-2"><Smartphone size={16}/> Donor Phone</span>
          </button>
          <button 
            onClick={() => setActiveTab('BACKEND')}
            className={`${styles.navBtn} ${activeTab === 'BACKEND' ? styles.activeNav : styles.inactiveNav}`}
          >
             <span className="flex items-center gap-2"><Terminal size={16}/> Backend DB</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="h-[calc(100vh-64px)] overflow-auto">
        
        {activeTab === 'KIOSK' && (
          <KioskApp onSmsSent={handleSmsSent} />
        )}

        {activeTab === 'PHONE' && (
          <div className="min-h-full bg-gray-200 flex items-center justify-center p-4">
            <div className="w-full max-w-[400px] bg-white h-[700px] rounded-[3rem] border-[12px] border-black shadow-2xl overflow-hidden relative">
              {/* iPhone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
              
              {/* Mobile Browser Address Bar */}
              <div className="bg-slate-100 p-3 pt-8 border-b flex items-center gap-2 text-xs text-slate-500">
                <div className="bg-white px-3 py-1 rounded flex-1 text-center shadow-sm">
                  charity.org/gift-aid?token=...
                </div>
              </div>

              {/* Web Content */}
              <div className="h-full overflow-y-auto pb-20">
                {pendingSms ? (
                   <GiftAidWeb token={pendingSms.token} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                    <Smartphone size={48} className="mb-4 opacity-50"/>
                    <p>No active Gift Aid link.</p>
                    <p className="text-sm mt-2">Make a donation on the Kiosk tab to receive an SMS.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'BACKEND' && (
          <div className="p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Database State</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span> 
                  Donations Table
                </h3>
                <div className="bg-white rounded-xl shadow overflow-hidden border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Token</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {MockDB.donations.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center text-gray-400">No records yet</td></tr>
                      ) : (
                        MockDB.donations.map(d => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-xs">{d.id.substring(0,8)}...</td>
                            <td className="p-3">£{(d.amountPence/100).toFixed(2)}</td>
                            <td className="p-3">{d.phoneNumber}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${d.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {d.status}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-xs text-gray-400">{d.giftAidToken}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                   <span className="w-3 h-3 bg-purple-500 rounded-full"></span> 
                   Declarations Table
                </h3>
                <div className="bg-white rounded-xl shadow overflow-hidden border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Address</th>
                        <th className="p-3">Postcode</th>
                        <th className="p-3">Taxpayer?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                       {MockDB.declarations.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-gray-400">No records yet</td></tr>
                      ) : (
                        MockDB.declarations.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 font-medium">{d.fullName}</td>
                            <td className="p-3">{d.addressLine1}, {d.city}</td>
                            <td className="p-3 font-mono">{d.postcode}</td>
                            <td className="p-3">{d.isUkTaxpayer ? 'Yes' : 'No'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Simulator />);