import type { Conversation } from "../api/types";

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  email: string;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onLogout: () => void;
}

export function Sidebar({ conversations, selectedId, email, open, onSelect, onNew, onLogout }: Props) {
  return (
    <aside className={`sidebar${open ? " open" : ""}`} aria-label="Conversations">
      <p className="wordmark">Intelligent LLM</p>
      <button className="primary" type="button" onClick={onNew}>
        New conversation
      </button>
      <nav>
        {conversations.length === 0 ? (
          <p className="empty">Your conversations will appear here.</p>
        ) : (
          <ul>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={c.id === selectedId ? "conv active" : "conv"}
                  aria-current={c.id === selectedId ? "page" : undefined}
                  onClick={() => onSelect(c.id)}
                >
                  {c.title ?? "Untitled conversation"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="account">
        <span title={email}>{email}</span>
        <button className="link" type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
