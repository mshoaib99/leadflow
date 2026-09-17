import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

function csvToRows(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; continue; }
    if (c === '"') { quoted = !quoted; continue; }
    if (c === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && n === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += c;
  }
  row.push(cell.trim());
  if (row.some(v => v !== "")) rows.push(row);
  return rows;
}

const aliases = {
  name: ["name","full_name","fullname"],
  email: ["email","email_address"],
  phone: ["phone","phone_number","mobile"],
  address: ["address","street","street_address"],
  city: ["city"],
  state: ["state","state_name"],
  zip: ["zip","zipcode","zip_code","postal_code"]
};

function normalizeHeader(s) {
  return String(s || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function mapRow(headers, row) {
  const out = {};
  for (const [field, names] of Object.entries(aliases)) {
    const idx = headers.findIndex(h => names.includes(h));
    out[field] = idx >= 0 ? String(row[idx] || "").trim() : "";
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.IMPORT_SECRET || req.headers["x-import-secret"] !== process.env.IMPORT_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { sheetCsvUrl } = req.body || {};
    if (!sheetCsvUrl) return res.status(400).json({ error: "sheetCsvUrl is required" });

    const response = await fetch(sheetCsvUrl);
    if (!response.ok) throw new Error(`Google Sheet download failed: ${response.status}`);
    const text = await response.text();
    const rows = csvToRows(text);
    if (rows.length < 2) return res.status(400).json({ error: "Sheet has no data rows" });

    const headers = rows[0].map(normalizeHeader);
    const records = rows.slice(1).map(r => mapRow(headers, r)).filter(r => Object.values(r).some(Boolean));

    const prepared = records.map(r => {
      const key = crypto.createHash("sha256")
        .update([r.name,r.email,r.phone,r.address,r.city,r.state,r.zip].map(v => v.toLowerCase()).join("|"))
        .digest("hex");
      return { ...r, lead_key: key };
    });

    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await db.from("leads").upsert(prepared, { onConflict: "lead_key", ignoreDuplicates: false });
    if (error) throw error;

    return res.status(200).json({ imported: prepared.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Import failed" });
  }
}