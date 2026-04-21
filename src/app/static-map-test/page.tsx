'use client';

import { useEffect, useState } from 'react';

// 测试坐标数据
const TEST_COORDINATES = {
  cityA: { name: '深圳', longitude: 114.057868, latitude: 22.543099 },
  cityB: { name: '龙岩', longitude: 116.907151, latitude: 25.080349 },
  destination: { name: '莆田', longitude: 119.007592, latitude: 25.446962 }
};

export default function StaticMapTest() {
  const [staticMapUrl, setStaticMapUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('初始化静态地图测试...');
    
    try {
      // 生成静态地图URL
      const center = [
        (TEST_COORDINATES.cityA.longitude + TEST_COORDINATES.cityB.longitude + TEST_COORDINATES.destination.longitude) / 3,
        (TEST_COORDINATES.cityA.latitude + TEST_COORDINATES.cityB.latitude + TEST_COORDINATES.destination.latitude) / 3
      ];
      const zoom = 8;
      const size = '700*450';
      const key = process.env.NEXT_PUBLIC_AMAP_KEY;

      // 标记点
      const markers = [
        `${TEST_COORDINATES.cityA.longitude},${TEST_COORDINATES.cityA.latitude},1,0xFF1890FF`,
        `${TEST_COORDINATES.cityB.longitude},${TEST_COORDINATES.cityB.latitude},1,0xFF1890FF`,
        `${TEST_COORDINATES.destination.longitude},${TEST_COORDINATES.destination.latitude},2,0xFF52C41A`
      ].join('|');

      // 路线
      const paths = [
        `${TEST_COORDINATES.cityA.longitude},${TEST_COORDINATES.cityA.latitude};${TEST_COORDINATES.destination.longitude},${TEST_COORDINATES.destination.latitude}`,
        `${TEST_COORDINATES.cityB.longitude},${TEST_COORDINATES.cityB.latitude};${TEST_COORDINATES.destination.longitude},${TEST_COORDINATES.destination.latitude}`
      ].join('|');

      // 直接使用高德地图静态API的URL
      const url = `https://restapi.amap.com/v3/staticmap?key=${key}&center=${center[0]},${center[1]}&zoom=${zoom}&size=${size}&markers=${markers}&paths=0xFF4D4F,3,,0.8|${paths}`;
      setStaticMapUrl(url);
      console.log('静态地图URL已生成:', url);

    } catch (err) {
      console.error('生成静态地图URL失败:', err);
      setError(`生成静态地图URL失败: ${err}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">静态地图测试页面</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">测试坐标数据</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">城市A: {TEST_COORDINATES.cityA.name}</h3>
              <p className="text-sm text-gray-600">经度: {TEST_COORDINATES.cityA.longitude}</p>
              <p className="text-sm text-gray-600">纬度: {TEST_COORDINATES.cityA.latitude}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800">城市B: {TEST_COORDINATES.cityB.name}</h3>
              <p className="text-sm text-gray-600">经度: {TEST_COORDINATES.cityB.longitude}</p>
              <p className="text-sm text-gray-600">纬度: {TEST_COORDINATES.cityB.latitude}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">推荐城市: {TEST_COORDINATES.destination.name}</h3>
              <p className="text-sm text-gray-600">经度: {TEST_COORDINATES.destination.longitude}</p>
              <p className="text-sm text-gray-600">纬度: {TEST_COORDINATES.destination.latitude}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">错误信息</h2>
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              <strong>错误:</strong> {error}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">静态地图</h2>
          <div className="flex justify-center">
            <div className="relative w-[700px] h-[450px] border border-gray-300 rounded-lg overflow-hidden">
              {staticMapUrl ? (
                <>
                  <p className="text-sm mb-2">静态地图URL: {staticMapUrl}</p>
                  <img src={staticMapUrl} alt="静态地图" className="w-full h-full object-cover" />
                </>
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <p className="text-gray-600">地图加载中...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-4">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <div className="flex gap-4">
            <a
              href="/map-test"
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回地图测试页面
            </a>
            <a
              href="/"
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回主页
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}