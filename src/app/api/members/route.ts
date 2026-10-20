import { NextResponse } from "next/server";

import { getDataStore, storeErrorResponse } from "@/lib/dang/server";

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  try {
    const store = await getDataStore();
    const member = await store.addMember(body);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return storeErrorResponse(err);
  }
}
