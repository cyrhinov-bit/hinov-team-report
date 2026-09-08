---
name: Supabase production boundary
description: Durable constraints for the HINOV production data path and secret handling.
---

The Supabase connector is appropriate for server-side Data API access, but it does not replace applying SQL migrations to the connected Supabase project. The Supabase CLI additionally requires a Personal Access Token beginning with `sbp_`; project API keys are not CLI login credentials. Keep schema/RLS SQL migrations versioned in the repository and treat them as a required deployment step.

**Why:** The connector exposes authenticated REST access, while schema creation and policy changes are database administration operations rather than ordinary table CRUD. CLI project discovery failed when the configured secret was not a Supabase PAT.

**How to apply:** Route mobile requests through the API server, never expose the connector or encrypted Gemini material to the mobile client, and apply the repository migration before enabling production accounts.