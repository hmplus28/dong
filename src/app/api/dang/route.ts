import { NextResponse } from "next/server";

import { getDataStore, storeErrorResponse } from "@/lib/dang/server";

export async function GET() {
  try {
    const store = await getDataStore();
    const data = await store.listAll();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return storeErrorResponse(err);
  }
}
