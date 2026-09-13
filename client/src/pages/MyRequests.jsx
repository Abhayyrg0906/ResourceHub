import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Star,
  MessageSquare,
  History,
  MapPin,
  Navigation
} from 'lucide-react';
import chatService from '../services/chatService';
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
import HandoverQrModal from '../components/HandoverQrModal';
import QrHistoryModal from '../components/QrHistoryModal';
import CampusMeetupMapModal from '../components/CampusMeetupMapModal';
import GlassCard from '../components/ui/GlassCard';
import SectionHeading from '../components/ui/SectionHeading';


// ----------------------------------------------------
// Unified Handover Verification Section (M16 Enhanced QR Handover)
// ----------------------------------------------------
function HandoverVerificationSection({ req, currentUser, onVerified, onOpenHandoverModal, verifiedList }) {
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
        <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-2xl p-4 flex items-center space-x-3 text-emerald-400 mt-4 shadow-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 animate-bounce" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider font-display">Handover Verified!</h4>
            <p className="text-[11px] text-slate-300 mt-0.5">Physical exchange verified successfully. You may complete the transaction.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400 font-display">Exchange Handover</h4>
          <span className="text-[10px] font-semibold text-slate-400">
            Status: {isQrGenerated && !isQrExpired ? `Active (${countdown || '10m'})` : isQrExpired ? 'QR Expired' : 'Not Generated'}
          </span>
        </div>

        <div className="bg-[#090D18] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs font-bold text-slate-200">
              {isQrGenerated && !isQrExpired ? 'Handover QR Code Ready' : isQrExpired ? 'Handover QR Expired' : 'In-Person Handover Verification'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isQrGenerated && !isQrExpired 
                ? `Present code to ${req.requester_name} (expires in ${countdown || '10m'}).` 
                : isQrExpired 
                ? 'The previous QR code has expired. Regenerate a new code for the requester.' 
                : 'Generate a secure, single-use 10-minute QR code for the requester to scan.'}
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => onOpenHandoverModal(req)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 hover:scale-[1.02]"
            >
              <QrCode className="h-4 w-4" />
              <span>{isQrGenerated && !isQrExpired ? 'View / Present QR' : isQrExpired ? 'Regenerate QR' : 'Generate Handover QR'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. REQUESTER VIEW
  if (isRequester) {
    if (isQrVerified) {
      return (
        <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-2xl p-4 flex items-center space-x-3 text-emerald-400 mt-4 shadow-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider font-display">Handover Verified!</h4>
            <p className="text-[11px] text-slate-300 mt-0.5">Physical handover verified successfully. Waiting for owner to finalize completion.</p>
          </div>
        </div>
      );
    }

    if (isQrExpired) {
      return (
        <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
          <div className="bg-[#090D18] border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-300">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span className="text-xs font-semibold">The handover QR has expired. Please ask the owner to regenerate it.</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-400 font-display">Exchange Handover</h4>
          <span className="text-[10px] font-semibold text-slate-400">
            Status: {isQrGenerated ? 'Ready to Scan' : 'Waiting for owner to generate QR'}
          </span>
        </div>

        <div className="bg-[#090D18] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs font-bold text-slate-200">Verify Physical Item Handover</p>
            <p className="text-[11px] text-slate-400">
              Meet with {req.owner_name}, inspect the resource, and scan their handover QR code.
            </p>
          </div>

          <button
            onClick={() => onOpenHandoverModal(req)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 flex-shrink-0 hover:scale-[1.02]"
          >
            <Camera className="h-4 w-4" />
            <span>Scan Handover QR</span>
          </button>
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

  const myReview = reviews && reviews.find(r => 
    Number(r.reviewer?.id || r.reviewer_id) === Number(currentUser.id)
  );

  if (myReview) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
        <div className="flex items-center space-x-3 text-emerald-400">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider font-display">Review Submitted ✓</h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {myReview.review_text ? `"${myReview.review_text}"` : 'Thank you for rating your exchange partner.'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 bg-[#090D18] px-3 py-1.5 rounded-xl border border-white/10 flex-shrink-0">
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
    <div className="bg-[#090D18] border border-white/10 rounded-2xl p-4 sm:p-5 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
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
        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex-shrink-0 hover:scale-[1.02]"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#0F1424] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl space-y-6">
        
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 p-1.5 rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>

        {successInfo ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-white tracking-tight font-display">Review Submitted ✓</h3>
            <p className="text-xs text-slate-300">Thank you for rating your exchange partner!</p>
            {successInfo.reviewed_user?.trust_score !== undefined && (
              <div className="bg-[#090D18] border border-indigo-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1">
                <span className="text-indigo-400 font-bold block uppercase tracking-wider text-[10px]">Recipient Trust Updated</span>
                <span className="text-sm font-extrabold text-white">Trust Score: {Number(successInfo.reviewed_user.trust_score).toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight font-display">Leave a Review</h2>
              <p className="text-xs text-slate-400">
                Rate your exchange experience with <span className="text-slate-200 font-semibold">{partnerName}</span> for <span className="text-indigo-300 font-semibold">{transaction.resource_title}</span>.
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl px-4 py-2.5 text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Interactive 1-5 Star Rating */}
            <div className="space-y-2 text-center bg-[#090D18] p-4 rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-display">
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

              <div className="h-4 text-[11px] font-semibold text-amber-300">
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
                className="w-full px-4 py-2.5 bg-[#090D18] border border-white/10 focus:border-indigo-500 rounded-2xl text-slate-100 placeholder-slate-500 outline-none text-xs resize-none transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !rating}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-1.5"
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
// Main Exchange Requests Dashboard Component
// ----------------------------------------------------
export default function MyRequests() {
  const { user } = useAuth();
  
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleStartChat = async (req) => {
    try {
      const res = await chatService.getOrCreateConversation({
        transactionId: req.id,
        resourceId: req.resource_id
      });
      if (res && res.success && res.conversation) {
        navigate(`/chat/${res.conversation.id}`);
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
      alert(err.response?.data?.message || 'Could not open conversation.');
    }
  };
  
  // Handover QR Modal State (M16)
  const [activeHandoverTx, setActiveHandoverTx] = useState(null);

  // Handover Audit History Modal State (M16)
  const [showQrHistory, setShowQrHistory] = useState(false);
  
  // Review modal state
  const [reviewingTransaction, setReviewingTransaction] = useState(null);
  
  // Verified request markers (for real-time update triggers)
  const [verifiedList, setVerifiedList] = useState({});

  // Reviews list map by transaction_id: { [txId]: Array<Review> }
  const [reviewsMap, setReviewsMap] = useState({});
  const [mapModalLocation, setMapModalLocation] = useState(null);

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
      case 'PENDING': return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
      case 'ACCEPTED': return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
      case 'REJECTED': return 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
      case 'CANCELLED': return 'bg-slate-700/30 text-slate-400 border border-slate-700/60';
      case 'COMPLETED': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      default: return 'bg-slate-500/15 text-slate-400 border border-slate-500/20';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SectionHeading
            badge="Exchanges"
            title="Exchange Requests"
            subtitle="Manage peer handovers, coordinate meetings, and approve campus requests."
          />
        </div>
        <button
          onClick={() => setShowQrHistory(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#090D18] hover:bg-white/10 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-auto hover:scale-[1.02]"
        >
          <History className="h-4 w-4" />
          <span>QR Handover History</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center space-x-2 text-xs sm:text-sm px-5 py-2.5 border-b-2 font-bold transition-all duration-200 -mb-px cursor-pointer whitespace-nowrap ${
            activeTab === 'incoming'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>Incoming Requests ({incoming.filter(r => r.status.toUpperCase() === 'PENDING').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center space-x-2 text-xs sm:text-sm px-5 py-2.5 border-b-2 font-bold transition-all duration-200 -mb-px cursor-pointer whitespace-nowrap ${
            activeTab === 'outgoing'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Sent Requests ({outgoing.length})</span>
        </button>
      </div>

      <GlassCard glowVariant="none" elevation="flat" className="p-0 border border-white/10 overflow-hidden">
        {activeTab === 'incoming' ? (
          incoming.length > 0 ? (
            <div className="divide-y divide-white/5">
              {incoming.map(req => {
                const isOwner = user && Number(user.id) === Number(req.owner_id);
                const isAccepted = req.status.toUpperCase() === 'ACCEPTED';
                const isCompleted = req.status.toUpperCase() === 'COMPLETED';
                const isVerified = verifiedList[req.id] || isCompleted;

                return (
                  <div key={req.id} className="p-6 flex flex-col space-y-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                            {req.resource_exchange_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            Requested by <span className="text-slate-200 font-semibold">{req.requester_name}</span> ({req.requester_email})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            • {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-100 text-base font-display">{req.resource_title}</h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-xs text-indigo-300 font-semibold flex items-center space-x-1">
                            <span>Terms: {renderTerms(req)}</span>
                          </p>
                          {req.resource_meetup_location && (
                            <button
                              type="button"
                              onClick={() => setMapModalLocation({ location: req.resource_meetup_location, title: req.resource_title })}
                              className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-indigo-300 bg-[#090D18] hover:bg-white/10 px-3 py-1 rounded-xl border border-white/10 transition-colors cursor-pointer shadow-sm"
                            >
                              <MapPin className="h-3 w-3 text-indigo-400" />
                              <span>Meetup: <strong>{req.resource_meetup_location}</strong></span>
                              <span className="text-[10px] text-indigo-400 font-semibold ml-1">(View Map)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm ${getStatusBadge(req.status)}`}>
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
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-md shadow-emerald-600/20 hover:scale-[1.02]"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-md shadow-rose-600/20 hover:scale-[1.02]"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {isAccepted && isVerified && (
                              <button
                                onClick={() => handleComplete(req.id)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/25 hover:scale-[1.02]"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                                <span>Complete Transaction</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleStartChat(req)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#090D18] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                              title="Chat with requester"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                              <span>Chat</span>
                            </button>
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
                        onOpenHandoverModal={(reqToVerify) => setActiveHandoverTx(reqToVerify)}
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
            <div className="text-center py-20 text-slate-400 font-medium">No incoming requests received yet.</div>
          )
        ) : (
          outgoing.length > 0 ? (
            <div className="divide-y divide-white/5">
              {outgoing.map(req => {
                const isRequester = user && Number(user.id) === Number(req.requester_id);
                const isAccepted = req.status.toUpperCase() === 'ACCEPTED';
                const isCompleted = req.status.toUpperCase() === 'COMPLETED';
                const isVerified = verifiedList[req.id] || isCompleted;

                return (
                  <div key={req.id} className="p-6 flex flex-col space-y-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                            {req.resource_exchange_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            Owner: <span className="text-slate-200 font-semibold">{req.owner_name}</span> ({req.owner_email})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            • {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-100 text-base font-display">{req.resource_title}</h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-xs text-indigo-300 font-semibold">Terms: {renderTerms(req)}</p>
                          {req.resource_meetup_location && (
                            <button
                              type="button"
                              onClick={() => setMapModalLocation({ location: req.resource_meetup_location, title: req.resource_title })}
                              className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-indigo-300 bg-[#090D18] hover:bg-white/10 px-3 py-1 rounded-xl border border-white/10 transition-colors cursor-pointer shadow-sm"
                            >
                              <MapPin className="h-3 w-3 text-indigo-400" />
                              <span>Meetup: <strong>{req.resource_meetup_location}</strong></span>
                              <span className="text-[10px] text-indigo-400 font-semibold ml-1">(View Map)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>

                        {actionLoadingId === req.id ? (
                          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-4" />
                        ) : (
                          <div className="flex items-center space-x-2">
                            {req.status.toUpperCase() === 'PENDING' && (
                              <button
                                onClick={() => handleCancel(req.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            )}

                            {isAccepted && isVerified && (
                              <button
                                onClick={() => handleComplete(req.id)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/25 hover:scale-[1.02]"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-bounce" />
                                <span>Complete Transaction</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleStartChat(req)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#090D18] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                              title="Chat with owner"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                              <span>Chat</span>
                            </button>
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
                        onOpenHandoverModal={(reqToVerify) => setActiveHandoverTx(reqToVerify)}
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
            <div className="text-center py-20 text-slate-400 font-medium">You have not submitted any exchange requests.</div>
          )
        )}
      </GlassCard>

      {/* Enhanced Handover QR Modal for Owner & Requester (M16) */}
      {activeHandoverTx && (
        <HandoverQrModal 
          transaction={activeHandoverTx} 
          currentUser={user}
          onClose={() => setActiveHandoverTx(null)}
          onVerified={async (txId) => {
            setVerifiedList(prev => ({ ...prev, [txId]: true }));
            await fetchRequests();
          }}
        />
      )}

      {/* Handover Audit History Modal (M16) */}
      {showQrHistory && (
        <QrHistoryModal 
          onClose={() => setShowQrHistory(false)}
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

      {/* Campus Meetup Map Modal (M21) */}
      {mapModalLocation && (
        <CampusMeetupMapModal
          locationName={mapModalLocation.location}
          resourceTitle={mapModalLocation.title}
          onClose={() => setMapModalLocation(null)}
        />
      )}

    </div>
  );
}

