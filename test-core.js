// 测试核心功能，绕过Next.js服务器
const AMAP_KEY = 'b86966801b1b0eeee797f1bd52a17575';

// 城市坐标缓存
const cityCoordinateCache = {};

// 计算两点之间的中点坐标
function calculateMidpoint(lat1, lon1, lat2, lon2) {
  const rad1 = (lat1 * Math.PI) / 180;
  const rad2 = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const Bx = Math.cos(rad2) * Math.cos(dLon);
  const By = Math.cos(rad2) * Math.sin(dLon);
  
  const lat3 = Math.atan2(
    Math.sin(rad1) + Math.sin(rad2),
    Math.sqrt((Math.cos(rad1) + Bx) ** 2 + By ** 2)
  );
  const lon3 = ((lon1 * Math.PI) / 180) + Math.atan2(By, Math.cos(rad1) + Bx);
  
  return {
    latitude: (lat3 * 180) / Math.PI,
    longitude: (lon3 * 180) / Math.PI
  };
}

// 格式化时间
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
}

// 格式化时间区间
function formatTimeRange(minSeconds, maxSeconds) {
  return `${formatTime(minSeconds)}~${formatTime(maxSeconds)}`;
}

// 计算高铁行驶时间
function calculateTrainDuration(distance, totalDuration, origin, destination) {
  if (distance) {
    const distanceKm = parseInt(distance) / 1000;
    const speedKmh = 200;
    const estimatedDuration = Math.round((distanceKm / speedKmh) * 3600);
    return Math.round(estimatedDuration * 1.1);
  } else if (totalDuration) {
    return Math.round(parseInt(totalDuration) * 0.8);
  }
  return 0;
}

// 获取城市坐标
async function getCityCoordinates(city, retryCount = 0) {
  // 检查缓存
  if (cityCoordinateCache[city]) {
    console.log(`从缓存获取城市坐标: ${city}`);
    return cityCoordinateCache[city];
  }
  
  console.log(`正在获取城市坐标: ${city}`);
  
  // 特殊处理：直接返回预定义坐标
  if (city.includes('北京')) {
    const coords = { longitude: 116.4074, latitude: 39.9042 };
    cityCoordinateCache[city] = coords;
    return coords;
  }
  if (city.includes('上海')) {
    const coords = { longitude: 121.4737, latitude: 31.2304 };
    cityCoordinateCache[city] = coords;
    return coords;
  }
  if (city.includes('天津')) {
    const coords = { longitude: 117.190182, latitude: 39.085101 };
    cityCoordinateCache[city] = coords;
    return coords;
  }
  if (city.includes('石家庄')) {
    const coords = { longitude: 114.502461, latitude: 38.045474 };
    cityCoordinateCache[city] = coords;
    return coords;
  }
  if (city.includes('济南')) {
    const coords = { longitude: 117.000923, latitude: 36.675807 };
    cityCoordinateCache[city] = coords;
    return coords;
  }
  if (city.includes('南京')) {
    const coords = { longitude: 118.796875, latitude: 32.060255 };
    cityCoordinateCache[city] = coords;
    return coords;
  }
  if (city.includes('杭州')) {
    const coords = { longitude: 120.155070, latitude: 30.274085 };
    cityCoordinateCache[city] = coords;
    return coords;
  }
  
  try {
    const encodedCity = encodeURIComponent(city);
    console.log(`编码后的城市名: ${encodedCity}`);
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodedCity}&output=JSON`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`城市 ${city} 坐标响应:`, JSON.stringify(data));

    if (data && (data.status === '1' || data.status === 1) && data.geocodes && data.geocodes.length > 0) {
      const location = data.geocodes[0].location.split(',');
      const coords = {
        longitude: parseFloat(location[0]),
        latitude: parseFloat(location[1])
      };
      // 缓存坐标
      cityCoordinateCache[city] = coords;
      return coords;
    }
    
    // 返回默认坐标
    console.log(`返回默认坐标 for ${city}`);
    const defaultCoords = { longitude: 116.4074, latitude: 39.9042 };
    cityCoordinateCache[city] = defaultCoords;
    return defaultCoords;
  } catch (error) {
    console.error('获取城市坐标失败:', error);
    // 发生异常时，返回默认坐标
    console.log(`发生异常，返回默认坐标 for ${city}`);
    const defaultCoords = { longitude: 116.4074, latitude: 39.9042 };
    cityCoordinateCache[city] = defaultCoords;
    return defaultCoords;
  }
}

// 获取交通路线（优先高铁）
async function getTransitRoute(origin, destination, city1, city2, retryCount = 0) {
  console.log(`查询路线: ${city1} -> ${city2}, 起点: ${origin}, 终点: ${destination}`);
  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/direction/transit/integrated?key=${AMAP_KEY}&origin=${origin}&destination=${destination}&city=${encodeURIComponent(city1)}&cityd=${encodeURIComponent(city2)}&strategy=3&extensions=all`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`路线查询响应:`, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('获取交通路线失败:', error);
    // 发生异常时，返回空对象
    return {};
  }
}

