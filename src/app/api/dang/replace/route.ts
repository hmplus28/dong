import { NextResponse } from "next/server";

import { getDataStore, storeErrorResponse } from "@/lib/dang/server";

/** بازیابی کامل داده‌ها از فایل پشتیبان (جایگزین همه‌چیز می‌شه) */
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  try {
    const store = await getDataStore();
    await store.replaceAll(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storeErrorResponse(err);
  }
}
