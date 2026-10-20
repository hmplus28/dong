import { NextResponse } from "next/server";

import { getDataStore, storeErrorResponse } from "@/lib/dang/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const store = await getDataStore();
    await store.removeMember(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storeErrorResponse(err);
  }
}
