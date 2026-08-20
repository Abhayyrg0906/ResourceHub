import React, { useState } from 'react';
import { ShieldAlert, Users, CheckCircle, Flag, Ban, Check } from 'lucide-react';

const initialVerifications = [
  { id: 1, name: 'Marcus Aurelius', email: 'marcus.aurelius@university.edu', department: 'History', date: 'Today' },
  { id: 2, name: 'Ada Lovelace', email: 'ada.lovelace@university.edu', department: 'Mathematics', date: 'Yesterday' }
];

const initialFlagged = [
  { id: 101, title: 'Calculus Solution Manual PDF', owner: 'John Doe', reason: 'Copyright Violation', reporter: 'Library Admin' }
];

export default function AdminDashboard() {
  const [verifications, setVerifications] = useState(initialVerifications);
  const [flagged, setFlagged] = useState(initialFlagged);

  const handleVerify = (id) => {
    setVerifications(verifications.filter(v => v.id !== id));
  };

  const handleModerate = (id, action) => {
    // action: 'keep' or 'remove'
    setFlagged(flagged.filter(f => f.id !== id));
  };

  const adminStats = [
    { label: 'Total Verified Students', value: '1,420', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Pending Verifications', value: `${verifications.length}`, icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Flagged Resources', value: `${flagged.length}`, icon: Flag, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Verified Exchanges', value: '4,890', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <ShieldAlert className="h-8 w-8 text-pink-500" />
          <span>Administration Portal</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Review student verification queues, audit flagged listings, and view campus exchange statistics.</p>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminStats.map((stat, idx) => (
          <div key={idx} className="bg-[#161d30]/60 border border-[#242f4c] rounded-2xl p-5 flex items-center space-x-4">
            <div className={`p-3.5 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Verification Queue */}
        <div className="bg-[#161d30]/50 border border-[#242f4c] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Pending Student Verifications</h2>
          {verifications.length > 0 ? (
            <div className="space-y-3">
              {verifications.map(student => (
                <div key={student.id} className="bg-[#0d111c]/60 border border-[#242f4c] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">{student.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{student.email}</p>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded mt-1.5 inline-block">
                      Dept: {student.department}
                    </span>
                  </div>
                  <div className="flex space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleVerify(student.id)}
                      className="flex-grow sm:flex-none text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleVerify(student.id)}
                      className="flex-grow sm:flex-none text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">Verification queue is empty.</p>
          )}
        </div>

        {/* Flagged Listings */}
        <div className="bg-[#161d30]/50 border border-[#242f4c] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Flagged Resources Audit</h2>
          {flagged.length > 0 ? (
            <div className="space-y-3">
              {flagged.map(item => (
                <div key={item.id} className="bg-[#0d111c]/60 border border-[#242f4c] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Listed by: <span className="text-slate-300 font-semibold">{item.owner}</span></p>
                    <p className="text-xs text-rose-400 font-bold mt-1">Reason: {item.reason}</p>
                  </div>
                  <div className="flex space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleModerate(item.id, 'keep')}
                      className="flex-grow sm:flex-none text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleModerate(item.id, 'remove')}
                      className="flex-grow sm:flex-none text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Take Down</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">No reported items.</p>
          )}
        </div>

      </div>
    </div>
  );
}
