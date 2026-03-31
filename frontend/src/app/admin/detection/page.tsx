/**
 * /admin/detection now lives inside the Live Surveillance page.
 * This redirect keeps any bookmarked URLs working.
 */
import { redirect } from "next/navigation";

export default function DetectionPage() {
  redirect("/admin/live");
}
