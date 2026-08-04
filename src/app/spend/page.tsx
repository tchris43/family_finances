import { redirect } from "next/navigation";

/** Old Spend route — bucket planning lives on /plan; quick add is on Home. */
export default function SpendRedirectPage() {
  redirect("/plan");
}
