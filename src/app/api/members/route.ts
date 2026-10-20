import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { badRequest, isObject, toMemberDTO } from "@/lib/dang/server";
import { MAX_NAME_LENGTH } from "@/lib/dang/types";
import { normalizeName } from "@/lib/dang/utils";

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  if (!isObject(body) || typeof body.name !== "string") {
    return badRequest("اسم عضو رو بنویس.");
  }

  const name = normalizeName(body.name);
  if (!name) return badRequest("اسم عضو رو بنویس.");
  if (name.length > MAX_NAME_LENGTH) {
    return badRequest("اسم نباید بیشتر از ۴۰ حرف باشه.");
  }

  const existing = await db.member.findFirst({ where: { name } });
  if (existing) {
    return badRequest(`«${name}» قبلاً عضو شده.`, 409);
  }

  const member = await db.member.create({ data: { name } });
  return NextResponse.json({ member: toMemberDTO(member) }, { status: 201 });
}
