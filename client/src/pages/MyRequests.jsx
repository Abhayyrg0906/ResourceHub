import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Info, 
  Clock, 
  Sparkles, 
  QrCode, 
  AlertTriangle, 
  X, 
  Camera, 
  Star 
} from 'lucide-react';
import { 
  getRequests, 
  cancelRequest, 
  acceptRequest, 
  rejectRequest, 
  completeRequest, 
  generateQr, 
  verifyQr, 
  getQrStatus, 
  createReview, 
  getTransactionReviews 
} from '../services/exchangeService';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// ----------------------------------------------------
// Unified Handover Verification Section (M7 QR Handover)
// ----------------------------------------------------
function HandoverVerificationSection({ req, currentUser, onVerified, onScanTrigger, verifiedList }) {
  const isOwner = currentUser && Number(currentUser.id) === Number(req.owner_id);
  const isRequester = currentUser && Number(currentUser.id) === Number(req.requester_id);
  const isAccepted = req.status.toUpperCase() === 'ACCEPTED';
  
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const pollIntervalRef = useRef(null);
  const timerRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await getQrStatus(req.id);
      if (res.success && res.data) {
        setQrData(res.data);
        if (res.data.status === 'VERIFIED') {
          onVerified(req.id);
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

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateQr(req.id);
      if (res.success) {
        await fetchStatus();
        // Start polling status check every 3s
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(fetchStatus, 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate verification QR.');
    } finally {
      setLoading(false);
    }
  };

  // Poll status on mount if ACCEPTED
  useEffect(() => {
    if (isAccepted) {
      fetchStatus();
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(fetchStatus, 3000);
    }
    return () => {
      clearInterval(pollIntervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [req.id, isAccepted]);

  // Handle countdown timer for owner QR code
  useEffect(() => {
    if (qrData && qrData.status === 'GENERATED' && qrData.expires_at) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const diff = new Date(qrData.expires_at) - new Date();
        if (diff <= 0) {
          setCountdown('Expired');
          setQrData(prev => prev ? { ...prev, status: 'EXPIRED' } : null);
          clearInterval(timerRef.current);
        } else {
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

  if (!isAccepted) return null;
  if (loading) return <div className="text-xs text-slate-500 py-2">Loading handover status...</div>;

  const qrStatus = qrData ? qrData.status : 'NONE';
  const isQrVerified = qrStatus === 'VERIFIED' || verifiedList[req.id];
  const isQrExpired = qrStatus === 'EXPIRED';
  const isQrGenerated = qrStatus === 'GENERATED';

  // 1. OWNER VIEW
  if (isOwner) {
    if (isQrVerified) {
      return (
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-center space-x-3 text-emerald-400 mt-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 animate-bounce" />
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider">Handover Verified!</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Physical exchange verified successfully. You may complete the transaction.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="border-t border-[#242f4c]/40 pt-4 mt-4 space-y-4">
        <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">Exchange Handover</h4>
        
        {!isQrGenerated || isQrExpired ? (
          <div className="bg-slate-900/60 border border-[#242f4c] rounded-2xl p-5 text-center space-y-3 max-w-xs mx-auto">
            <p className="text-xs text-slate-400 leading-relaxed">
              {isQrExpired ? 'QR expired.' : 'You are the resource owner.'}
            </p>
            <button
              onClick={handleGenerate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
            >
              {isQrExpired ? 'Generate New QR' : 'Generate Handover QR'}
            </button>
            <div className="text-[10px] text-slate-500">
              Status: {isQrExpired ? 'QR expired' : 'Waiting for requester'}
            </div>
          </div>
        ) : (
          <div className="bg-[#0b0e17] border border-[#242f4c] rounded-2xl p-5 flex flex-col items-center space-y-4 text-center max-w-xs mx-auto shadow-lg">
            <h5 className="text-[11px] font-bold text-slate-300">Handover QR Code</h5>
            <div className="bg-white p-3 rounded-2xl">
              <QRCodeCanvas 
                value={`RESOURCEHUB_VERIFY:${qrData.verification_token}`} 
                size={160} 
                bgColor="#ffffff" 
                fgColor="#000000" 
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Expires in: <span className="text-rose-400 font-bold">{countdown}</span></span>
              <span className="text-[10px] text-slate-500">Status: Waiting for requester</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. REQUESTER VIEW
  if (isRequester) {
    if (isQrVerified) {
      return (
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-center space-x-3 text-emerald-400 mt-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider">Handover Verified!</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Physical handover verified successfully. Waiting for completion.</p>
          </div>
        </div>
      );
    }

    if (isQrExpired) {
      return (
        <div className="border-t border-[#242f4c]/40 pt-4 mt-4 space-y-3">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">Exchange Handover</h4>
          <div className="bg-slate-900/60 border border-[#242f4c] rounded-2xl p-4 space-y-2 text-center max-w-xs mx-auto">
            <div className="flex items-center justify-center space-x-2 text-rose-400 text-xs font-bold uppercase">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span className="text-rose-400">QR Expired</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              QR expired. Ask the resource owner to generate a new QR.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="border-t border-[#242f4c]/40 pt-4 mt-4 space-y-4">
        <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">Exchange Handover</h4>
        
        <div className="bg-slate-900/60 border border-[#242f4c] rounded-2xl p-5 text-center space-y-3 max-w-xs mx-auto shadow-md">
          <p className="text-xs text-slate-400 leading-relaxed">
            Meet the resource owner and scan their QR code.
          </p>
          
          <div className="space-y-2">
            <button
              onClick={onScanTrigger}
              disabled={!isQrGenerated}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1b233a] disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wide cursor-pointer disabled:cursor-not-allowed flex items-center justify-center space-x-1 shadow-md shadow-indigo-600/10"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Scan QR Handover</span>
            </button>
            <div className="text-[10px] text-slate-500 font-semibold">
              Status: {isQrGenerated ? 'Waiting for QR verification' : 'Waiting for owner to generate QR'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ----------------------------------------------------
// Completed Exchange Review Display Section (M8.3)
// ----------------------------------------------------
function CompletedReviewSection({ req, currentUser, reviews, onOpenReviewModal }) {
  const isOwner = currentUser && Number(currentUser.id) === Number(req.owner_id);
  const isRequester = currentUser && Number(currentUser.id) === Number(req.requester_id);
  
  if (!currentUser || (!isOwner && !isRequester)) return null;

  // Find if current user has already submitted a review for this transaction
  const myReview = reviews && reviews.find(r => 
    Number(r.reviewer?.id || r.reviewer_id) === Number(currentUser.id)
  );

  if (myReview) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
        <div className="flex items-center space-x-3 text-emerald-400">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider">Review Submitted ✓</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {myReview.review_text ? `"${myReview.review_text}"` : 'Thank you for rating your exchange partner.'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-[#242f4c] flex-shrink-0">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3.5 w-3.5 ${
                star <= myReview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
              }`}
            />
          ))}
          <span className="text-[11px] font-bold text-amber-300 ml-1.5">{myReview.rating}.0</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-[#242f4c] rounded-2xl p-4 sm:p-5 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Exchange Completed ✓</span>
        </div>
        <p className="text-xs text-slate-200 font-semibold">How was your exchange experience?</p>
        <p className="text-[11px] text-slate-400">Leave a review to help build trusted campus exchanges.</p>
      </div>

      <button
        onClick={() => onOpenReviewModal(req)}
        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer flex-shrink-0 hover:scale-[1.02]"
      >
        <Star className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
        <span>Leave a Review</span>
      </button>
    </div>
  );
}

// ----------------------------------------------------
// Review Submission Modal (M8.3)
// ----------------------------------------------------
function ReviewModal({ transaction, currentUser, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const isOwner = currentUser && Number(currentUser.id) === Number(transaction.owner_id);
  const partnerName = isOwner ? transaction.requester_name : transaction.owner_name;

  const ratingLabels = {
    1: 'Poor - Bad experience',
    2: 'Fair - Needs improvement',
    3: 'Good - Met expectations',
    4: 'Very Good - Smooth handover',
    5: 'Excellent - Highly recommended!'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a rating from 1 to 5.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await createReview({
        transaction_id: transaction.id,
        rating: Number(rating),
        review_text: reviewText.trim() ? reviewText.trim() : undefined
      });

      if (res.success) {
        setSuccessInfo(res.data);
        setTimeout(() => {
          onSuccess(transaction.id, res.data);
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      const status = err.response?.status;
      if (status === 409) {
        setError('You have already reviewed this exchange.');
      } else if (status === 400) {
        setError(err.response?.data?.message || 'Reviews can only be submitted after the exchange is completed.');
      } else if (status === 403) {
        setError('You are not authorized to review this exchange.');
      } else {
        setError(err.response?.data?.message || 'Unable to submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d111c]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#161d30] border border-[#242f4c] rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl space-y-6">
        
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {successInfo ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-white tracking-tight">Review Submitted ✓</h3>
            <p className="text-xs text-slate-300">Thank you for rating your exchange partner!</p>
            {successInfo.reviewed_user?.trust_score !== undefined && (
              <div className="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1">
                <span className="text-indigo-400 font-bold block uppercase tracking-wider text-[10px]">Recipient Trust Updated</span>
                <span className="text-sm font-extrabold text-white">Trust Score: {Number(successInfo.reviewed_user.trust_score).toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Leave a Review</h2>
              <p className="text-xs text-slate-400">
                Rate your exchange experience with <span className="text-slate-200 font-semibold">{partnerName}</span> for <span className="text-indigo-300 font-semibold">{transaction.resource_title}</span>.
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-2.5 text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Interactive 1-5 Star Rating */}
            <div className="space-y-2 text-center bg-[#0d111c]/60 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Rate your experience
              </span>
              
              <div className="flex items-center justify-center space-x-2 py-1">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isHighlighted = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          isHighlighted
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600 hover:text-slate-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="h-4 text-[11px] font-medium text-amber-300">
                {ratingLabels[hoverRating || rating] || 'Select 1 to 5 stars'}
              </div>
            </div>

            {/* Optional Review Textarea */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Your Review (optional)</label>
                <span className={`text-[10px] ${reviewText.length > 450 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {reviewText.length} / 500
                </span>
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="How was the communication, item condition, and handover punctuality?"
                className="w-full px-4 py-2.5 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none text-xs resize-none transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !rating}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Review</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

// ----------------------------------------------------
// Requester QR Scanning Modal Fallback (M7)
// ----------------------------------------------------
function RequesterScanModal({ reqId, onClose, onVerified }) {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);

  const startCameraScanner = () => {
    setScannerActive(true);
    setTimeout(() => {
      try {
        scannerRef.current = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 220 });
        scannerRef.current.render(async (decodedText) => {
          let token = decodedText;
          if (decodedText.startsWith('RESOURCEHUB_VERIFY:')) {
            token = decodedText.split('RESOURCEHUB_VERIFY:')[1];
          }
          await handleVerification(token);
        }, (err) => {
          // Silent scan failure loop
        });
      } catch (err) {
        console.error('Camera scanner init failed:', err);
        setError('Camera access failed. Please use manual token input.');
        setScannerActive(false);
      }
    }, 200);
  };

  const stopCameraScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.error(e));
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleVerification = async (token) => {
    setLoading(true);
    setError('');
    try {
      const res = await verifyQr(reqId, token);
      if (res.success) {
        setSuccess(true);
        stopCameraScanner();
        setTimeout(() => {
          onVerified();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Handover verification failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d111c]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#161d30] border border-[#242f4c] rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl space-y-6">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Scan Handover QR</h2>
          <p className="text-xs text-slate-400">Scan the QR code presented by the owner to verify physical exchange.</p>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-slate-200">Exchange Verified!</h3>
            <p className="text-xs text-slate-400">Handover transaction confirmed successfully.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl px-4 py-2.5 text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Camera scanner view */}
            {scannerActive ? (
              <div className="space-y-4">
                <div id="qr-reader" className="overflow-hidden rounded-2xl border border-slate-700 bg-black"></div>
                <button
                  onClick={stopCameraScanner}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel Camera
                </button>
              </div>
            ) : (
              <button
                onClick={startCameraScanner}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 text-xs uppercase cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>Scan with Camera</span>
              </button>
            )}

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#242f4c]"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold">OR USE MANUAL CODE</span>
              <div className="flex-grow border-t border-[#242f4c]"></div>
            </div>

            {/* Manual token input fallback */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Enter Handover Verification Token</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste secure token here..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-grow px-4 py-2.5 bg-[#0d111c]/90 border border-slate-700/60 focus:border-indigo-500/80 rounded-xl text-slate-100 placeholder-slate-500 outline-none text-xs"
                />
                <button
                  onClick={() => handleVerification(tokenInput)}
                  disabled={loading || !tokenInput}
                  className="bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-750 disabled:opacity-50 cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main Exchange Requests Dashboard Component
// ----------------------------------------------------
export default function MyRequests() {
  const { user } = useAuth();
  
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Scanning state
  const [scanningReqId, setScanningReqId] = useState(null);
  
  // Review modal state
  const [reviewingTransaction, setReviewingTransaction] = useState(null);
  
  // Verified request markers (for real-time update triggers)
  const [verifiedList, setVerifiedList] = useState({});

  // Reviews list map by transaction_id: { [txId]: Array<Review> }
  const [reviewsMap, setReviewsMap] = useState({});

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const resIncoming = await getRequests({ role: 'owner' });
      const resOutgoing = await getRequests({ role: 'requester' });
      
      const incomingData = resIncoming.success ? resIncoming.data : [];
      const outgoingData = resOutgoing.success ? resOutgoing.data : [];
      
      setIncoming(incomingData);
      setOutgoing(outgoingData);

      // Pre-populate verified state maps on load for accepted requests
      const allAccepted = [...incomingData, ...outgoingData].filter(r => r.status.toUpperCase() === 'ACCEPTED');
      const verifiedMap = {};
      for (const req of allAccepted) {
        try {
          const qrRes = await getQrStatus(req.id);
          if (qrRes.success && qrRes.data && qrRes.data.status === 'VERIFIED') {
            verifiedMap[req.id] = true;
          }
        } catch (e) {
          // Silent catch for initial query fails
        }
      }
      setVerifiedList(verifiedMap);

      // Pre-populate reviews map on load for completed requests
      const allCompleted = [...incomingData, ...outgoingData].filter(r => r.status.toUpperCase() === 'COMPLETED');
      const reviewsByTx = {};
      for (const req of allCompleted) {
        try {
          const revRes = await getTransactionReviews(req.id);
          if (revRes.success && revRes.data) {
            reviewsByTx[req.id] = revRes.data;
          }
        } catch (e) {
          // Silent catch
        }
      }
      setReviewsMap(reviewsByTx);
      
    } catch (err) {
      console.error('Failed to load exchange requests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [user]);

  const handleAccept = async (id) => {
    if (window.confirm('Are you sure you want to accept this exchange request? This will reserve your resource.')) {
      setActionLoadingId(id);
      try {
        const res = await acceptRequest(id);
        if (res.success) {
          alert('Request accepted successfully. Resource reserved.');
          await fetchRequests();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to accept request.');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to reject this request?')) {
      setActionLoadingId(id);
      try {
        const res = await rejectRequest(id);
        if (res.success) {
          alert('Request rejected.');
          await fetchRequests();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to reject request.');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this pending request?')) {
      setActionLoadingId(id);
      try {
        const res = await cancelRequest(id);
        if (res.success) {
          alert('Request cancelled.');
          await fetchRequests();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to cancel request.');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleComplete = async (id) => {
    if (window.confirm('Are you sure you want to mark this transaction as completed? Both parties must verify handovers.')) {
      setActionLoadingId(id);
      try {
        const res = await completeRequest(id);
        if (res.success) {
          alert('Transaction completed successfully! Resource status updated to EXCHANGED.');
          await fetchRequests();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to complete transaction.');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleReviewSuccess = (transactionId, reviewData) => {
    // Optimistically update reviewsMap with the newly created review
    if (reviewData?.review) {
      setReviewsMap(prev => ({
        ...prev,
        [transactionId]: [...(prev[transactionId] || []), reviewData.review]
      }));
    }
    fetchRequests();
  };

  const getStatusBadge = (status) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'ACCEPTED': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'CANCELLED': return 'bg-slate-700/20 text-slate-400 border border-slate-700/60';
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const renderTerms = (req) => {
    const type = req.resource_exchange_type.toUpperCase();
    if (type === 'SELL') {
      return `Agreed price: ₹${req.price_agreed}`;
    } else if (type === 'BORROW') {
      return `Duration: ${req.borrow_duration_days} Days`;
    } else if (type === 'SWAP') {
      return `Offered for Swap: ${req.offered_resource_title || 'Item details'}`;
    } else {
      return 'Free Donation';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Exchange Requests</h1>
        <p className="text-sm text-slate-400 mt-1">Review requests sent to you or follow up on listings you requested from others.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#242f4c] pb-px">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center space-x-2 text-sm px-5 py-2.5 border-b-2 font-semibold transition-all duration-200 -mb-px cursor-pointer ${
            activeTab === 'incoming'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>Incoming Requests ({incoming.filter(r => r.status.toUpperCase() === 'PENDING').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center space-x-2 text-sm px-5 py-2.5 border-b-2 font-semibold transition-all duration-200 -mb-px cursor-pointer ${
            activeTab === 'outgoing'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Sent Requests ({outgoing.length})</span>
        </button>
      </div>

      <div className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl overflow-hidden shadow-lg">
        {activeTab === 'incoming' ? (
          incoming.length > 0 ? (
            <div className="divide-y divide-[#242f4c]">
              {incoming.map(req => {
                const isOwner = user && Number(user.id) === Number(req.owner_id);
                const isAccepted = req.status.toUpperCase() === 'ACCEPTED';
                const isCompleted = req.status.toUpperCase() === 'COMPLETED';
                const isVerified = verifiedList[req.id] || isCompleted;

                return (
                  <div key={req.id} className="p-6 flex flex-col space-y-4 hover:bg-[#161d30]/80 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-indigo-300">
                            {req.resource_exchange_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            Requested by <span className="text-slate-300 font-semibold">{req.requester_name}</span> ({req.requester_email})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            • {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-200 text-base">{req.resource_title}</h3>
                        <p className="text-xs text-indigo-300 font-semibold flex items-center space-x-1">
                          <span>Terms: {renderTerms(req)}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>

                        {actionLoadingId === req.id ? (
                          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-4" />
                        ) : (
                          <div className="flex items-center space-x-2">
                            {req.status.toUpperCase() === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleAccept(req.id)}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {isAccepted && isVerified && (
                              <button
                                onClick={() => handleComplete(req.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-md shadow-indigo-600/15"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                                <span>Complete Transaction</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR display section for accepted incoming requests */}
                    {isAccepted && (
                      <HandoverVerificationSection 
                        req={req} 
                        currentUser={user} 
                        onVerified={(reqId) => setVerifiedList(prev => ({ ...prev, [reqId]: true }))} 
                        onScanTrigger={() => setScanningReqId(req.id)}
                        verifiedList={verifiedList}
                      />
                    )}

                    {/* Review display section for completed incoming requests */}
                    {isCompleted && (
                      <CompletedReviewSection
                        req={req}
                        currentUser={user}
                        reviews={reviewsMap[req.id] || []}
                        onOpenReviewModal={(reqToReview) => setReviewingTransaction(reqToReview)}
                      />
                    )}

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-medium">No incoming requests received.</div>
          )
        ) : (
          outgoing.length > 0 ? (
            <div className="divide-y divide-[#242f4c]">
              {outgoing.map(req => {
                const isRequester = user && Number(user.id) === Number(req.requester_id);
                const isAccepted = req.status.toUpperCase() === 'ACCEPTED';
                const isCompleted = req.status.toUpperCase() === 'COMPLETED';
                const isVerified = verifiedList[req.id] || isCompleted;

                return (
                  <div key={req.id} className="p-6 flex flex-col space-y-4 hover:bg-[#161d30]/80 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-indigo-300">
                            {req.resource_exchange_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            Owner: <span className="text-slate-300 font-semibold">{req.owner_name}</span> ({req.owner_email})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            • {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-200 text-base">{req.resource_title}</h3>
                        <p className="text-xs text-indigo-300 font-semibold">Terms: {renderTerms(req)}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>

                        {actionLoadingId === req.id ? (
                          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-4" />
                        ) : (
                          <div className="flex items-center space-x-2">
                            {req.status.toUpperCase() === 'PENDING' && (
                              <button
                                onClick={() => handleCancel(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-450 hover:text-rose-400 text-xs font-bold border border-slate-700/60 transition-colors cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            )}

                            {isAccepted && isVerified && (
                              <button
                                onClick={() => handleComplete(req.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-md shadow-emerald-600/15"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-bounce" />
                                <span>Complete Transaction</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR scanner display section for accepted outgoing requests */}
                    {isAccepted && (
                      <HandoverVerificationSection 
                        req={req} 
                        currentUser={user} 
                        onVerified={(reqId) => setVerifiedList(prev => ({ ...prev, [reqId]: true }))} 
                        onScanTrigger={() => setScanningReqId(req.id)}
                        verifiedList={verifiedList}
                      />
                    )}

                    {/* Review display section for completed outgoing requests */}
                    {isCompleted && (
                      <CompletedReviewSection
                        req={req}
                        currentUser={user}
                        reviews={reviewsMap[req.id] || []}
                        onOpenReviewModal={(reqToReview) => setReviewingTransaction(reqToReview)}
                      />
                    )}

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-medium">You have not submitted any exchange requests.</div>
          )
        )}
      </div>

      {/* QR scanner modal for requester scan action */}
      {scanningReqId && (
        <RequesterScanModal 
          reqId={scanningReqId} 
          onClose={() => setScanningReqId(null)}
          onVerified={async () => {
            setVerifiedList(prev => ({ ...prev, [scanningReqId]: true }));
            await fetchRequests();
          }}
        />
      )}

      {/* Review submission modal for completed transactions */}
      {reviewingTransaction && (
        <ReviewModal
          transaction={reviewingTransaction}
          currentUser={user}
          onClose={() => setReviewingTransaction(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

    </div>
  );
}
