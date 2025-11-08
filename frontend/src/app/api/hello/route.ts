import { NextResponse } from 'next/server';
import { db } from '@/src/db/mysql';

export async function GET() {
  const [rows] = await db.query('SELECT NOW() as now');
  return NextResponse.json({ now: rows[0].now });
}