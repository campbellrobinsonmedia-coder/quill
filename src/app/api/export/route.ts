import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildBackup } from "@/lib/backup-export";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backup = await buildBackup(userId);

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="quill-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
