import { createClient } from "@supabase/supabase-js";

function client() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { state, zip, leadType, limit = 3, offset = 0 } = req.body || {};

    if (!state && !zip) return res.status(400).json({ error: "State or ZIP is required" });
    if (!leadType || !["solar", "home", "mortgage"].includes(String(leadType))) {
      return res.status(400).json({ error: "Valid lead type is required" });
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 3, 1), 3);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    if (zip && !/^\d{5}$/.test(String(zip))) {
      return res.status(400).json({ error: "ZIP must be 5 digits" });
    }

    const db = client();
    let query = db
      .from("leads")
      .select("id,name,email,phone,address,city,state,zip", { count: "exact" })
      .eq("lead_type", String(leadType));

    if (zip) {
      query = query.eq("zip", String(zip));
    } else {
      query = query.ilike("state", String(state).trim());
    }

    // Stable ordering makes the 3-at-a-time sequence predictable.
    query = query.order("id", { ascending: true }).range(safeOffset, safeOffset + safeLimit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = data || [];
    const total = count || 0;
    const hasMore = safeOffset + rows.length < total;

    return res.status(200).json({
      results: rows,
      nextOffset: hasMore ? safeOffset + rows.length : 0
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Database search failed" });
  }
}
