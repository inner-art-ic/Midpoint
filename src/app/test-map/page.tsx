'use client';

import { useEffect, useRef, useState } from 'react';

// 测试坐标数据
const TEST_COORDINATES = {
  cityA: { name: '深圳', longitude: 114.057868, latitude: 22.543099 },
  cityB: { name: '龙岩', longitude: 116.907151, latitude: 25.080349 },
  destination: { name: '莆田', longitude: 119.007592, latitude: 25.446962 }
};

export default function TestMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isMapReady, setIsMapReady] = useState(false);

  // 初始化地图并添加标记点
  useEffect(() => {
    console.log('初始化测试地图...');
    let initTimer: NodeJS.Timeout;
    let map: any = null;

    // 直接创建地图实例
    const initMap = () => {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        console.log('非浏览器环境，跳过地图初始化');
        return;
      }

      // 检查地图容器是否存在
      if (!mapRef.current) {
        console.log('地图容器不存在');
        return;
      }

      // 检查高德地图API是否加载
      if (! (window as any).AMap || typeof (window as any).AMap.Map !== 'function') {
        console.log('高德地图API未加载');
        // 尝试动态加载API
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${process.env.NEXT_PUBLIC_AMAP_KEY}`;
        script.onload = () => {
          console.log('高德地图API加载成功');
          // 加载成功后再次尝试初始化
          setTimeout(initMap, 100);
        };
        script.onerror = () => {
          console.error('高德地图API加载失败');
          setError('高德地图API加载失败');
        };
        document.body.appendChild(script);
        return;
      }

      try {
        console.log('开始创建地图实例...');

        // 创建地图实例
        map = new (window as any).AMap.Map(mapRef.current, {
          zoom: 7,
          center: [116.5, 25], // 福建附近
          resizeEnable: true
        });

        console.log('地图实例创建成功:', map);

        // 等待地图加载完成
        map.on('complete', () => {
          console.log('地图加载完成');
          setIsMapReady(true);
          setMapInstance(map);
          
          // 地图加载完成后自动添加标记点
          addMarkers(map);
        });

      } catch (err) {
        console.error('创建地图实例失败:', err);
        setError(`创建地图实例失败: ${err}`);
      }
    };

    // 添加标记点的函数
    const addMarkers = (mapInstance: any) => {
      if (!mapInstance) {
        console.log('地图未就绪，无法添加标记');
        return;
      }

      console.log('开始添加标记点...');
      console.log('测试坐标:', TEST_COORDINATES);

      // 清除之前的标记
      mapInstance.clearMap();

      try {
        // 添加城市A标记（蓝色）
        const markerA = new (window as any).AMap.Marker({
          position: [TEST_COORDINATES.cityA.longitude, TEST_COORDINATES.cityA.latitude],
          title: `城市A: ${TEST_COORDINATES.cityA.name}`,
          icon: new (window as any).AMap.Icon({
            size: new (window as any).AMap.Size(32, 32),
            image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
            imageSize: new (window as any).AMap.Size(32, 32)
          }),
          label: {
            content: TEST_COORDINATES.cityA.name,
            offset: new (window as any).AMap.Pixel(0, -25),
            color: '#1890ff' // 蓝色
          }
        });

        markerA.setMap(mapInstance);
        console.log('城市A标记添加成功');

        // 添加城市B标记（蓝色）
        const markerB = new (window as any).AMap.Marker({
          position: [TEST_COORDINATES.cityB.longitude, TEST_COORDINATES.cityB.latitude],
          title: `城市B: ${TEST_COORDINATES.cityB.name}`,
          icon: new (window as any).AMap.Icon({
            size: new (window as any).AMap.Size(32, 32),
            image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
            imageSize: new (window as any).AMap.Size(32, 32)
          }),
          label: {
            content: TEST_COORDINATES.cityB.name,
            offset: new (window as any).AMap.Pixel(0, -25),
            color: '#1890ff' // 蓝色
          }
        });

        markerB.setMap(mapInstance);
        console.log('城市B标记添加成功');

        // 添加推荐城市标记（绿色）
        const markerDest = new (window as any).AMap.Marker({
          position: [TEST_COORDINATES.destination.longitude, TEST_COORDINATES.destination.latitude],
          title: `推荐城市: ${TEST_COORDINATES.destination.name}`,
          icon: new (window as any).AMap.Icon({
            size: new (window as any).AMap.Size(32, 32),
            image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
            imageSize: new (window as any).AMap.Size(32, 32)
          }),
          label: {
            content: TEST_COORDINATES.destination.name,
            offset: new (window as any).AMap.Pixel(0, -25),
            color: '#52c41a' // 绿色
          }
        });

        markerDest.setMap(mapInstance);
        console.log('推荐城市标记添加成功');

        // 设置地图视野
        mapInstance.setFitView();
        console.log('地图视野已调整');

      } catch (err) {
        console.error('添加标记失败:', err);
        setError(`添加标记失败: ${err}`);
      }
    };

    // 延迟初始化，确保DOM完全渲染
    initTimer = setTimeout(initMap, 300);

    // 清理函数
    return () => {
      if (initTimer) {
        clearTimeout(initTimer);
      }
      if (map && typeof map.destroy === 'function') {
        try {
          map.destroy();
        } catch (err) {
          console.error('销毁地图实例失败:', err);
        }
      }
    };

  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">地图标记测试页面</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">测试坐标数据</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">城市A: {TEST_COORDINATES.cityA.name}</h3>
              <p className="text-sm text-gray-600">经度: {TEST_COORDINATES.cityA.longitude}</p>
              <p className="text-sm text-gray-600">纬度: {TEST_COORDINATES.cityA.latitude}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">城市B: {TEST_COORDINATES.cityB.name}</h3>
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

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-xl font-semibold p-4 border-b">地图显示区域</h2>
          <div
            ref={mapRef}
            style={{ width: '100%', height: '600px' }}
            className="bg-gray-200"
          >
            {!isMapReady && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">地图加载中...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">图例:</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>城市A & 城市B</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>推荐城市</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
