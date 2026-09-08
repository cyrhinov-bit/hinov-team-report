---
name: Supabase production boundary
description: Durable constraints for the HINOV production data path and secret handling.
---

The Supabase connector is appropriate for server-side Data API access, but it does not replace applying SQL migrations to the connected Supabase project. Keep schema/RLS SQL migrations versioned in the repository and treat them as a required deployment step.

**Why:** The connector exposes authenticated REST access, while schema creation and policy changes are database administration operations rather than ordinary table CRUD.

**How to apply:** Route mobile requests through the API server, never expose the connector or encrypted Gemini material to the mobile client, and apply the repository migration before enabling production accounts.