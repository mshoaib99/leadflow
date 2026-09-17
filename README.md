# LeadFlow Pro

React + Vercel serverless API + Supabase PostgreSQL lead search application.

## Search behavior
- Lead type: Solar, Home, Mortgage.
- Search by State or ZIP.
- Each search returns a maximum of 3 leads.
- Repeating the same search returns the next 3 leads.
- After the last batch, the next search starts again from the first 3.
- Changing category, state, ZIP, or search mode resets the sequence.
- Result cards show the complete fields currently stored in the `leads` table.
- Email, Call, and Copy buttons are removed.
- No result count such as “Showing 3 of 33 leads” is displayed.

## Environment variables
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (server-side secret key; keep private)
- `IMPORT_SECRET` (only needed if using the optional import endpoint)
