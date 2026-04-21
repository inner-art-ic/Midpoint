'use client';

import { useState, useEffect, useRef } from 'react';

// 定义推荐城市的类型
interface Route {
  duration: number;
  durationRange: {
    min: number;
    max: number;
    formatted: string;
  };
  price: number;
  arrivalStation: string;
  trainNo?: string;
  departureTime?: string;
  arrivalTime?: string;
}

interface Recommendation {
  city: string;
  location: string;
  score: number;
  routes: {
    fromA: Route;
    fromB: Route;
  };
  sameStation: boolean;
  timeDifference: number;
  totalCost: number;
  coordinates?: {
    longitude: number;
    latitude: number;
  };
}

// 城市坐标类型
interface CityCoordinates {
  [key: string]: {
    longitude: number;
    latitude: number;
  };
}

export default function Home() {
  const [cityA, setCityA] = useState('深圳');
  const [cityB, setCityB] = useState('龙岩');
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState('');
  const [cityCoordinates, setCityCoordinates] = useState<CityCoordinates>({});
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const handleSearch = async () => {
    if (!cityA || !cityB) {
      setError('请输入两个城市名称');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setSelectedRecommendation(null);

    try {
      const response = await fetch('/api/calculate-optimal-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityA, cityB, maxResults: 5 }),
      });

      const data = await response.json();

      if (data.error) {
        const errorMessage = data.error.includes('USERKEY_PLAT_NOMATCH')
          ? 'API密钥白名单未配置，请到高德开放平台添加 localhost 和服务器IP'
          : data.error;
        setError(errorMessage);
      } else {
        const recommendations = data.recommendations || [];
        
        console.log('API响应数据:', {
          recommendations: recommendations,
          cityCoordinates: data.cityCoordinates
        });
        
        // 存储城市坐标
        const coordinates: CityCoordinates = {};
        
        // 确保城市坐标存在
        console.log('API返回的城市坐标:', data.cityCoordinates);
        
        // 存储出发城市坐标
        if (data.cityCoordinates && data.cityCoordinates[cityA]) {
          coordinates[cityA] = data.cityCoordinates[cityA];
          console.log('城市A坐标:', cityA, data.cityCoordinates[cityA]);
        } else {
          console.error('城市A坐标不存在:', cityA);
          console.error('可用的城市坐标:', Object.keys(data.cityCoordinates || {}));
        }
        if (data.cityCoordinates && data.cityCoordinates[cityB]) {
          coordinates[cityB] = data.cityCoordinates[cityB];
          console.log('城市B坐标:', cityB, data.cityCoordinates[cityB]);
        } else {
          console.error('城市B坐标不存在:', cityB);
          console.error('可用的城市坐标:', Object.keys(data.cityCoordinates || {}));
        }
        
        // 存储推荐城市坐标并创建新的推荐对象
        const updatedRecommendations = recommendations.map((rec: Recommendation) => {
          const updatedRec = { ...rec };
          if (data.cityCoordinates && data.cityCoordinates[rec.city]) {
            coordinates[rec.city] = data.cityCoordinates[rec.city];
            updatedRec.coordinates = data.cityCoordinates[rec.city];
            console.log('推荐城市坐标:', rec.city, data.cityCoordinates[rec.city]);
          } else {
            console.error('推荐城市坐标不存在:', rec.city);
            console.error('可用的城市坐标:', Object.keys(data.cityCoordinates || {}));
          }
          return updatedRec;
        });
        
        setResults(updatedRecommendations);
        setCityCoordinates(coordinates);
        
        // 默认选择第一个推荐城市
        if (updatedRecommendations.length > 0) {
          console.log('默认选择第一个推荐城市:', updatedRecommendations[0]);
          setSelectedRecommendation(updatedRecommendations[0]);
        }
      }
    } catch (err) {
      console.error('请求失败:', err);
      setError('请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始化地图
  useEffect(() => {
    console.log('地图初始化的useEffect触发');
    console.log('results.length:', results.length);
    console.log('mapRef.current:', mapRef.current);
    
    let initTimer: NodeJS.Timeout;
    let map: any = null;
    
    // 当有结果时，等待DOM更新后再初始化地图
    if (results.length > 0) {
      // 使用setTimeout延迟初始化，确保DOM已经完全更新
      initTimer = setTimeout(() => {
        console.log('延迟初始化地图，mapRef.current:', mapRef.current);
        
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
              setMapLoading(false);
            };
            document.body.appendChild(script);
            return;
          }

          try {
            console.log('开始创建地图实例...');

            // 检查是否已经存在地图实例
            if (mapInstance.current) {
              try {
                mapInstance.current.destroy();
                console.log('已销毁旧地图实例');
              } catch (err) {
                console.error('销毁旧地图实例失败:', err);
              }
            }

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
              setMapLoading(false);
              mapInstance.current = map;
              
              console.log('地图初始化成功');
              
              // 地图初始化完成后，检查是否有选中的推荐城市，如果有则绘制路线
              if (selectedRecommendation) {
                console.log('地图初始化完成，尝试绘制路线');
                // 手动触发绘制路线的逻辑
                if (cityCoordinates[cityA] && cityCoordinates[cityB]) {
                  console.log('所有条件满足，开始绘制路线');
                  
                  const coordA = cityCoordinates[cityA];
                  const coordB = cityCoordinates[cityB];
                  const destinationCoord = selectedRecommendation.coordinates;
                  
                  if (!destinationCoord) {
                    console.error('目的地坐标不存在:', selectedRecommendation);
                    return;
                  }
                  
                  try {
                    // 清除之前的标记和路线
                    map.clearMap();
                    console.log('已清除之前的标记和路线');

                    // 添加城市A标记（只保留名称，在线上方）
                    const markerA = new (window as any).AMap.Marker({
                      position: [coordA.longitude, coordA.latitude - 0.02],
                      title: cityA,
                      label: {
                        content: cityA,
                        offset: new (window as any).AMap.Pixel(0, 0),
                        color: '#faad14' // 黄色
                      }
                    });

                    markerA.setMap(map);
                    console.log('城市A标记添加成功');

                    // 添加城市B标记（只保留名称，在线上方）
                    const markerB = new (window as any).AMap.Marker({
                      position: [coordB.longitude, coordB.latitude - 0.02],
                      title: cityB,
                      label: {
                        content: cityB,
                        offset: new (window as any).AMap.Pixel(0, 0),
                        color: '#faad14' // 黄色
                      }
                    });

                    markerB.setMap(map);
                    console.log('城市B标记添加成功');

                    // 添加推荐城市标记（只保留名称，在线上方）
                    const markerDest = new (window as any).AMap.Marker({
                      position: [destinationCoord.longitude, destinationCoord.latitude + 0.02],
                      title: selectedRecommendation.city,
                      label: {
                        content: selectedRecommendation.city,
                        offset: new (window as any).AMap.Pixel(0, 0),
                        color: '#1890ff' // 蓝色
                      }
                    });

                    markerDest.setMap(map);
                    console.log('推荐城市标记添加成功');

                    // 绘制直线连接城市A和目标城市，带有箭头
                    const polyline1 = new (window as any).AMap.Polyline({
                      path: [
                        [coordA.longitude, coordA.latitude],
                        [destinationCoord.longitude, destinationCoord.latitude]
                      ],
                      strokeColor: '#ff4d4f', // 线条颜色（红色）
                      strokeWeight: 8, // 线条宽度（加大以使箭头更明显）
                      strokeOpacity: 0.8, // 线条透明度
                      lineJoin: 'round', // 线条连接处样式
                      lineCap: 'round', // 线条末端样式
                      showDir: true // 显示箭头
                    });

                    polyline1.setMap(map);
                    console.log('城市A到目标城市的直线连接绘制成功');

                    // 绘制直线连接城市B和目标城市，带有箭头
                    const polyline2 = new (window as any).AMap.Polyline({
                      path: [
                        [coordB.longitude, coordB.latitude],
                        [destinationCoord.longitude, destinationCoord.latitude]
                      ],
                      strokeColor: '#ff4d4f', // 线条颜色（红色）
                      strokeWeight: 8, // 线条宽度（加大以使箭头更明显）
                      strokeOpacity: 0.8, // 线条透明度
                      lineJoin: 'round', // 线条连接处样式
                      lineCap: 'round', // 线条末端样式
                      showDir: true // 显示箭头
                    });

                    polyline2.setMap(map);
                    console.log('城市B到目标城市的直线连接绘制成功');

                    // 设置地图视野
                    map.setFitView();
                    console.log('地图视野已调整');
                    
                    console.log('路线绘制完成');
                  } catch (error) {
                    console.error('绘制路线时出错:', error);
                  }
                }
              }
            });

          } catch (err) {
            console.error('创建地图实例失败:', err);
            setError(`创建地图实例失败: ${err}`);
            setMapLoading(false);
          }
        };

        // 立即开始初始化地图
        initMap();
      }, 300); // 延迟300ms，确保DOM更新完成
    } else {
      console.log('地图容器尚未渲染，等待渲染完成...');
    }
    
    // 清理函数
    return () => {
      if (initTimer) {
        clearTimeout(initTimer);
      }
      // 销毁地图实例
      if (mapInstance.current) {
        try {
          mapInstance.current.destroy();
          console.log('地图实例已销毁');
        } catch (error) {
          console.error('销毁地图实例失败:', error);
        }
      }
    };
  }, [results.length]); // 当results变化时重新检查

  // 绘制路线
  useEffect(() => {
    console.log('绘制路线的useEffect触发:', {
      mapInstance: mapInstance.current,
      selectedRecommendation: selectedRecommendation,
      cityA: cityA,
      cityB: cityB,
      cityCoordinates: cityCoordinates
    });
    
    // 确保所有必要条件都满足
    if (!mapInstance.current) {
      console.log('地图尚未初始化，等待初始化完成...');
      return;
    }
    
    if (!selectedRecommendation || !cityCoordinates[cityA] || !cityCoordinates[cityB]) {
      console.log('缺少必要参数，无法绘制路线:', {
        selectedRecommendation: selectedRecommendation,
        cityCoordinatesA: cityCoordinates[cityA],
        cityCoordinatesB: cityCoordinates[cityB]
      });
      return;
    }
    
    // 确保地图实例有效
    if (typeof (mapInstance.current as any).setZoom === 'undefined') {
      console.error('地图实例无效，无法绘制路线');
      return;
    }
    
    // 确保高德地图API完全加载
    if (typeof (window as any).AMap === 'undefined' || typeof (window as any).AMap.Polyline !== 'function') {
      console.error('高德地图API未完全加载，无法绘制路线');
      return;
    }
    
    console.log('所有条件满足，开始绘制路线...');
    
    // 绘制路线逻辑
    const coordA = cityCoordinates[cityA];
    const coordB = cityCoordinates[cityB];
    const destinationCoord = selectedRecommendation.coordinates;
    
    if (!destinationCoord) {
      console.error('目的地坐标不存在:', selectedRecommendation);
      return;
    }
    
    // 验证坐标有效性
    const validateCoord = (coord: any, name: string) => {
      if (!coord) {
        console.error(`${name} 坐标不存在`);
        return false;
      }
      if (typeof coord.longitude !== 'number' || isNaN(coord.longitude)) {
        console.error(`${name} 经度无效:`, coord.longitude);
        return false;
      }
      if (typeof coord.latitude !== 'number' || isNaN(coord.latitude)) {
        console.error(`${name} 纬度无效:`, coord.latitude);
        return false;
      }
      // 验证坐标范围
      if (Math.abs(coord.longitude) > 180 || Math.abs(coord.latitude) > 90) {
        console.error(`${name} 坐标范围无效:`, coord);
        return false;
      }
      return true;
    };
    
    if (!validateCoord(coordA, '城市A') || !validateCoord(coordB, '城市B') || !validateCoord(destinationCoord, '目的地')) {
      console.error('坐标无效，无法绘制路线');
      return;
    }
    
    console.log('绘制路线:', {
      cityA: coordA,
      cityB: coordB,
      destination: destinationCoord
    });
    
    try {
      // 清除之前的标记和路线
      mapInstance.current.clearMap();
      console.log('已清除之前的标记和路线');

      // 添加城市A标记（只保留名称，在线上方）
      const markerA = new (window as any).AMap.Marker({
        position: [coordA.longitude, coordA.latitude - 0.02],
        title: cityA,
        label: {
          content: cityA,
          offset: new (window as any).AMap.Pixel(0, 0),
          color: '#faad14' // 黄色
        }
      });

      markerA.setMap(mapInstance.current);
      console.log('城市A标记添加成功');

      // 添加城市B标记（只保留名称，在线上方）
      const markerB = new (window as any).AMap.Marker({
        position: [coordB.longitude, coordB.latitude - 0.02],
        title: cityB,
        label: {
          content: cityB,
          offset: new (window as any).AMap.Pixel(0, 0),
          color: '#faad14' // 黄色
        }
      });

      markerB.setMap(mapInstance.current);
      console.log('城市B标记添加成功');

      // 添加推荐城市标记（只保留名称，在线上方）
      const markerDest = new (window as any).AMap.Marker({
        position: [destinationCoord.longitude, destinationCoord.latitude + 0.02],
        title: selectedRecommendation.city,
        label: {
          content: selectedRecommendation.city,
          offset: new (window as any).AMap.Pixel(0, 0),
          color: '#1890ff' // 蓝色
        }
      });

      markerDest.setMap(mapInstance.current);
      console.log('推荐城市标记添加成功');

      // 绘制直线连接城市A和目标城市，带有箭头
      const polyline1 = new (window as any).AMap.Polyline({
        path: [
          [coordA.longitude, coordA.latitude],
          [destinationCoord.longitude, destinationCoord.latitude]
        ],
        strokeColor: '#ff4d4f', // 线条颜色（红色）
        strokeWeight: 8, // 线条宽度（加大以使箭头更明显）
        strokeOpacity: 0.8, // 线条透明度
        lineJoin: 'round', // 线条连接处样式
        lineCap: 'round', // 线条末端样式
        showDir: true // 显示箭头
      });

      polyline1.setMap(mapInstance.current);
      console.log('城市A到目标城市的直线连接绘制成功');

      // 绘制直线连接城市B和目标城市，带有箭头
      const polyline2 = new (window as any).AMap.Polyline({
        path: [
          [coordB.longitude, coordB.latitude],
          [destinationCoord.longitude, destinationCoord.latitude]
        ],
        strokeColor: '#ff4d4f', // 线条颜色（红色）
        strokeWeight: 8, // 线条宽度（加大以使箭头更明显）
        strokeOpacity: 0.8, // 线条透明度
        lineJoin: 'round', // 线条连接处样式
        lineCap: 'round', // 线条末端样式
        showDir: true // 显示箭头
      });

      polyline2.setMap(mapInstance.current);
      console.log('城市B到目标城市的直线连接绘制成功');

      // 设置地图视野
      mapInstance.current.setFitView();
      console.log('地图视野已调整');
      
      console.log('路线绘制完成');
    } catch (error) {
      console.error('绘制路线时出错:', error);
      // 尝试简化路线绘制，只绘制基础路线
      try {
        console.log('尝试简化路线绘制...');
        // 只绘制基础路线，不添加信息窗口
        const polylineA = new (window as any).AMap.Polyline({
          path: [[coordA.longitude, coordA.latitude], [destinationCoord.longitude, destinationCoord.latitude]],
          strokeColor: '#ff4d4f',
          strokeWeight: 8,
          strokeOpacity: 0.8,
          showDir: true
        });
        polylineA.setMap(mapInstance.current as any);
        
        const polylineB = new (window as any).AMap.Polyline({
          path: [[coordB.longitude, coordB.latitude], [destinationCoord.longitude, destinationCoord.latitude]],
          strokeColor: '#ff4d4f',
          strokeWeight: 8,
          strokeOpacity: 0.8,
          showDir: true
        });
        polylineB.setMap(mapInstance.current as any);
        
        console.log('简化路线绘制成功');
      } catch (simpleError) {
        console.error('简化路线绘制也失败:', simpleError);
      }
    }
  }, [selectedRecommendation, cityA, cityB, cityCoordinates]);

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">MidPoint - 异地约会地点推荐</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">城市A（出发地）</label>
              <input
                type="text"
                value={cityA}
                onChange={(e) => setCityA(e.target.value)}
                placeholder="请输入城市名称"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">城市B（出发地）</label>
              <input
                type="text"
                value={cityB}
                onChange={(e) => setCityB(e.target.value)}
                placeholder="请输入城市名称"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '搜索中...' : '寻找最佳约会地点'}
          </button>

          {error && (
            <p className="mt-4 text-red-600 text-center">{error}</p>
          )}
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 推荐城市列表 */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4">推荐约会地点</h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all ${selectedRecommendation?.city === result.city ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
                    onClick={() => setSelectedRecommendation(result)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">{result.city}</h3>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        评分: {result.score}
                      </span>
                    </div>
                    <div className="mb-4">
                      {result.score >= 90 && <p className="text-green-600">⭐⭐⭐⭐⭐ 最佳选择！时间和费用都非常合理，同站到达方便快捷。</p>}
                      {result.score >= 80 && result.score < 90 && <p className="text-blue-600">⭐⭐⭐⭐ 很好的选择，时间和费用都比较合理。</p>}
                      {result.score >= 70 && result.score < 80 && <p className="text-yellow-600">⭐⭐⭐ 不错的选择，时间和费用都在可接受范围内。</p>}
                      {result.score < 70 && <p className="text-orange-600">⭐⭐ 可以考虑的选择，时间或费用可能不太理想。</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">从 {cityA} 出发</p>
                        <p>耗时: {result.routes.fromA.durationRange.formatted}</p>
                        <p>费用: ¥{result.routes.fromA.price}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">从 {cityB} 出发</p>
                        <p>耗时: {result.routes.fromB.durationRange.formatted}</p>
                        <p>费用: ¥{result.routes.fromB.price}</p>
                      </div>
                    </div>
                    {result.sameStation && (
                      <p className="mt-3 text-blue-600 text-sm font-medium">
                        ✓ 两地同站到达：{result.routes.fromA.arrivalStation || '未知车站'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 地图 */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">路线地图</h2>
              <div 
                ref={mapRef} 
                style={{ width: '100%', height: '500px' }}
                className="rounded-lg shadow-md overflow-hidden relative"
              >
                {mapLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">地图加载中...</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}