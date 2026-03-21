# React — Hooks

### setIndex derived from time — storing in state unnecessarily

**Tried:** `const [index, setIndex] = useState(...)` + `useEffect` that calls `setIndex(getHourIndex(...))` synchronously at the top before setting an interval
**Broke:** ESLint `react-hooks/set-state-in-effect` — "Calling setState synchronously within an effect"
**Fix:** Remove state entirely. Derive the value on each render: `const index = hasInsights ? getHourIndex(insights.length) : 0`. Use a ticker state (`const [, setTick] = useState(0)`) and `setInterval(() => setTick(n => n + 1), 60_000)` in the effect to trigger re-renders. The index is always computed fresh.
**Watch out:** Only works when the derived value is pure (no async, no external data). If computation is expensive — memoize with `useMemo`.

### Ref assignments at render time

**Tried:** Moving `notesRef.current = notes` and `contentTypeRef.current = contentType` into `useLayoutEffect` to silence `react-hooks/refs`
**Broke:** Caused a new ESLint error: "Calling setState synchronously within an effect" (useLayoutEffect calling setState counts too)
**Fix:** Render-time ref assignments (`ref.current = value` directly in the component body, outside any hook) are a legitimate React pattern for keeping refs in sync. The `react-hooks/refs` rule flags this as a false positive when the ref is used inside a `useState` factory closure. Use `/* eslint-disable react-hooks/refs */ ... /* eslint-enable */` block around the `useState(factory)` call, not around the ref assignments.
**Watch out:** `eslint-disable-next-line` doesn't work for multi-line expressions — must use block disable/enable.
