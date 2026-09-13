import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  QrCode, 
  Camera, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { generateQr, getQrStatus, verifyQr } from '../services/exchangeService';
import GlassCard from './ui/GlassCard';

export default function HandoverQrModal({ transaction, currentUser, onClose, onVerified }) {
  const isOwner = currentUser && Number(currentUser.id) === Number(transaction.owner_id);
  const isRequester = currentUser && Number(currentUser.id) === Number(transaction.requester_id);

  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [percentLeft, setPercentLeft] = useState(100);
  const [copied, setCopied] = useState(false);
  
  // Requester scanning state
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'manual'
  const [manualToken, setManualToken] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const pollIntervalRef = useRef(null);
  const timerRef = useRef(null);
  const scannerRef = useRef(null);

  // Fetch current QR status
  const fetchStatus = async () => {
    try {
      const res = await getQrStatus(transaction.id);
      if (res.success && res.data) {
        setQrData(res.data);
        if (res.data.status === 'VERIFIED') {
          setSuccess(true);
          if (onVerified) onVerified(transaction.id);
          clearInterval(pollIntervalRef.current);
        }
      } else {
        setQrData(null);
      }
    } catch (err) {
      console.error('Failed to get QR status:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate or Regenerate QR
  const handleGenerate = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await generateQr(transaction.id);
      if (res.success && res.data) {
        setQrData(res.data);
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(fetchStatus, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate handover QR code.');
    } finally {
      setActionLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStatus();
    pollIntervalRef.current = setInterval(fetchStatus, 2500);

    return () => {
      clearInterval(pollIntervalRef.current);
      clearInterval(timerRef.current);
      stopCameraScanner();
    };
  }, [transaction.id]);

  // Countdown timer calculation
  useEffect(() => {
    if (qrData && qrData.status === 'GENERATED' && qrData.expires_at) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const expiresTime = new Date(qrData.expires_at).getTime();
        const now = Date.now();
        const diff = expiresTime - now;

        if (diff <= 0) {
          setCountdown('Expired');
          setPercentLeft(0);
          setQrData(prev => (prev ? { ...prev, status: 'EXPIRED' } : null));
          clearInterval(timerRef.current);
        } else {
          const totalDuration = 10 * 60 * 1000; // 10 minutes
          const pct = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
          setPercentLeft(pct);

          const m = Math.floor(diff / 60000).toString().padStart(2, '0');
          const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
          setCountdown(`${m}:${s}`);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setCountdown('');
    }
  }, [qrData]);

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (!qrData?.verification_token) return;
    navigator.clipboard.writeText(qrData.verification_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Camera Scanner controls
  const startCameraScanner = () => {
    setError('');
    setScannerActive(true);
    setTimeout(() => {
      try {
        const containerId = `qr-reader-handover-${transaction.id}`;
        const scannerElement = document.getElementById(containerId);
        if (!scannerElement) return;

        scannerRef.current = new Html5QrcodeScanner(containerId, { 
          fps: 10, 
          qrbox: 240,
          aspectRatio: 1.0
        });
        scannerRef.current.render(
          async (decodedText) => {
            let token = decodedText;
            if (decodedText.startsWith('RESOURCEHUB_VERIFY:')) {
              token = decodedText.split('RESOURCEHUB_VERIFY:')[1];
            }
            await handleVerification(token);
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera scanner init failed:', err);
        setError('Camera access failed or permission denied. Please use manual token entry.');
        setScannerActive(false);
      }
    }, 250);
  };

  const stopCameraScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.error('Error clearing scanner:', e));
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  // Handle Token Verification
  const handleVerification = async (tokenToVerify) => {
    if (!tokenToVerify || !tokenToVerify.trim()) {
      setError('Please enter a verification token.');
      return;
    }

    let cleanToken = tokenToVerify.trim();
    if (cleanToken.startsWith('RESOURCEHUB_VERIFY:')) {
      cleanToken = cleanToken.split('RESOURCEHUB_VERIFY:')[1].trim();
    }

    setActionLoading(true);
    setError('');
    try {
      const res = await verifyQr(transaction.id, cleanToken);
      if (res.success) {
        setSuccess(true);
        stopCameraScanner();
        if (onVerified) onVerified(transaction.id);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Handover verification failed.';
      const status = err.response?.status;
      if (errMsg.toLowerCase().includes('expired')) {
        setError('This QR code has expired. Please ask the owner to regenerate a fresh code.');
      } else if (errMsg.toLowerCase().includes('already verified') || errMsg.toLowerCase().includes('already')) {
        setError('This exchange handover has already been verified.');
      } else if (status === 403) {
        setError('You are not authorized to scan this handover code.');
      } else {
        setError(errMsg || 'Invalid verification token. Please verify the code and try again.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-launch camera when requester tab changes
  useEffect(() => {
    if (isRequester && activeTab === 'camera' && !success && qrData?.status !== 'VERIFIED') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
  }, [activeTab, isRequester, success]);

  const qrStatus = qrData ? qrData.status : 'NONE';
  const isQrGenerated = qrStatus === 'GENERATED';
  const isQrExpired = qrStatus === 'EXPIRED';
  const isQrVerified = qrStatus === 'VERIFIED' || success;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-[#0F1424] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-6 my-auto">
        
        {/* Close button */}
        <button
          onClick={() => {
            stopCameraScanner();
            onClose();
          }}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-white/10"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/25">
              <QrCode className="h-4 w-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-400 font-display">
              {isOwner ? 'Resource Owner Handover' : 'Requester Item Verification'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-display">
            {transaction.resource_title}
          </h2>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 pt-1">
            <span>Partner: <strong className="text-slate-200">{isOwner ? transaction.requester_name : transaction.owner_name}</strong></span>
            <span>•</span>
            <span className="uppercase text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-indigo-300 font-bold border border-white/10">
              {transaction.resource_exchange_type || 'EXCHANGE'}
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 flex items-start space-x-3 text-xs leading-relaxed animate-fadeIn">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">Handover Alert</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* SUCCESS CELEBRATION SCREEN */}
        {isQrVerified ? (
          <div className="text-center py-6 space-y-5 animate-fadeIn">
            <div className="w-18 h-18 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-white font-display">Handover Verified!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {isOwner 
                  ? 'Physical exchange verified by the requester. You can now complete the transaction to finalize records and update trust scores.' 
                  : 'Physical exchange verified! The resource is now handed over. Waiting for owner to complete the transaction.'}
              </p>
            </div>

            <div className="bg-[#090D18] border border-emerald-500/30 rounded-2xl p-4 text-left space-y-2 max-w-sm mx-auto shadow-inner">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>Verification Record</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Resource: <span className="text-slate-200 font-semibold">{transaction.resource_title}</span></div>
                <div>Status: <span className="text-emerald-400 font-bold">VERIFIED & CONFIRMED</span></div>
                <div>Time: <span className="text-slate-200">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
              </div>
            </div>

            <button
              onClick={() => {
                stopCameraScanner();
                onClose();
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-8 py-3 rounded-xl cursor-pointer shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02]"
            >
              Done
            </button>
          </div>
        ) : isOwner ? (
          /* ====================================================
             1. OWNER EXPERIENCE
             ==================================================== */
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading handover security status...</p>
              </div>
            ) : !isQrGenerated || isQrExpired ? (
              /* Generate / Regenerate CTA view */
              <div className="bg-[#090D18] border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-inner">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  {isQrExpired ? <Clock className="h-7 w-7 text-rose-400" /> : <QrCode className="h-7 w-7" />}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white font-display">
                    {isQrExpired ? 'QR Code Expired' : 'Ready for In-Person Handover'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {isQrExpired 
                      ? 'The previous handover QR code expired after 10 minutes. Click below to generate a fresh, secure code for the requester.'
                      : 'Generate a secure, time-limited QR code. Meet with the requester and have them scan it to confirm physical item exchange.'}
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/25 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>{isQrExpired ? 'Regenerate New QR Code' : 'Generate Handover QR'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Active Generated QR Code Display */
              <div className="space-y-5">
                {/* Visual QR Card */}
                <div className="bg-[#090D18] border border-indigo-500/30 rounded-2xl p-6 flex flex-col items-center space-y-4 shadow-2xl relative overflow-hidden">
                  
                  {/* Subtle top indicator */}
                  <div className="flex items-center space-x-2 bg-indigo-950/80 border border-indigo-500/30 px-3 py-1 rounded-full text-[11px] font-semibold text-indigo-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Verification Ready</span>
                  </div>

                  {/* QR Canvas */}
                  <div className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-white">
                    <QRCodeCanvas 
                      value={`RESOURCEHUB_VERIFY:${qrData.verification_token}`}
                      size={200}
                      level="H"
                      marginSize={1}
                      bgColor="#ffffff"
                      fgColor="#0a0e1a"
                    />
                  </div>

                  {/* Countdown Timer with Progress Bar */}
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>Valid for</span>
                      </span>
                      <span className={`font-mono font-bold ${percentLeft < 20 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                        {countdown || '10:00'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          percentLeft < 20 ? 'bg-rose-500' : percentLeft < 50 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${percentLeft}%` }}
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <p className="text-[11px] text-slate-400 text-center max-w-xs leading-relaxed">
                    Show this screen to <strong className="text-slate-200">{transaction.requester_name}</strong>. Their scan will instantly confirm the exchange.
                  </p>
                </div>

                {/* Manual Code Fallback & Regenerate Row */}
                <div className="bg-[#090D18] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-inner">
                  <div className="truncate text-left">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Manual Backup Code</span>
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[200px] block">
                      {qrData.verification_token ? `${qrData.verification_token.slice(0, 16)}...` : 'Generating...'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={handleCopyToken}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-white/10 cursor-pointer transition-colors"
                      title="Copy full token"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={handleGenerate}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold flex items-center space-x-1 border border-indigo-500/30 cursor-pointer transition-colors"
                      title="Regenerate QR"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : (
          /* ====================================================
             2. REQUESTER EXPERIENCE
             ==================================================== */
          <div className="space-y-5">
            {/* Step-by-step instructions */}
            <div className="bg-[#090D18] border border-white/10 rounded-2xl p-4 text-xs space-y-2 text-slate-300 shadow-inner">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase text-[10px] tracking-wider">
                <Info className="h-3.5 w-3.5" />
                <span>Handover Instructions</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li>Meet the resource owner in person at your agreed campus location.</li>
                <li>Inspect the physical item to verify it matches descriptions and condition.</li>
                <li>Scan the owner's handover QR code to confirm safe transfer.</li>
              </ol>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#090D18] p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Camera Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Manual Token</span>
              </button>
            </div>

            {/* TAB 1: Camera Scanner View */}
            {activeTab === 'camera' && (
              <div className="space-y-4 animate-fadeIn">
                <div 
                  id={`qr-reader-handover-${transaction.id}`} 
                  className="overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-black min-h-[220px] shadow-2xl"
                />

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Aim camera at the owner's screen</span>
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Restart Camera
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Manual Token Fallback */}
            {activeTab === 'manual' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                    Handover Verification Code
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Paste the verification code (e.g. from owner)"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#090D18] border border-white/10 focus:border-indigo-500 rounded-2xl text-slate-100 placeholder-slate-500 outline-none text-xs font-mono shadow-inner"
                    />
                    
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setManualToken(text);
                        } catch (e) {}
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer font-medium"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Paste from clipboard</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleVerification(manualToken)}
                  disabled={actionLoading || !manualToken.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify Handover</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
