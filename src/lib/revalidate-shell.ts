import { revalidatePath } from "next/cache";

// The sidebar (project/series tree and inbox count) lives in the app layout,
// which persists across navigation, so any change to that data has to
// invalidate the layout itself.
export function revalidateShell() {
  revalidatePath("/", "layout");
}
