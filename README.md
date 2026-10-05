# Intelligent LLM - Frontend

React + Vite + TypeScript client for the AI orchestration and prompt intelligence platform.
Talks to the API in `intelligent-llm-backend`.

## Run locally

```bash
# 1. backend (see its README) running on http://localhost:8000
# 2. frontend
npm install
npm run dev          # http://localhost:5173, /api is proxied to the backend
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Notes

- The session token is kept in `localStorage`. Never render untrusted HTML in this app.
- Provider API keys never reach the browser; all AI calls go through the backend.
- Status: signup/login, conversation list, and message sending work. AI replies arrive in Phase 2.
