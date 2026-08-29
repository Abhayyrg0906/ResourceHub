import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  getRequests, 
  cancelRequest, 
  acceptRequest, 
  rejectRequest, 
  completeRequest 
} from '../services/exchangeService';
import { useAuth } from '../context/AuthContext';

export default function MyRequests() {
  const { user } = useAuth();
  
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load incoming requests (user is owner of resources)
      const resIncoming = await getRequests({ role: 'owner' });
      if (resIncoming.success) {
        setIncoming(resIncoming.data);
      }

      // Load outgoing requests (user is requester)
      const resOutgoing = await getRequests({ role: 'requester' });
      if (resOutgoing.success) {
        setOutgoing(resOutgoing.data);
      }
    } catch (err) {
      console.error('Failed to load exchange requests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
          alert('Transaction marked as completed! Resource status updated to EXCHANGED.');
          await fetchRequests();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to complete transaction.');
      } finally {
        setActionLoadingId(null);
      }
    }
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
          <span>Incoming Requests ({incoming.filter(r => r.status === 'PENDING').length})</span>
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
              {incoming.map(req => (
                <div key={req.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#161d30]/80 transition-colors">
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
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleAccept(req.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Accept Request"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Reject Request"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {req.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleComplete(req.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-md shadow-indigo-600/15"
                            title="Complete Transaction"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            <span>Mark as Completed</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-medium">No incoming requests received.</div>
          )
        ) : (
          outgoing.length > 0 ? (
            <div className="divide-y divide-[#242f4c]">
              {outgoing.map(req => (
                <div key={req.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#161d30]/80 transition-colors">
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
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-rose-400 text-xs font-bold border border-slate-700/60 transition-colors cursor-pointer"
                            title="Cancel Request"
                          >
                            Cancel Request
                          </button>
                        )}

                        {req.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleComplete(req.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-md shadow-indigo-600/15"
                            title="Complete Transaction"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            <span>Mark as Completed</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-medium">You have not submitted any exchange requests.</div>
          )
        )}
      </div>
    </div>
  );
}
