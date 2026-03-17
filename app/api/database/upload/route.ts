import { NextRequest, NextResponse } from "next/server";
import { hasRole, ROLES } from "@/auth";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const isAuthorized = await hasRole([ROLES.OWNER]);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
       return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    
    // overwrite the database file
    await fs.writeFile(dbPath, buffer);
    
    return NextResponse.json({ success: true, message: "Database uploaded successfully." });
  } catch (err) {
    console.error("Upload Error:", err);
    return NextResponse.json({ error: "Failed to upload database" }, { status: 500 });
  }
}
