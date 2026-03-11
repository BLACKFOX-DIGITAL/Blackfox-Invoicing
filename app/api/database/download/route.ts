import { NextRequest, NextResponse } from "next/server";
import { hasRole, ROLES } from "@/auth";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const isAuthorized = await hasRole([ROLES.OWNER]);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  try {
    const fileBuffer = await fs.readFile(dbPath);
    return new NextResponse(fileBuffer, {
      headers: {
         "Content-Type": "application/x-sqlite3",
         "Content-Disposition": `attachment; filename="database-backup.db"`,
         "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("Download Error:", err);
    return NextResponse.json({ error: "Failed to download database" }, { status: 500 });
  }
}
