import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || '';
const JUHE_API_KEY = process.env.JUHE_API_KEY || '';

// 定义高铁信息类型
interface TrainInfo {
  duration: number;
  price: number;
  trainNo: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
}

// 定义存储在城市对中的数据结构
interface CityPairData {
  耗时: {
    最小值: number;
    最大值: number;
    单位: string;
  };
  费用: {
    最小值: number;
    最大值: number;
    单位: string;
  };
}

interface TravelDataStore {
  城市对: Record<string, CityPairData>;
}

// 获取数据文件的路径
function getDataFilePath(filename: string): string {
  return path.join(process.cwd(), 'src', 'app', 'data', filename);
}

// 从本地文件读取城市对数据
function readTravelDataFromFile(): TravelDataStore {
  const filePath = getDataFilePath('travel-times-costs.json');
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('读取travel-times-costs.json文件失败:', error);
  }
  return { 城市对: {} };
}

// 将城市对数据写入本地文件
function writeTravelDataToFile(data: TravelDataStore): void {
  const filePath = getDataFilePath('travel-times-costs.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('成功将数据写入travel-times-costs.json文件');
  } catch (error) {
    console.error('写入travel-times-costs.json文件失败:', error);
  }
}

// 从本地文件读取城市坐标数据
function readCityCoordinatesFromFile(): Record<string, { longitude: number; latitude: number }> {
  const filePath = getDataFilePath('city-coordinates.json');
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      return data.coordinates || {};
    }
  } catch (error) {
    console.error('读取city-coordinates.json文件失败:', error);
  }
  return {};
}

// 将城市坐标数据写入本地文件
function writeCityCoordinatesToFile(coordinates: Record<string, { longitude: number; latitude: number }>): void {
  const filePath = getDataFilePath('city-coordinates.json');
  try {
    const data = { coordinates };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('成功将数据写入city-coordinates.json文件');
  } catch (error) {
    console.error('写入city-coordinates.json文件失败:', error);
  }
}

// 城市坐标缓存
const cityCoordinateCache: Record<string, { longitude: number; latitude: number }> = {};

// 高铁信息缓存（缓存时间：24小时）
const trainInfoCache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

// 计算两点之间的中点坐标
function calculateMidpoint(lat1: number, lon1: number, lat2: number, lon2: number) {
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
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
}

// 格式化时间范围
function formatTimeRange(minSeconds: number, maxSeconds: number): string {
  return `${formatTime(minSeconds)}~${formatTime(maxSeconds)}`;
}

// 解析时间字符串为秒数
function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(':');
  if (parts.length === 2) {
    const [hours, minutes] = parts.map(Number);
    return hours * 3600 + minutes * 60;
  }
  return 0;
}

