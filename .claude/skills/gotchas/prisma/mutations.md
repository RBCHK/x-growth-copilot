# Prisma — Mutation Gotchas

### addMessage FK violation when conversation deleted mid-stream

**Tried:** `prisma.message.create({ data: { conversationId, role, content } })` directly

**Broke:** `PrismaClientKnownRequestError` — Foreign key constraint failed on `Message_conversationId_fkey`.
Happens when user deletes a conversation while AI is still streaming — the conversation is gone by the time `addMessage` fires.

**Fix:** Always verify the conversation exists AND belongs to the current user before inserting:

```typescript
const conversation = await prisma.conversation.findFirst({
  where: { id: conversationId, userId },
  select: { id: true },
});
if (!conversation) return; // deleted or wrong user — silently skip
```

**Watch out:** Without the `userId` check this is also a security hole — any authenticated user who knows a `conversationId` can inject messages into someone else's conversation. Always include `userId` in the where clause.

### delete/update by id without scoping to parent

**Tried:** `prisma.note.delete({ where: { id } })` — delete note by its own id only
**Broke:** No runtime error, but security hole — any user who knows a note's `id` can delete/update it even if they don't own the conversation. The conversation ownership check above only verifies the user owns _some_ conversation, not that the note belongs to it.
**Fix:** Use `deleteMany`/`updateMany` with compound where: `{ id, conversationId }`. This ensures the note belongs to the verified conversation.
**Watch out:** Same pattern applies to any child entity (note, message, slot). Always scope mutations to the verified parent, not just the entity's own id.
