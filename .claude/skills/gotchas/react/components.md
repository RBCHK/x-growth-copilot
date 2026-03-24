# React — Component Patterns

### react-markdown `text` component override does not exist

**Tried:** `components={{ text: ({ children }) => ... }}` in ReactMarkdown to wrap matched text in `<mark>`
**Broke:** No error, but highlight never renders — `text` is not a valid component name in react-markdown v9+. Text nodes pass through parent elements (`p`, `li`, etc.) without a dedicated override.
**Fix:** Use a rehype plugin that walks the HTML AST (hast) after markdown→HTML conversion. Find `type: "text"` nodes, split by regex, wrap matches in `<mark>` elements. This operates on rendered text, not raw markdown source.
**Watch out:** If you try to inject `<mark>` into raw markdown before ReactMarkdown, it won't match — user selects rendered text (no `**`, `*` syntax), but source contains markdown formatting.

### Component declared inside another component

**Tried:** `function NavLink(...) { ... }` declared inside `function MobileBottomNav() { ... }` to reuse `pathname` via closure
**Broke:** ESLint `react/no-unstable-nested-components` — "Cannot create components during render". Component state resets on every render of the parent.
**Fix:** Declare `NavLink` at module level. If it needs data from the parent, either pass as props or call the hook (`usePathname`) directly inside `NavLink`.
**Watch out:** The pattern looks convenient when the inner component needs parent state via closure — but that's exactly when it's most dangerous.

### TimePickerInput with conditional hook calls

**Tried:** Single `TimePickerInput` component with `if (isTouch) return <TouchVariant />` before hooks
**Broke:** React Rules of Hooks — hooks must not be called after a conditional return
**Fix:** Extract `TimePickerInputTouch` and `TimePickerInputDesktop` as separate named components. Parent `TimePickerInput` is a pure dispatcher: reads `isTouch`, returns one or the other — no hooks of its own.
