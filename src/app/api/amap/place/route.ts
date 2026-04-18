import { NextRequest, NextResponse } from 'next/server';

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || '';

// 附近城市推荐（基于中点坐标搜索旅游城市）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ error: '缺少location参数' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${location}&radius=500000&types=190000&offset=20&page=1`
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '请求失败' }, { status: 500 });
  }
}

// 酒店搜索
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city } = body;

    if (!city) {
      return NextResponse.json({ error: '缺少city参数' }, { status: 400 });
    }

    const response = await fetch(
      `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=酒店&city=${encodeURIComponent(city)}&types=100000&offset=10&page=1`
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '请求失败' }, { status: 500 });
  }
}