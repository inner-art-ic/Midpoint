import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Static map API route called');
    const searchParams = request.nextUrl.searchParams;

    const key = searchParams.get('key');
    const center = searchParams.get('center');
    const zoom = searchParams.get('zoom');
    const size = searchParams.get('size');
    const markers = searchParams.get('markers');
    const paths = searchParams.get('paths');

    console.log('Received parameters:', { key, center, zoom, size, markers, paths });

    if (!key) {
      console.error('Missing API key');
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set('key', key);
    if (center) params.set('center', center);
    if (zoom) params.set('zoom', zoom);
    if (size) params.set('size', size);
    if (markers) params.set('markers', markers);
    if (paths) params.set('paths', paths);

    const url = `https://restapi.amap.com/v3/staticmap?${params.toString()}`;
    console.log('Fetching static map from:', url);

    // 使用fetch获取静态地图，添加适当的请求头
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    // 检查响应内容类型
    const contentType = response.headers.get('Content-Type');
    console.log('Response content type:', contentType);

    // 读取响应内容
    const responseText = await response.text();
    console.log('Response text length:', responseText.length);
    
    // 检查是否是JSON错误响应
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = JSON.parse(responseText);
        console.error('AMap API error:', errorData);
        return NextResponse.json({ error: `AMap API error: ${errorData.info} (${errorData.infocode})` }, { status: 500 });
      } catch (e) {
        console.error('Failed to parse JSON error response:', e);
      }
    }

    if (!response.ok) {
      console.error('Error response from AMap:', responseText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
    }

    // 转换为ArrayBuffer
    const encoder = new TextEncoder();
    const imageBuffer = encoder.encode(responseText).buffer;
    console.log('Image buffer size:', imageBuffer.byteLength);

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    console.error('Error fetching static map:', error);
    return NextResponse.json({ error: `Failed to fetch static map: ${error}` }, { status: 500 });
  }
}
