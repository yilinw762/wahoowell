import { NextResponse } from "next/server";
import { db } from "@/src/db/mysql";
import { RowDataPacket } from "mysql2/promise";

export async function GET() {
  const [rows] = await db.query<(RowDataPacket & { now: string })[]>("SELECT NOW() as now");
  const nowValue = rows[0]?.now ?? null;
  return NextResponse.json({ now: nowValue });
}