import LoginForm from "./LoginForm";
import { getDb, all } from "@/lib/db";

export default async function LoginPage() {
  let logoUrl = "";
  let siteName = "BOMBINO";

  try {
    const db = await getDb();
    const rs = await db.execute({
      sql: "SELECT key, value FROM settings",
      args: [],
    });
    for (const row of all(rs)) {
      if (row.key === "logo_url" && row.value) logoUrl = row.value;
      if (row.key === "site_name" && row.value) siteName = row.value;
    }
  } catch {
    // fallback to defaults if DB is unavailable
  }

  return <LoginForm initialLogoUrl={logoUrl} initialSiteName={siteName} />;
}
