# ESLint — Disable Patterns & False Positives

### eslint-disable-next-line doesn't work for multi-line expressions

**Tried:** `// eslint-disable-next-line react-hooks/refs` on the line before a multi-line `useState(factory)` call
**Broke:** ESLint still reported the error — the disable only covers the single next line, not the full multi-line expression
**Fix:** Use block disable/enable around the entire expression:

```ts
/* eslint-disable react-hooks/refs */
const [transport] = useState(
  () => new DefaultChatTransport({ ... })
);
/* eslint-enable react-hooks/refs */
```

### react-hooks/refs false positive on useState factory with ref closure

**Tried:** `useState(() => new DefaultChatTransport({ body: () => ({ notes: notesRef.current }) }))` — the factory reads `.current` lazily at send time, not at render time
**Broke:** ESLint `react-hooks/refs` fires anyway because the factory captures ref objects
**Fix:** This is a false positive — the closure reads `.current` lazily (at call time), not eagerly (at render time). Safe pattern. Suppress with block disable/enable and explain why:

```ts
/* eslint-disable react-hooks/refs -- factory reads .current lazily at send time, not at render */
const [transport] = useState(() => new DefaultChatTransport(...));
/* eslint-enable react-hooks/refs */
```

### Unused eslint-disable directives accumulate silently

**Tried:** Left `// eslint-disable-next-line react-hooks/exhaustive-deps` in place after refactoring made the violation disappear
**Broke:** ESLint warns "Unused eslint-disable directive" — the suppression is now suppressing nothing
**Fix:** After refactoring, re-run `npm run lint` and remove any disable comments that are no longer needed.
