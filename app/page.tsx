import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("bombino_session");

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