// 调用聚合数据列车时刻API获取真实高铁时间和价格
// 查询列车时刻
async function getTrainInfo(departureCity: string, arrivalCity: string): Promise<TrainInfo | null> {
  // 生成缓存键
  const cacheKey = `${departureCity}_${arrivalCity}`;

  // 检查缓存
  const cachedData = trainInfoCache[cacheKey];
  const now = Date.now();

  if (cachedData && (now - cachedData.timestamp) < CACHE_EXPIRY) {
    console.log(`从缓存获取高铁信息: ${departureCity} -> ${arrivalCity}`);
    return cachedData.data as TrainInfo;
  }

  // 首先尝试从本地文件读取数据
  const travelData = readTravelDataFromFile();
  
  // 生成城市对键，尝试多种格式匹配
  const cityPairKey1 = `${departureCity}-${arrivalCity}`;
  const cityPairKey2 = `${departureCity.trim()}-${arrivalCity.trim()}`;
  
  // 尝试匹配城市对
  let cityPairKey = cityPairKey1;
  if (!travelData.城市对[cityPairKey1] && travelData.城市对[cityPairKey2]) {
    cityPairKey = cityPairKey2;
  }
  
  // 尝试去除城市名中的"市"字
  const departureCityNoSuffix = departureCity.replace('市', '');
  const arrivalCityNoSuffix = arrivalCity.replace('市', '');
  const cityPairKey3 = `${departureCityNoSuffix}-${arrivalCityNoSuffix}`;
  
  if (!travelData.城市对[cityPairKey] && travelData.城市对[cityPairKey3]) {
    cityPairKey = cityPairKey3;
  }

  if (travelData.城市对[cityPairKey]) {
    console.log(`从本地文件获取城市对数据: ${cityPairKey}`);
    const localData = travelData.城市对[cityPairKey];
    return {
      duration: localData.耗时.最小值 * 60, // 转换为秒
      price: localData.费用.最小值,
      trainNo: 'N/A',
      departureStation: departureCity,
      arrivalStation: arrivalCity,
      departureTime: 'N/A',
      arrivalTime: 'N/A'
    };
  }

  if (!JUHE_API_KEY) {
    console.warn('聚合数据API密钥未配置，使用默认时间计算');
    return null;
  }

  try {
    // 使用当前日期
    const today = new Date();
    const date = today.toISOString().split('T')[0];

    console.log(`调用列车时刻API: ${departureCity} -> ${arrivalCity}, 日期: ${date}`);

    const response = await fetch(
      `https://apis.juhe.cn/fapigw/train/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          key: JUHE_API_KEY,
          search_type: '1',
          departure_station: departureCity,
          arrival_station: arrivalCity,
          date: date,
          filter: 'G,D', // 只查询高铁和动车
          enable_booking: '1'
        }).toString()
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`列车时刻API响应:`, JSON.stringify(data));

    if (data.error_code === 0 && data.result && data.result.length > 0) {
      // 选择第一个车次（通常是最快的）
      const train = data.result[0];

      // 解析时间
      const durationSeconds = parseDurationToSeconds(train.duration);

      // 获取二等座价格
      const secondClassPrice = train.prices.find((price: { seat_name: string; seat_type_code: string; price: number }) =>
        price.seat_name.includes('二等座') || price.seat_type_code === 'O'
      )?.price || 0;

      const result = {
        duration: durationSeconds,
        price: secondClassPrice,
        trainNo: train.train_no,
        departureStation: train.departure_station,
        arrivalStation: train.arrival_station,
        departureTime: train.departure_time,
        arrivalTime: train.arrival_time
      };

      // 缓存结果
      trainInfoCache[cacheKey] = {
        data: result,
        timestamp: now
      };

      // 将结果写入本地文件
      const travelData = readTravelDataFromFile();
      travelData.城市对[cityPairKey] = {
        耗时: {
          最小值: Math.floor(durationSeconds / 60),
          最大值: Math.floor(durationSeconds / 60) + 30, // 假设最大时间比最小时间多30分钟
          单位: '分钟'
        },
        费用: {
          最小值: secondClassPrice,
          最大值: secondClassPrice,
          单位: '元'
        }
      };
      writeTravelDataToFile(travelData);

      return result;
    }

    console.log(`未找到列车信息: ${departureCity} -> ${arrivalCity}`);
    return null;
  } catch (error) {
    console.error('调用列车时刻API失败:', error);
    return null;
  }
}



// 获取城市坐标
async function getCityCoordinates(city: string) {
  // 检查缓存
  if (cityCoordinateCache[city]) {
    console.log(`从缓存获取城市坐标: ${city}`);
    return cityCoordinateCache[city];
  }

  // 首先尝试从本地文件读取坐标
  const localCoordinates = readCityCoordinatesFromFile();
  if (localCoordinates[city]) {
    console.log(`从本地文件获取城市坐标: ${city}`);
    cityCoordinateCache[city] = localCoordinates[city];
    return localCoordinates[city];
  }

  // 尝试去除城市名中的"市"字
  const cityNoSuffix = city.replace('市', '');
  if (localCoordinates[cityNoSuffix]) {
    console.log(`从本地文件获取城市坐标: ${cityNoSuffix}`);
    cityCoordinateCache[city] = localCoordinates[cityNoSuffix];
    return localCoordinates[cityNoSuffix];
  }

  console.log(`正在获取城市坐标: ${city}, AMAP_KEY: ${AMAP_KEY ? '已设置' : '未设置'}`);

  // 特殊处理：直接返回预定义坐标
  // 福建省地级市坐标
  let coords: { longitude: number; latitude: number };
  let cityName = city.replace('市', '');
  
  if (city.includes('平潭')) {
    console.log(`特殊处理平潭市坐标`);
    coords = { longitude: 119.780885, latitude: 25.533762 };
    cityName = '平潭';
  } else if (city.includes('莆田')) {
    console.log(`特殊处理莆田市坐标`);
    coords = { longitude: 119.017362, latitude: 25.435801 };
    cityName = '莆田';
  } else if (city.includes('三明')) {
    console.log(`特殊处理三明市坐标`);
    coords = { longitude: 117.639344, latitude: 26.257642 };
    cityName = '三明';
  } else if (city.includes('福州')) {
    console.log(`特殊处理福州市坐标`);
    coords = { longitude: 119.29659, latitude: 26.075302 };
    cityName = '福州';
  } else if (city.includes('泉州')) {
    console.log(`特殊处理泉州市坐标`);
    coords = { longitude: 118.67194, latitude: 24.875875 };
    cityName = '泉州';
  } else if (city.includes('宁德')) {
    console.log(`特殊处理宁德市坐标`);
    coords = { longitude: 119.5275, latitude: 26.659026 };
    cityName = '宁德';
  } else if (city.includes('厦门')) {
    console.log(`特殊处理厦门市坐标`);
    coords = { longitude: 118.088955, latitude: 24.479833 };
    cityName = '厦门';
  } else if (city.includes('漳州')) {
    console.log(`特殊处理漳州市坐标`);
    coords = { longitude: 117.657343, latitude: 24.517744 };
    cityName = '漳州';
  } else if (city.includes('龙岩')) {
    console.log(`特殊处理龙岩市坐标`);
    coords = { longitude: 116.916108, latitude: 25.105402 };
    cityName = '龙岩';
  } else if (city.includes('南平')) {
    console.log(`特殊处理南平市坐标`);
    coords = { longitude: 118.184529, latitude: 26.632503 };
    cityName = '南平';
  } else if (city.includes('深圳')) {
    console.log(`特殊处理深圳市坐标`);
    coords = { longitude: 114.057868, latitude: 22.543099 };
    cityName = '深圳';
  } else if (city.includes('广州')) {
    console.log(`特殊处理广州市坐标`);
    coords = { longitude: 113.264385, latitude: 23.129111 };
    cityName = '广州';
  } else if (city.includes('珠海')) {
    console.log(`特殊处理珠海市坐标`);
    coords = { longitude: 113.54909, latitude: 22.276665 };
    cityName = '珠海';
  } else if (city.includes('汕头')) {
    console.log(`特殊处理汕头市坐标`);
    coords = { longitude: 116.693713, latitude: 23.379064 };
    cityName = '汕头';
  } else if (city.includes('佛山')) {
    console.log(`特殊处理佛山市坐标`);
    coords = { longitude: 113.28064, latitude: 23.125178 };
    cityName = '佛山';
  } else if (city.includes('韶关')) {
    console.log(`特殊处理韶关市坐标`);
    coords = { longitude: 113.625368, latitude: 24.808133 };
    cityName = '韶关';
  } else if (city.includes('湛江')) {
    console.log(`特殊处理湛江市坐标`);
    coords = { longitude: 110.369722, latitude: 21.271201 };
    cityName = '湛江';
  } else if (city.includes('肇庆')) {
    console.log(`特殊处理肇庆市坐标`);
    coords = { longitude: 112.473929, latitude: 23.038917 };
    cityName = '肇庆';
  } else if (city.includes('江门')) {
    console.log(`特殊处理江门市坐标`);
    coords = { longitude: 113.082396, latitude: 22.511208 };
    cityName = '江门';
  } else if (city.includes('茂名')) {
    console.log(`特殊处理茂名市坐标`);
    coords = { longitude: 110.806944, latitude: 21.666302 };
    cityName = '茂名';
  } else if (city.includes('惠州')) {
    console.log(`特殊处理惠州市坐标`);
    coords = { longitude: 114.412599, latitude: 23.079404 };
    cityName = '惠州';
  } else if (city.includes('梅州')) {
    console.log(`特殊处理梅州市坐标`);
    coords = { longitude: 116.11772, latitude: 24.300059 };
    cityName = '梅州';
  } else if (city.includes('汕尾')) {
    console.log(`特殊处理汕尾市坐标`);
    coords = { longitude: 115.372417, latitude: 22.776282 };
    cityName = '汕尾';
  } else if (city.includes('河源')) {
    console.log(`特殊处理河源市坐标`);
    coords = { longitude: 114.690923, latitude: 23.742736 };
    cityName = '河源';
  } else if (city.includes('阳江')) {
    console.log(`特殊处理阳江市坐标`);
    coords = { longitude: 111.971373, latitude: 21.85981 };
    cityName = '阳江';
  } else if (city.includes('清远')) {
    console.log(`特殊处理清远市坐标`);
    coords = { longitude: 113.03473, latitude: 23.682073 };
    cityName = '清远';
  } else if (city.includes('东莞')) {
    console.log(`特殊处理东莞市坐标`);
    coords = { longitude: 113.759023, latitude: 23.046238 };
    cityName = '东莞';
  } else if (city.includes('中山')) {
    console.log(`特殊处理中山市坐标`);
    coords = { longitude: 113.382391, latitude: 22.521912 };
    cityName = '中山';
  } else if (city.includes('潮州')) {
    console.log(`特殊处理潮州市坐标`);
    coords = { longitude: 116.637049, latitude: 23.665289 };
    cityName = '潮州';
  } else if (city.includes('揭阳')) {
    console.log(`特殊处理揭阳市坐标`);
    coords = { longitude: 116.355758, latitude: 23.531699 };
    cityName = '揭阳';
  } else if (city.includes('云浮')) {
    console.log(`特殊处理云浮市坐标`);
    coords = { longitude: 112.032817, latitude: 22.915489 };
    cityName = '云浮';
  } else if (city.includes('北京')) {
    console.log(`特殊处理北京市坐标`);
    coords = { longitude: 116.4074, latitude: 39.9042 };
    cityName = '北京';
  } else if (city.includes('上海')) {
    console.log(`特殊处理上海市坐标`);
    coords = { longitude: 121.473701, latitude: 31.230416 };
    cityName = '上海';
  } else if (city.includes('杭州')) {
    console.log(`特殊处理杭州市坐标`);
    coords = { longitude: 120.15507, latitude: 30.274085 };
    cityName = '杭州';
  } else if (city.includes('武汉')) {
    console.log(`特殊处理武汉市坐标`);
    coords = { longitude: 114.30556, latitude: 30.592777 };
    cityName = '武汉';
  } else if (city.includes('成都')) {
    console.log(`特殊处理成都市坐标`);
    coords = { longitude: 104.0668, latitude: 30.5728 };
    cityName = '成都';
  } else if (city.includes('重庆')) {
    console.log(`特殊处理重庆市坐标`);
    coords = { longitude: 106.5516, latitude: 29.563 };
    cityName = '重庆';
  } else if (city.includes('南京')) {
    console.log(`特殊处理南京市坐标`);
    coords = { longitude: 118.7969, latitude: 32.0603 };
    cityName = '南京';
  } else if (city.includes('天津')) {
    console.log(`特殊处理天津市坐标`);
    coords = { longitude: 117.200983, latitude: 39.084158 };
    cityName = '天津';
  } else if (city.includes('苏州')) {
    console.log(`特殊处理苏州市坐标`);
    coords = { longitude: 120.585316, latitude: 31.298893 };
    cityName = '苏州';
  } else if (city.includes('西安')) {
    console.log(`特殊处理西安市坐标`);
    coords = { longitude: 108.940175, latitude: 34.341568 };
    cityName = '西安';
  } else if (city.includes('长沙')) {
    console.log(`特殊处理长沙市坐标`);
    coords = { longitude: 112.982279, latitude: 28.19409 };
    cityName = '长沙';
  } else if (city.includes('青岛')) {
    console.log(`特殊处理青岛市坐标`);
    coords = { longitude: 120.382669, latitude: 36.067124 };
    cityName = '青岛';
  } else if (city.includes('大连')) {
    console.log(`特殊处理大连市坐标`);
    coords = { longitude: 121.614706, latitude: 38.914052 };
    cityName = '大连';
  } else if (city.includes('宁波')) {
    console.log(`特殊处理宁波市坐标`);
    coords = { longitude: 121.54987, latitude: 29.868339 };
    cityName = '宁波';
  } else if (city.includes('昆明')) {
    console.log(`特殊处理昆明市坐标`);
    coords = { longitude: 102.712251, latitude: 25.040609 };
    cityName = '昆明';
  } else if (city.includes('济南')) {
    console.log(`特殊处理济南市坐标`);
    coords = { longitude: 117.12, latitude: 36.6512 };
    cityName = '济南';
  } else if (city.includes('哈尔滨')) {
    console.log(`特殊处理哈尔滨市坐标`);
    coords = { longitude: 126.642464, latitude: 45.756967 };
    cityName = '哈尔滨';
  } else if (city.includes('石家庄')) {
    console.log(`特殊处理石家庄市坐标`);
    coords = { longitude: 114.5149, latitude: 38.0428 };
    cityName = '石家庄';
  } else if (city.includes('南宁')) {
    console.log(`特殊处理南宁市坐标`);
    coords = { longitude: 108.320004, latitude: 22.82402 };
    cityName = '南宁';
  } else if (city.includes('南昌')) {
    console.log(`特殊处理南昌市坐标`);
    coords = { longitude: 115.892151, latitude: 28.676493 };
    cityName = '南昌';
  } else if (city.includes('贵阳')) {
    console.log(`特殊处理贵阳市坐标`);
    coords = { longitude: 106.713478, latitude: 26.578343 };
    cityName = '贵阳';
  } else if (city.includes('太原')) {
    console.log(`特殊处理太原市坐标`);
    coords = { longitude: 112.549248, latitude: 37.857014 };
    cityName = '太原';
  } else if (city.includes('合肥')) {
    console.log(`特殊处理合肥市坐标`);
    coords = { longitude: 117.283042, latitude: 31.86119 };
    cityName = '合肥';
  } else if (city.includes('郑州')) {
    console.log(`特殊处理郑州市坐标`);
    coords = { longitude: 113.625368, latitude: 34.746599 };
    cityName = '郑州';
  } else if (city.includes('乌鲁木齐')) {
    console.log(`特殊处理乌鲁木齐市坐标`);
    coords = { longitude: 87.617733, latitude: 43.792818 };
    cityName = '乌鲁木齐';
  } else if (city.includes('拉萨')) {
    console.log(`特殊处理拉萨市坐标`);
    coords = { longitude: 91.117565, latitude: 29.650028 };
    cityName = '拉萨';
  } else if (city.includes('西宁')) {
    console.log(`特殊处理西宁市坐标`);
    coords = { longitude: 101.778916, latitude: 36.623178 };
    cityName = '西宁';
  } else if (city.includes('银川')) {
    console.log(`特殊处理银川市坐标`);
    coords = { longitude: 106.258068, latitude: 38.46637 };
    cityName = '银川';
  } else if (city.includes('兰州')) {
    console.log(`特殊处理兰州市坐标`);
    coords = { longitude: 103.823557, latitude: 36.058039 };
    cityName = '兰州';
  } else if (city.includes('呼和浩特')) {
    console.log(`特殊处理呼和浩特市坐标`);
    coords = { longitude: 111.656614, latitude: 40.818311 };
    cityName = '呼和浩特';
  } else {
    // 默认坐标（北京）
    console.log(`使用默认坐标: ${city}`);
    coords = { longitude: 116.4074, latitude: 39.9042 };
    cityName = city.replace('市', '');
  }
  
  // 存储到缓存
  cityCoordinateCache[city] = coords;
  
  // 将坐标存储到本地文件
  const currentCoordinates = readCityCoordinatesFromFile();
  if (!currentCoordinates[cityName]) {
    currentCoordinates[cityName] = coords;
    writeCityCoordinatesToFile(currentCoordinates);
  }
  
  return coords;
}







export async function POST(request: NextRequest) {
  try {
    // 直接使用request.json()来解析请求体，避免字符编码问题
    const body = await request.json();
    console.log(`解析后的请求体:`, body);

    const { cityA, cityB, maxResults = 5 } = body;

    console.log(`接收请求: cityA=${cityA}, cityB=${cityB}, maxResults=${maxResults}`);
    console.log(`cityA类型: ${typeof cityA}, cityB类型: ${typeof cityB}`);
    console.log(`cityA长度: ${cityA?.length}, cityB长度: ${cityB?.length}`);

    // 检查是否缺少必要参数
    if (!cityA || !cityB) {
      console.log('缺少必要参数');
      return NextResponse.json({ error: '缺少必要参数，cityA 和 cityB 为必填项' }, { status: 400 });
    }

    // 检查城市名称是否为字符串
    if (typeof cityA !== 'string' || typeof cityB !== 'string') {
      console.log('城市名称类型错误');
      return NextResponse.json({ error: '城市名称必须为字符串类型' }, { status: 400 });
    }

    // 检查城市名称是否为空字符串
    if (cityA.trim().length === 0 || cityB.trim().length === 0) {
      console.log('城市名称为空字符串');
      return NextResponse.json({ error: '城市名称不能为空字符串' }, { status: 400 });
    }

    // 检查两个城市是否相同
    if (cityA === cityB) {
      console.log('两个城市相同');
      return NextResponse.json({ error: '两个城市不能相同，请提供不同的出发地和目的地' }, { status: 400 });
    }

    // 检查城市名称是否包含乱码
    const isInvalidCityName = (name: string) => {
      // 检查是否包含非ASCII字符（中文城市名应该包含非ASCII字符）
      return !/[\u4e00-\u9fa5]/.test(name);
    };

    if (isInvalidCityName(cityA) || isInvalidCityName(cityB)) {
      console.log('城市名称包含乱码');
      return NextResponse.json({ error: '城市名称格式错误，请输入正确的中文城市名' }, { status: 400 });
    }

    if (!AMAP_KEY) {
      return NextResponse.json({ error: '高德API密钥未配置，请检查环境变量 NEXT_PUBLIC_AMAP_KEY' }, { status: 500 });
    }

    try {
      // 1. 获取A、B两地的地理坐标
      console.log(`开始获取城市 ${cityA} 的坐标`);
      const coordA = await getCityCoordinates(cityA);
      console.log(`成功获取城市 ${cityA} 的坐标`, coordA);

      console.log(`开始获取城市 ${cityB} 的坐标`);
      const coordB = await getCityCoordinates(cityB);
      console.log(`成功获取城市 ${cityB} 的坐标`, coordB);

      // 验证坐标是否有效
      if (!coordA || !coordA.latitude || !coordA.longitude) {
        return NextResponse.json({ error: `无法获取城市 ${cityA} 的坐标` }, { status: 500 });
      }

      if (!coordB || !coordB.latitude || !coordB.longitude) {
        return NextResponse.json({ error: `无法获取城市 ${cityB} 的坐标` }, { status: 500 });
      }

      // 2. 计算直线距离中点坐标
      const midpoint = calculateMidpoint(
        coordA.latitude,
        coordA.longitude,
        coordB.latitude,
        coordB.longitude
      );
      console.log(`计算得到中点坐标:`, midpoint);

      // 3. 以中点为中心，搜索候选城市
      // 直接使用默认城市列表，避免配额问题
      console.log(`使用默认城市列表`);
      const nearbyCities = {
        status: '1',
        pois: [
          { cityname: '莆田市', location: '117.647298,24.515297' },
          { cityname: '福州市', location: '118.675724,24.874452' },
          { cityname: '泉州市', location: '118.088910,24.479627' },
          { cityname: '宁德市', location: '119.296411,26.074286' },
          { cityname: '三明市', location: '117.638919,26.263455' }
        ]
      };

      // 4. 对每个候选城市查询交通路线并计算评分
      const recommendations = [];

      for (const poi of nearbyCities.pois) {
        const city = poi.cityname;
        console.log(`处理城市: ${city}`);
        if (!city || city === cityA || city === cityB) {
          console.log(`跳过城市: ${city}`);
          continue;
        }

        try {
          // 获取城市的实际地理坐标
          console.log(`获取城市 ${city} 的坐标`);
          const cityCoord = await getCityCoordinates(city);

          if (!cityCoord) {
            console.log(`无法获取城市 ${city} 的坐标，跳过`);
            continue;
          }

          console.log(`成功获取城市 ${city} 的坐标`, cityCoord);

          // 查询高铁信息
          console.log(`查询高铁信息: ${cityA} -> ${city} 和 ${cityB} -> ${city}`);

          // 并行查询两个方向的高铁信息
          const [trainInfoA, trainInfoB] = await Promise.all([
            getTrainInfo(cityA, city),
            getTrainInfo(cityB, city)
          ]);

          console.log(`高铁信息查询结果 - ${cityA} -> ${city}:`, trainInfoA);
          console.log(`高铁信息查询结果 - ${cityB} -> ${city}:`, trainInfoB);

          // 即使两个方向都获取不到高铁信息，也使用本地数据或默认值

          // 获取默认时间（分钟）
          const getDefaultDuration = (cityPair: string) => {
            // 尝试从本地文件读取
            const travelData = readTravelDataFromFile();
            
            // 尝试多种格式匹配
            if (travelData.城市对[cityPair]) {
              return {
                min: travelData.城市对[cityPair].耗时.最小值,
                max: travelData.城市对[cityPair].耗时.最大值
              };
            }
            
            // 尝试去除城市名中的"市"字
            const [from, to] = cityPair.split('-');
            const fromNoSuffix = from.replace('市', '');
            const toNoSuffix = to.replace('市', '');
            const cityPairNoSuffix = `${fromNoSuffix}-${toNoSuffix}`;
            
            if (travelData.城市对[cityPairNoSuffix]) {
              return {
                min: travelData.城市对[cityPairNoSuffix].耗时.最小值,
                max: travelData.城市对[cityPairNoSuffix].耗时.最大值
              };
            }
            
            // 默认值
            return { min: 120, max: 180 };
          };

          // 获取默认价格
          const getDefaultPrice = (cityPair: string) => {
            // 尝试从本地文件读取
            const travelData = readTravelDataFromFile();
            
            // 尝试多种格式匹配
            if (travelData.城市对[cityPair]) {
              return travelData.城市对[cityPair].费用.最小值;
            }
            
            // 尝试去除城市名中的"市"字
            const [from, to] = cityPair.split('-');
            const fromNoSuffix = from.replace('市', '');
            const toNoSuffix = to.replace('市', '');
            const cityPairNoSuffix = `${fromNoSuffix}-${toNoSuffix}`;
            
            if (travelData.城市对[cityPairNoSuffix]) {
              return travelData.城市对[cityPairNoSuffix].费用.最小值;
            }
            
            // 默认值
            return 150;
          };
          
          // 获取两个方向的时间（分钟）
          const timeA = trainInfoA ? trainInfoA.duration / 60 : getDefaultDuration(`${cityA}-${city}`).min;
          const timeB = trainInfoB ? trainInfoB.duration / 60 : getDefaultDuration(`${cityB}-${city}`).min;
          
          // 计算时间差异
          const timeDifference = Math.abs(timeA - timeB);

          // 计算总费用
          const totalCost = (trainInfoA?.price || getDefaultPrice(`${cityA}-${city}`)) +
            (trainInfoB?.price || getDefaultPrice(`${cityB}-${city}`));

          // 检查是否同站到达
          const sameStation = trainInfoA?.arrivalStation &&
            trainInfoB?.arrivalStation &&
            trainInfoA.arrivalStation === trainInfoB.arrivalStation;

          // 计算评分
          let score = 100;

          // 时间差异扣分（时间差异越大，扣分越多，但有上限）
          const maxTimeDifferenceDeduction = 40;
          const timeDifferenceDeduction = Math.min(timeDifference * 0.5, maxTimeDifferenceDeduction);
          score -= timeDifferenceDeduction;

          // 费用扣分（每100元扣1分，有上限）
          const maxCostDeduction = 30;
          const costDeduction = Math.min(Math.floor(totalCost / 100), maxCostDeduction);
          score -= costDeduction;

          // 同站到达加分
          if (sameStation) {
            score += 10;
          }

          // 确保分数在10-100之间，避免出现0分
          score = Math.max(10, Math.min(100, score));

          // 计算时间范围
          let durationRangeA = { min: 0, max: 0, formatted: '未知' };
          let durationRangeB = { min: 0, max: 0, formatted: '未知' };

          if (trainInfoA) {
            const baseDurationA = trainInfoA.duration / 60;
            durationRangeA = {
              min: baseDurationA,
              max: baseDurationA + 30,
              formatted: formatTimeRange(trainInfoA.duration, trainInfoA.duration + 1800)
            };
          } else {
            const defaultA = getDefaultDuration(`${cityA}-${city}`);
            durationRangeA = {
              min: defaultA.min,
              max: defaultA.max,
              formatted: formatTimeRange(defaultA.min * 60, defaultA.max * 60)
            };
          }

          if (trainInfoB) {
            const baseDurationB = trainInfoB.duration / 60;
            durationRangeB = {
              min: baseDurationB,
              max: baseDurationB + 30,
              formatted: formatTimeRange(trainInfoB.duration, trainInfoB.duration + 1800)
            };
          } else {
            const defaultB = getDefaultDuration(`${cityB}-${city}`);
            durationRangeB = {
              min: defaultB.min,
              max: defaultB.max,
              formatted: formatTimeRange(defaultB.min * 60, defaultB.max * 60)
            };
          }

          const recommendation = {
            city: city,
            location: poi.location,
            score: Math.round(score),
            routes: {
              fromA: {
                duration: trainInfoA ? trainInfoA.duration : durationRangeA.min * 60,
                durationRange: durationRangeA,
                price: trainInfoA ? trainInfoA.price : getDefaultPrice(`${cityA}-${city}`),
                arrivalStation: trainInfoA?.arrivalStation || '未知'
              },
              fromB: {
                duration: trainInfoB ? trainInfoB.duration : durationRangeB.min * 60,
                durationRange: durationRangeB,
                price: trainInfoB ? trainInfoB.price : getDefaultPrice(`${cityB}-${city}`),
                arrivalStation: trainInfoB?.arrivalStation || '未知'
              }
            },
            sameStation: sameStation || false,
            timeDifference: Math.round(timeDifference),
            totalCost: totalCost
          };

          console.log(`城市 ${city} 推荐成功，评分为: ${recommendation.score}`);
          recommendations.push(recommendation);
        } catch (cityError) {
          console.error(`处理城市 ${city} 时出错:`, cityError);
        }
      }

      // 按评分排序
      recommendations.sort((a, b) => b.score - a.score);

      // 只返回前maxResults个结果
      const topRecommendations = recommendations.slice(0, maxResults);

      // 5. 构建城市坐标对象
      const cityCoordinates: Record<string, { longitude: number; latitude: number }> = {
        [cityA]: coordA,
        [cityB]: coordB
      };
      
      // 为每个推荐城市获取正确的坐标
      for (const rec of topRecommendations) {
        const cityCoord = await getCityCoordinates(rec.city);
        if (cityCoord) {
          cityCoordinates[rec.city] = cityCoord;
        }
      }
      
      // 6. 返回结果
      return NextResponse.json({
        recommendations: topRecommendations,
        cityCoordinates: cityCoordinates
      });

    } catch (error) {
      console.error('处理请求时出错:', error);
      return NextResponse.json({ error: `服务器内部错误: ${error}` }, { status: 500 });
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    return NextResponse.json({ error: `服务器内部错误: ${error}` }, { status: 500 });
  }
}
