# React — Component Patterns

### Component declared inside another component

**Tried:** `function NavLink(...) { ... }` declared inside `function MobileBottomNav() { ... }` to reuse `pathname` via closure
**Broke:** ESLint `react/no-unstable-nested-components` — "Cannot create components during render". Component state resets on every render of the parent.
**Fix:** Declare `NavLink` at module level. If it needs data from the parent, either pass as props or call the hook (`usePathname`) directly inside `NavLink`.
**Watch out:** The pattern looks convenient when the inner component needs parent state via closure — but that's exactly when it's most dangerous.

### TimePickerInput with conditional hook calls

**Tried:** Single `TimePickerInput` component with `if (isTouch) return <TouchVariant />` before hooks
**Broke:** React Rules of Hooks — hooks must not be called after a conditional return
**Fix:** Extract `TimePickerInputTouch` and `TimePickerInputDesktop` as separate named components. Parent `TimePickerInput` is a pure dispatcher: reads `isTouch`, returns one or the other — no hooks of its own.
