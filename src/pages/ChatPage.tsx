import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Conversation, Message } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Composer } from "../components/Composer";
import { Sidebar } from "../components/Sidebar";

const TITLE_MAX = 60;

function titleFrom(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  return oneLine.length > TITLE_MAX ? `${oneLine.slice(0, TITLE_MAX - 1)}…` : oneLine;
}

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Try again.";
}

export function ChatPage() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(async () => {
    setConversations(await api.listConversations());
  }, []);

  useEffect(() => {
    refreshConversations().catch((e) => setError(errorText(e)));
  }, [refreshConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);

  async function select(id: string) {
    setSelectedId(id);
    setMenuOpen(false);
    setError(null);
    setMessages([]);
    try {
      const loaded = await api.listMessages(id);
      setMessages(loaded);
    } catch (e) {
      setError(errorText(e));
    }
  }

  function startNew() {
    setSelectedId(null);
    setMessages([]);
    setError(null);
    setMenuOpen(false);
  }

  async function send(content: string) {
    setError(null);
    setSending(true);
    try {
      let conversationId = selectedId;
      if (!conversationId) {
        const created = await api.createConversation(titleFrom(content));
        conversationId = created.id;
        setSelectedId(created.id);
      }
      const message = await api.sendMessage(conversationId, content);
      setMessages((prev) => [...prev, message]);
      await refreshConversations();
    } catch (e) {
      setError(errorText(e));
      throw e;
    } finally {
      setSending(false);
    }
  }

  const current = conversations.find((c) => c.id === selectedId);

  return (
    <div className="shell">
      <Sidebar
        conversations={conversations}
        selectedId={selectedId}
        email={user?.email ?? ""}
        open={menuOpen}
        onSelect={select}
        onNew={startNew}
        onLogout={logout}
      />
      <main className="chat">
        <header className="chat-head">
          <button className="link menu-toggle" type="button" onClick={() => setMenuOpen((o) => !o)}>
            Conversations
          </button>
          <h1>{current?.title ?? (selectedId ? "Conversation" : "New conversation")}</h1>
        </header>

        {selectedId === null ? (
          <div className="start">
            <h2>What would you like to do?</h2>
            <Composer disabled={sending} placeholder="Describe what you need…" onSend={send} />
          </div>
        ) : (
          <>
            <div className="transcript" aria-live="polite">
              {messages.map((m) => (
                <article key={m.id} className={`msg ${m.role}`}>
                  <p>{m.content}</p>
                </article>
              ))}
              <p className="notice">
                AI replies are not connected yet. Your messages are saved to this conversation.
              </p>
              <div ref={endRef} />
            </div>
            <Composer disabled={sending} placeholder="Write a message…" onSend={send} />
          </>
        )}

        {error && (
          <p className="error banner" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
