import { NextResponse } from "next/server";

import { getDataStore, storeErrorResponse } from "@/lib/dang/server";

/** پاک‌کردن کل داده‌ها (اعضا و هزینه‌ها) */
export async function POST() {
  try {
    const store = await getDataStore();
    await store.resetAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storeErrorResponse(err);
  }
}
