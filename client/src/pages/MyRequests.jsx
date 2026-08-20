import React, { useState } from 'react';
import { CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';

const initialIncoming = [
  { id: 201, item: 'TI-84 Plus CE Graphing Calculator', requester: 'Jordan Vance', type: 'Borrow', details: '14 Days', status: 'Pending' },
  { id: 202, item: 'Arduino Uno Starter Kit', requester: 'Dwight Schrute', type: 'Swap', details: 'Offered: Chemistry Model Kit', status: 'Approved' }
];

const initialOutgoing = [
  { id: 301, item: 'University Physics (14th Edition)', owner: 'Sarah Connor', type: 'Buy', details: '$45', status: 'Pending' },
  { id: 302, item: 'Organic Chemistry Lab Coat (Medium)', owner: 'Emily Watson', type: 'Donate', details: 'Free', status: 'Pending' }
];

export default function MyRequests() {
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [activeTab, setActiveTab] = useState('incoming');

  const handleAction = (id, newStatus) => {
    setIncoming(incoming.map(req => {
      if (req.id === id) {
        return { ...req, status: newStatus };
      }
      return req;
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Approved': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Rejected': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

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
          className={`flex items-center space-x-2 text-sm px-5 py-2.5 border-b-2 font-semibold transition-all duration-200 -mb-px ${
            activeTab === 'incoming'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>Incoming Requests ({incoming.filter(r => r.status === 'Pending').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center space-x-2 text-sm px-5 py-2.5 border-b-2 font-semibold transition-all duration-200 -mb-px ${
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
                <div key={req.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#161d30]/80 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-indigo-300">
                        {req.type}
                      </span>
                      <span className="text-xs text-slate-500">Requested by {req.requester}</span>
                    </div>
                    <h3 className="font-bold text-slate-200 text-base">{req.item}</h3>
                    <p className="text-xs text-slate-400 font-medium">Terms: {req.details}</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>

                    {req.status === 'Pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAction(req.id, 'Approved')}
                          className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center transition-colors"
                          title="Accept Request"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'Rejected')}
                          className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center transition-colors"
                          title="Reject Request"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No incoming requests.</div>
          )
        ) : (
          outgoing.length > 0 ? (
            <div className="divide-y divide-[#242f4c]">
              {outgoing.map(req => (
                <div key={req.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#161d30]/80 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-indigo-300">
                        {req.type}
                      </span>
                      <span className="text-xs text-slate-500">Owner: {req.owner}</span>
                    </div>
                    <h3 className="font-bold text-slate-200 text-base">{req.item}</h3>
                    <p className="text-xs text-slate-400 font-medium">Terms: {req.details}</p>
                  </div>

                  <div>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No outgoing requests.</div>
          )
        )}
      </div>
    </div>
  );
}
