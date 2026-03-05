import { NextResponse } from "next/server";

import { getHistory } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async () => {
  const history = await getHistory();

  return NextResponse.json({
    success: true,
    total: history.length,
    data: history,
  });
};
