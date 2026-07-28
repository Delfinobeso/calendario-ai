import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy to the FastAPI backend (calendario-ai, :3181). The backend
// requires a shared X-API-Key on every route except / and /push/public-key —
// this key lives only in server env (CALENDARIO_API_KEY, no NEXT_PUBLIC_
// prefix) so it never reaches the browser bundle. The client only ever calls
// same-origin /api/backend/*.

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.CALENDARIO_API_KEY || "";

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "backend_unconfigured" }, { status: 502 });
  }

  const target = new URL(`${BACKEND_URL}/${path.join("/")}`);
  target.search = req.nextUrl.search;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (API_KEY) headers.set("x-api-key", API_KEY);

  const init: RequestInit = { method: req.method, headers, cache: "no-store" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(target, init);
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
