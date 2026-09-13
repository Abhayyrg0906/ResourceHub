import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Clock, 
  Check, 
  CheckCheck, 
  ShieldCheck, 
  ExternalLink, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ArrowLeft,
  ShoppingBag,
  Tag,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/chatService';
import GlassCard from '../components/ui/GlassCard';

export default function Chat() {
  const { conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(routeConversationId ? parseInt(routeConversationId, 10) : null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected', 'connecting', 'disconnected'
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConvIdRef = useRef(activeConvId);

  // Keep activeConvIdRef in sync
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  // Scroll to bottom of message window
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch all conversations for user
  const fetchConversations = useCallback(async (selectFirstIfNone = false) => {
    try {
      setLoadingConversations(true);
      const res = await chatService.getConversations();
      if (res && res.success) {
        setConversations(res.conversations || []);
        if (selectFirstIfNone && !activeConvIdRef.current && res.conversations?.length > 0) {
          const firstId = res.conversations[0].id;
          setActiveConvId(firstId);
          navigate(`/chat/${firstId}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [navigate]);

  // Initial load
  useEffect(() => {
    fetchConversations(!routeConversationId);
  }, [fetchConversations, routeConversationId]);

  // Sync route param with state
  useEffect(() => {
    if (routeConversationId) {
      const parsed = parseInt(routeConversationId, 10);
      if (parsed !== activeConvId) {
        setActiveConvId(parsed);
      }
    }
  }, [routeConversationId, activeConvId]);

  // Fetch active conversation details and messages
  useEffect(() => {
    if (!activeConvId) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    let isMounted = true;

    const loadConversationData = async () => {
      try {
        setLoadingMessages(true);
        setError(null);

        // Fetch conversation details
        const convRes = await chatService.getConversationById(activeConvId);
        if (isMounted && convRes && convRes.success) {
          setActiveConversation(convRes.conversation);
        }

        // Fetch messages and mark as read
        const msgRes = await chatService.getMessages(activeConvId);
        if (isMounted && msgRes && msgRes.success) {
          setMessages(msgRes.messages || []);
          setTimeout(() => scrollToBottom('auto'), 50);

          // Update local unread count for this conversation in the list
          setConversations(prev =>
            prev.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c)
          );
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load conversation messages.');
        }
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadConversationData();

    return () => {
      isMounted = false;
    };
  }, [activeConvId]);

  // Socket.IO setup and room subscription
  useEffect(() => {
    const socket = chatService.initSocket();
    if (!socket) return;

    const onConnect = () => {
      setConnectionStatus('connected');
      if (activeConvIdRef.current) {
        chatService.joinConversation(activeConvIdRef.current);
      }
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const onConnectError = () => {
      setConnectionStatus('disconnected');
    };

    const onReconnectAttempt = () => {
      setConnectionStatus('connecting');
    };

    const onNewMessage = (msg) => {
      const currentActive = activeConvIdRef.current;
      if (msg.conversation_id === currentActive) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();

        if (user && msg.sender_id !== user.id) {
          chatService.markAsRead(currentActive).catch(() => {});
        }
      }

      setConversations(prev => {
        const foundIndex = prev.findIndex(c => c.id === msg.conversation_id);
        if (foundIndex === -1) {
          fetchConversations(false);
          return prev;
        }
        const updated = [...prev];
        const target = { ...updated[foundIndex] };
        target.last_message = {
          text: msg.message_text,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          is_mine: user && msg.sender_id === user.id
        };
        target.last_message_at = msg.created_at;
        if (msg.conversation_id !== currentActive && user && msg.sender_id !== user.id) {
          target.unread_count = (target.unread_count || 0) + 1;
        }
        updated.splice(foundIndex, 1);
        updated.unshift(target);
        return updated;
      });
    };

    const onMessagesRead = (data) => {
      if (data.conversationId === activeConvIdRef.current) {
        setMessages(prev =>
          prev.map(m => (m.sender_id === user?.id ? { ...m, is_read: true } : m))
        );
      }
    };

    const onUserTyping = (data) => {
      if (data.conversationId === activeConvIdRef.current && user && data.userId !== user.id) {
        setPartnerTyping(data.isTyping);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io?.on('reconnect_attempt', onReconnectAttempt);
    socket.on('new_message', onNewMessage);
    socket.on('messages_read', onMessagesRead);
    socket.on('user_typing', onUserTyping);

    if (socket.connected) {
      setConnectionStatus('connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io?.off('reconnect_attempt', onReconnectAttempt);
      socket.off('new_message', onNewMessage);
      socket.off('messages_read', onMessagesRead);
      socket.off('user_typing', onUserTyping);
    };
  }, [user, fetchConversations]);

  // Join/leave conversation room when activeConvId changes
  useEffect(() => {
    if (!activeConvId) return;

    chatService.joinConversation(activeConvId);
    setPartnerTyping(false);

    return () => {
      chatService.leaveConversation(activeConvId);
    };
  }, [activeConvId]);

  // Handle typing input
  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val.length <= 2000) {
      setMessageText(val);

      if (activeConvId) {
        chatService.sendTyping(activeConvId, true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          chatService.sendTyping(activeConvId, false);
        }, 1500);
      }
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = messageText.trim();
    if (!text || !activeConvId || sending) return;

    try {
      setSending(true);
      setError(null);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      chatService.sendTyping(activeConvId, false);

      const res = await chatService.sendMessage(activeConvId, text);
      if (res && res.success) {
        setMessageText('');
        setMessages(prev => {
          if (prev.some(m => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        scrollToBottom();
      } else {
        setError(res?.message || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConvId(conv.id);
    navigate(`/chat/${conv.id}`);
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const partnerName = c.partner?.name?.toLowerCase() || '';
    const resourceTitle = c.resource?.title?.toLowerCase() || '';
    return partnerName.includes(query) || resourceTitle.includes(query);
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-5.5rem)] flex flex-col space-y-4">
      {/* Top Status Bar */}
      <GlassCard className="p-4 flex items-center justify-between" glow="indigo">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide font-display">Campus Live Chat</h1>
            <p className="text-xs text-slate-400">Directly coordinate exchanges and meetup locations with student peers</p>
          </div>
        </div>

        {/* Connection status badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs">
          {connectionStatus === 'connected' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-emerald-300 font-bold">Live Connected</span>
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <RefreshCw className="h-3 w-3 text-amber-400 animate-spin" />
              <span className="text-amber-300 font-bold">Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-rose-400" />
              <span className="text-rose-300 font-bold">Reconnecting</span>
            </>
          )}
        </div>
      </GlassCard>

      {/* Main Two-Column Layout */}
      <GlassCard className="flex-1 min-h-0 p-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden" glow="none">
        
        {/* Left Sidebar: Conversation List (4 cols) */}
        <div className={`md:col-span-4 flex flex-col border-r border-white/[0.06] bg-black/20 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search bar */}
          <div className="p-3.5 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search peers or listings..."
                className="w-full pl-10 pr-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {loadingConversations ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2">
                <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4 space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white font-display">No conversations yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Find a resource in the Marketplace and click "Chat with Owner" to coordinate.
                  </p>
                </div>
                <Link
                  to="/resources"
                  className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
                >
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-4 transition-all duration-200 flex items-start space-x-3.5 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-950/40 to-purple-950/30 border-l-4 border-indigo-500'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-md font-display">
                        {conv.partner?.name ? conv.partner.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-pink-500 rounded-full ring-2 ring-[#080A12] animate-pulse">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white truncate font-display">
                          {conv.partner?.name || 'User'}
                        </h3>
                        <span className="text-[10px] text-slate-500 flex-shrink-0 ml-1">
                          {formatTime(conv.last_message?.created_at || conv.last_message_at)}
                        </span>
                      </div>

                      {/* Resource pill */}
                      <div className="flex items-center space-x-1 mt-0.5">
                        <Tag className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                        <span className="text-[11px] text-indigo-300 truncate font-semibold">
                          {conv.resource?.title || 'Resource'}
                        </span>
                      </div>

                      {/* Last message preview */}
                      <p className={`text-xs mt-1 truncate ${
                        conv.unread_count > 0 ? 'text-white font-bold' : 'text-slate-400'
                      }`}>
                        {conv.last_message ? (
                          <>
                            {conv.last_message.is_mine && <span className="text-indigo-400 font-semibold">You: </span>}
                            {conv.last_message.text}
                          </>
                        ) : (
                          <span className="italic text-slate-500">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Window (8 cols) */}
        <div className={`md:col-span-8 flex flex-col bg-black/40 ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/[0.06] bg-black/20 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow font-display">
                    {activeConversation.partner?.name ? activeConversation.partner.name.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-black text-white truncate font-display">
                        {activeConversation.partner?.name || 'User'}
                      </h2>
                      {activeConversation.partner?.trust_score !== undefined && (
                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Trust {Number(activeConversation.partner.trust_score).toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {activeConversation.partner?.department || 'Student'} • {activeConversation.partner?.email}
                    </p>
                  </div>
                </div>

                {activeConversation.resource && (
                  <Link
                    to={`/resources/${activeConversation.resource.id}`}
                    className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs transition-colors ml-2 max-w-[220px]"
                    title="View Resource Listing"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="text-slate-200 truncate font-semibold">
                      {activeConversation.resource.title}
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  </Link>
                )}
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mx-4 mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
                    <span className="text-xs text-slate-400">Loading chat history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                    <div className="p-4 rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white font-display">Start the conversation</p>
                      <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                        Coordinate meetup details, pickup location, or item questions securely with your exchange partner.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMine = user && msg.sender_id === user.id;

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm text-xs break-words font-normal ${
                            isMine
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-lg shadow-indigo-600/20'
                              : 'bg-white/[0.04] text-slate-100 border border-white/[0.08] rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message_text}</p>
                          <div className={`flex items-center justify-end space-x-1 text-[10px] mt-1.5 ${
                            isMine ? 'text-indigo-200/80' : 'text-slate-400'
                          }`}>
                            <span>{formatTime(msg.created_at)}</span>
                            {isMine && (
                              msg.is_read ? (
                                <CheckCheck className="h-3 w-3 text-emerald-300" title="Read" />
                              ) : (
                                <Check className="h-3 w-3 text-indigo-200" title="Sent" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Partner Typing Indicator */}
                {partnerTyping && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-400 italic">
                    <div className="flex space-x-1 p-2 bg-white/[0.04] rounded-full border border-white/[0.08]">
                      <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{activeConversation.partner?.name || 'Partner'} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <div className="p-3.5 border-t border-white/[0.06] bg-black/20">
                <form onSubmit={handleSendMessage} className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={handleInputChange}
                      placeholder={`Message ${activeConversation.partner?.name || 'peer'}...`}
                      disabled={sending}
                      maxLength={2000}
                      className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim() || sending}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {sending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-1 text-[10px] text-slate-500">
                    <span>Press Enter to send</span>
                    <span className={messageText.length > 1800 ? 'text-amber-400 font-semibold' : ''}>
                      {messageText.length} / 2000
                    </span>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
              <div className="p-5 rounded-3xl bg-white/[0.02] text-indigo-400 border border-white/[0.08] shadow-inner">
                <MessageSquare className="h-12 w-12" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-white font-display">Select a conversation</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Choose a peer conversation from the list on the left to coordinate exchange details in real time.
                </p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
