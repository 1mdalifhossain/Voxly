import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, SquarePen, Loader2 } from "lucide-react";
import Logo from "../components/Logo.jsx";
import Avatar from "../components/profile/Avatar.jsx";
import OnlineDot from "../components/messages/OnlineDot.jsx";
import ConversationListItem from "../components/messages/ConversationListItem.jsx";
import MessageBubble from "../components/messages/MessageBubble.jsx";
import MessageComposer from "../components/messages/MessageComposer.jsx";
import TypingIndicator from "../components/messages/TypingIndicator.jsx";
import NewConversationModal from "../components/messages/NewConversationModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePresence } from "../context/PresenceContext.jsx";
import {
  listConversations,
  getConversation,
  listMessages,
  sendTextMessage,
  sendImageMessage,
  sendVoiceMessage,
  markConversationRead,
  subscribeToConversation,
  subscribeToInbox,
  getOrCreateConversation,
  getOtherParticipant,
  isUnread,
} from "../lib/messages.js";

export default function Messages() {
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const [conversations, setConversations] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const sendTypingRef = useRef(() => {});
  const threadRequestId = useRef(0);

  // ---- Inbox: initial load ----
  useEffect(() => {
    setLoadingInbox(true);
    listConversations().then(({ data }) => {
      setConversations(data || []);
      setLoadingInbox(false);
    });
  }, []);

  // ---- Inbox: realtime ----
  useEffect(() => {
    const unsubscribe = subscribeToInbox({
      onConversationChange: (row) => {
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === row.id);
          if (idx === -1) {
            // Brand new thread — fetch it fully (with participants) then prepend.
            getConversation(row.id).then(({ data }) => {
              if (data) setConversations((p) => (p.some((c) => c.id === data.id) ? p : [data, ...p]));
            });
            return prev;
          }
          const next = [...prev];
          next[idx] = { ...next[idx], ...row };
          next.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
          return next;
        });
      },
      onParticipantChange: (row) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === row.conversation_id
              ? { ...c, participants: c.participants.map((p) => (p.user_id === row.user_id ? { ...p, ...row } : p)) }
              : c
          )
        );
      },
    });
    return unsubscribe;
  }, []);

  // ---- Thread: load messages + conversation details when the route changes ----
  useEffect(() => {
    setOtherTyping(false);
    clearTimeout(typingTimeoutRef.current);

    if (!conversationId) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    const id = ++threadRequestId.current;
    setLoadingThread(true);

    const fromList = conversations.find((c) => c.id === conversationId);
    if (fromList) setActiveConversation(fromList);
    else getConversation(conversationId).then(({ data }) => id === threadRequestId.current && setActiveConversation(data));

    listMessages(conversationId).then(({ data, nextCursor }) => {
      if (id !== threadRequestId.current) return;
      setMessages(data);
      setCursor(nextCursor);
      setHasMore(nextCursor != null);
      setLoadingThread(false);
      markConversationRead(conversationId, user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  // Keep activeConversation synced if the inbox list updates it (e.g. new participant read state).
  useEffect(() => {
    if (!conversationId) return;
    const fromList = conversations.find((c) => c.id === conversationId);
    if (fromList) setActiveConversation(fromList);
  }, [conversations, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, conversationId]);

  // ---- Thread: realtime (messages, read receipts, typing) ----
  useEffect(() => {
    if (!conversationId || !user) return;

    const { unsubscribe, sendTyping } = subscribeToConversation(conversationId, user.id, {
      onMessage: (row) => {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        if (row.sender_id !== user.id) {
          setOtherTyping(false);
          markConversationRead(conversationId, user.id);
        }
      },
      onParticipantUpdate: (row) => {
        setActiveConversation((prev) =>
          prev ? { ...prev, participants: prev.participants.map((p) => (p.user_id === row.user_id ? { ...p, ...row } : p)) } : prev
        );
      },
      onTyping: (payload) => {
        setOtherTyping(!!payload.is_typing);
        clearTimeout(typingTimeoutRef.current);
        if (payload.is_typing) {
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 4000);
        }
      },
    });

    sendTypingRef.current = sendTyping;
    return () => {
      sendTypingRef.current = () => {};
      unsubscribe();
    };
  }, [conversationId, user]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !conversationId) return;
    setLoadingMore(true);
    const { data, nextCursor } = await listMessages(conversationId, { cursor });
    setMessages((prev) => [...data, ...prev]);
    setCursor(nextCursor);
    setHasMore(nextCursor != null);
    setLoadingMore(false);
  }, [loadingMore, hasMore, conversationId, cursor]);

  const openConversation = (id) => navigate(`/messages/${id}`);

  const handleSelectNewUser = async (otherUser) => {
    setShowNewConversation(false);
    const { conversationId: id } = await getOrCreateConversation(otherUser.id);
    if (id) openConversation(id);
  };

  const handleSendText = async (text) => {
    const { data } = await sendTextMessage(conversationId, user.id, text);
    if (data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  };

  const handleSendImage = async (file, caption) => {
    const { data } = await sendImageMessage(conversationId, user.id, file, caption);
    if (data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  };

  const handleSendVoice = async (blob, duration, mimeType) => {
    const { data } = await sendVoiceMessage(conversationId, user.id, blob, duration, { mimeType });
    if (data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  };

  const otherUser = activeConversation ? getOtherParticipant(activeConversation, user.id) : null;
  const otherParticipant = activeConversation?.participants?.find((p) => p.user_id === otherUser?.id);

  let lastOwnMessageId = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === user.id) {
      lastOwnMessageId = messages[i].id;
      break;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-100 shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold text-lg text-slate-900">Voxly</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-5xl w-full mx-auto sm:px-6 sm:py-6">
        <div className="h-full sm:rounded-2xl sm:border sm:border-slate-100 bg-white overflow-hidden grid grid-cols-1 md:grid-cols-[20rem_1fr]">
          {/* ---- Conversation list ---- */}
          <div className={`border-r border-slate-100 flex flex-col min-h-0 ${conversationId ? "hidden md:flex" : "flex"}`}>
            <div className="flex items-center justify-between px-4 py-4 shrink-0">
              <h1 className="font-display text-lg font-semibold text-slate-900">Messages</h1>
              <button
                type="button"
                onClick={() => setShowNewConversation(true)}
                aria-label="New message"
                className="p-2 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <SquarePen className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingInbox ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10 px-6">
                  No conversations yet. Tap the compose button to message someone.
                </p>
              ) : (
                conversations.map((c) => {
                  const other = getOtherParticipant(c, user.id);
                  return (
                    <ConversationListItem
                      key={c.id}
                      conversation={c}
                      otherUser={other}
                      unread={isUnread(c, user.id)}
                      online={other ? isOnline(other.id) : false}
                      active={c.id === conversationId}
                      onClick={() => openConversation(c.id)}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* ---- Active thread ---- */}
          <div className={`flex flex-col min-h-0 ${conversationId ? "flex" : "hidden md:flex"}`}>
            {!conversationId ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 px-6 text-center">
                Select a conversation, or start a new one.
              </div>
            ) : loadingThread && messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate("/messages")}
                    aria-label="Back to messages"
                    className="md:hidden p-1.5 -ml-1.5 rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {otherUser && (
                    <Link to={`/u/${otherUser.username}`} className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar src={otherUser.avatar_url} name={otherUser.display_name || otherUser.username} size="sm" />
                        <OnlineDot online={isOnline(otherUser.id)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {otherUser.display_name || otherUser.username}
                        </p>
                        <p className="text-xs text-slate-400">
                          {otherTyping ? "typing…" : isOnline(otherUser.id) ? "Online" : "Offline"}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                  {hasMore && (
                    <div className="flex justify-center pb-2">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-60"
                      >
                        {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Load earlier messages
                      </button>
                    </div>
                  )}

                  {messages.map((m) => {
                    const isOwn = m.sender_id === user.id;
                    let status;
                    if (isOwn && m.id === lastOwnMessageId) {
                      const seen = otherParticipant && new Date(otherParticipant.last_read_at) >= new Date(m.created_at);
                      status = seen ? "seen" : "sent";
                    }
                    return <MessageBubble key={m.id} message={m} isOwn={isOwn} status={status} />;
                  })}

                  {otherTyping && <TypingIndicator />}
                  <div ref={bottomRef} />
                </div>

                <MessageComposer
                  onSendText={handleSendText}
                  onSendImage={handleSendImage}
                  onSendVoice={handleSendVoice}
                  onTypingChange={(isTyping) => sendTypingRef.current(isTyping)}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {showNewConversation && (
        <NewConversationModal currentUserId={user.id} onSelect={handleSelectNewUser} onClose={() => setShowNewConversation(false)} />
      )}
    </div>
  );
}
