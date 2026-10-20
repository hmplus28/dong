import { NextResponse } from "next/server";

import { getDataStore, storeErrorResponse } from "@/lib/dang/server";

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  try {
    const store = await getDataStore();
    const expense = await store.addExpense(body);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    return storeErrorResponse(err);
  }
}
