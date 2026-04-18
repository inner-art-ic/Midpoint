'use client';

import { useState } from 'react';

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
}

export default function Home() {
  const [cityA, setCityA] = useState('深圳');
  const [cityB, setCityB] = useState('龙岩');
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!cityA || !cityB) {
      setError('请输入两个城市名称');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

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
        setResults(data.recommendations || []);
      }
    } catch {
      setError('请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">推荐约会地点</h2>
            {results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
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
        )}
      </div>
    </main>
  );
}