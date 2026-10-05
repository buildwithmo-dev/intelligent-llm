import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

interface Props {
  disabled: boolean;
  placeholder: string;
  onSend: (content: string) => Promise<void>;
}

export function Composer({ disabled, placeholder, onSend }: Props) {
  const [value, setValue] = useState("");

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const content = value.trim();
    if (!content || disabled) return;
    setValue("");
    try {
      await onSend(content);
    } catch {
      setValue(content); // keep the text so nothing is lost on failure
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        aria-label="Your request"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={3}
        maxLength={20000}
      />
      <button className="primary" type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
}