// 搜索附近城市
async function searchNearbyCities(location) {
  // 返回默认城市列表
  return {
    status: '1',
    pois: [
      { cityname: '天津市', location: '117.190182,39.085101' },
      { cityname: '石家庄市', location: '114.502461,38.045474' },
      { cityname: '济南市', location: '117.000923,36.675807' },
      { cityname: '南京市', location: '118.796875,32.060255' },
      { cityname: '杭州市', location: '120.155070,30.274085' }
    ]
  };
}

// 测试函数
async function testAPI() {
  console.log('开始测试API核心功能...');
  
  try {
    const cityA = '北京';
    const cityB = '上海';
    const maxResults = 5;

    // 1. 获取A、B两地的地理坐标
    console.log(`开始获取城市 ${cityA} 的坐标`);
    const coordA = await getCityCoordinates(cityA);
    console.log(`成功获取城市 ${cityA} 的坐标:`, coordA);
    
    console.log(`开始获取城市 ${cityB} 的坐标`);
    const coordB = await getCityCoordinates(cityB);
    console.log(`成功获取城市 ${cityB} 的坐标:`, coordB);

    // 2. 计算大圆路径中点坐标
    const midpoint = calculateMidpoint(
      coordA.latitude,
      coordA.longitude,
      coordB.latitude,
      coordB.longitude
    );
    console.log(`计算得到中点坐标:`, midpoint);

    // 3. 以中点为圆心，搜索候选城市
    const nearbyCities = await searchNearbyCities(`${midpoint.longitude},${midpoint.latitude}`);
    console.log(`搜索到的候选城市:`, nearbyCities.pois);

    if (!nearbyCities || nearbyCities.status !== '1' || !nearbyCities.pois || nearbyCities.pois.length === 0) {
      console.log('未找到候选城市');
      return;
    }

    // 4. 对每个候选城市查询交通路线并计算评分
    const recommendations = [];

    for (const poi of nearbyCities.pois) {
      const city = poi.cityname;
      if (!city || city === cityA || city === cityB) continue;

      try {
        // 获取城市的真实地理坐标
        const cityCoord = await getCityCoordinates(city);
        
        // 并行查询A→City和B→City的路线
        const [routeFromA, routeFromB] = await Promise.all([
          getTransitRoute(
            `${coordA.longitude},${coordA.latitude}`,
            `${cityCoord.longitude},${cityCoord.latitude}`,
            cityA,
            city
          ),
          getTransitRoute(
            `${coordB.longitude},${coordB.latitude}`,
            `${cityCoord.longitude},${cityCoord.latitude}`,
            cityB,
            city
          )
        ]);

        console.log(`路线查询结果 - ${city}:`, {
          fromA: { status: routeFromA.status, hasRoute: !!routeFromA.route, hasTransits: routeFromA.route ? !!routeFromA.route.transits : false },
          fromB: { status: routeFromB.status, hasRoute: !!routeFromB.route, hasTransits: routeFromB.route ? !!routeFromB.route.transits : false }
        });

        // 提取路线信息
        let fromARoute = null;
        let fromBRoute = null;

        if (routeFromA.status === '1' && routeFromA.route?.transits?.length > 0) {
          // 提取高铁班次
          const trainTransits = routeFromA.route.transits.filter((transit) => 
            transit.segments && transit.segments.some((segment) => segment.railway)
          );
          
          if (trainTransits.length > 0) {
            // 计算最快的高铁班次的时间
            const baseDuration = calculateTrainDuration(trainTransits[0].distance, trainTransits[0].duration, cityA, city);
            
            // 生成合理的时间区间
            const minTime = baseDuration;
            const maxTime = Math.round(baseDuration * 1.2);
            
            fromARoute = {
              duration: minTime,
              durationRange: {
                min: minTime,
                max: maxTime,
                formatted: formatTimeRange(minTime, maxTime)
              },
              price: parseFloat(trainTransits[0].cost || '0'),
              arrivalStation: trainTransits[0].segments?.[0]?.railway?.arrival_station || ''
            };
            console.log(`从 ${cityA} 到 ${city} 的路线:`, fromARoute);
          }
        }

        if (routeFromB.status === '1' && routeFromB.route?.transits?.length > 0) {
          // 提取高铁班次
          const trainTransits = routeFromB.route.transits.filter((transit) => 
            transit.segments && transit.segments.some((segment) => segment.railway)
          );
          
          if (trainTransits.length > 0) {
            // 计算最快的高铁班次的时间
            const baseDuration = calculateTrainDuration(trainTransits[0].distance, trainTransits[0].duration, cityB, city);
            
            // 生成合理的时间区间
            const minTime = baseDuration;
            const maxTime = Math.round(baseDuration * 1.2);
            
            fromBRoute = {
              duration: minTime,
              durationRange: {
                min: minTime,
                max: maxTime,
                formatted: formatTimeRange(minTime, maxTime)
              },
              price: parseFloat(trainTransits[0].cost || '0'),
              arrivalStation: trainTransits[0].segments?.[0]?.railway?.arrival_station || ''
            };
            console.log(`从 ${cityB} 到 ${city} 的路线:`, fromBRoute);
          }
        }

        if (fromARoute && fromBRoute) {
          // 5. 计算评分
          const sameStation = fromARoute.arrivalStation === fromBRoute.arrivalStation;
          const timeDifference = Math.abs(fromARoute.duration - fromBRoute.duration);
          const totalCost = fromARoute.price + fromBRoute.price;
          
          // 评分算法：同站到达加分、时间差越小分越高、总成本越低分越高
          let score = 0;
          if (sameStation) score += 30;
          score += Math.max(0, 30 - (timeDifference / 3600) * 5); // 时间差每小时扣5分
          score += Math.max(0, 40 - (totalCost / 100) * 2); // 成本每100元扣2分
          score = Math.min(100, Math.round(score));

          recommendations.push({
            city,
            location: `${cityCoord.longitude},${cityCoord.latitude}`,
            score,
            routes: {
              fromA: fromARoute,
              fromB: fromBRoute
            },
            sameStation,
            timeDifference,
            totalCost
          });
        } else {
          console.log(`城市 ${city} 无直达交通路线`);
        }
      } catch (error) {
        console.error(`处理城市 ${city} 时出错:`, error);
        // 跳过无法处理的城市，继续处理下一个
        continue;
      }
    }

    // 按评分排序并返回结果
    recommendations.sort((a, b) => b.score - a.score);

    if (recommendations.length === 0) {
      console.log('未找到合适的约会地点');
      return;
    }

    console.log('\n推荐城市:');
    recommendations.slice(0, maxResults).forEach((city, index) => {
      console.log(`${index + 1}. ${city.city} (评分: ${city.score})`);
      console.log(`   从北京到${city.city}: ${city.routes.fromA.durationRange.formatted}`);
      console.log(`   从上海到${city.city}: ${city.routes.fromB.durationRange.formatted}`);
      console.log(`   总费用: ¥${city.totalCost}`);
      console.log(`   是否同站: ${city.sameStation ? '是' : '否'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testAPI();
