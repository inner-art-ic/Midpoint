import { NextRequest, NextResponse } from 'next/server';

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || '';

// 地理编码服务（将城市名转为坐标）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: '缺少address参数' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&output=JSON`
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '请求失败' }, { status: 500 });
  }
}

// 路径规划/距离计算
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, city1, city2 } = body;

    if (!origin || !destination || !city1 || !city2) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const response = await fetch(
      `https://restapi.amap.com/v3/direction/transit/integrated?key=${AMAP_KEY}&origin=${origin}&destination=${destination}&city1=${encodeURIComponent(city1)}&city2=${encodeURIComponent(city2)}&strategy=0`
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '请求失败' }, { status: 500 });
  }
}