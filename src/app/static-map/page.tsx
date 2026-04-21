'use client';

export default function StaticMap() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">静态地图可视化</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">城市位置与路线</h2>
          <div className="flex justify-center">
            <div className="relative w-[700px] h-[450px] border border-gray-300 rounded-lg bg-gradient-to-b from-blue-50 to-gray-100">
              {/* 海岸线 */}
              <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 700 450">
                {/* 海岸线 */}
                <path d="M100,380 L200,360 L300,340 L400,320 L500,300 L550,280 L600,260 L650,240" stroke="#1890ff" strokeWidth="2" fill="none" />
                
                {/* 省份边界 */}
                <path d="M100,100 L200,80 L300,100 L400,80 L500,100 L600,120 L650,150 L650,240 L600,260 L550,280 L500,300 L400,320 L300,340 L200,360 L100,380 L50,300 L80,200 L100,100" stroke="#d9d9d9" strokeWidth="1" fill="none" />
                
                {/* 城市标记 */}
                {/* 深圳 */}
                <circle cx="150" cy="350" r="8" fill="#1890ff" stroke="#000" strokeWidth="1" />
                <text x="162" y="354" fontSize="14" fill="#000">深圳</text>
                
                {/* 龙岩 */}
                <circle cx="350" cy="200" r="8" fill="#1890ff" stroke="#000" strokeWidth="1" />
                <text x="362" y="204" fontSize="14" fill="#000">龙岩</text>
                
                {/* 莆田 */}
                <circle cx="550" cy="150" r="8" fill="#52c41a" stroke="#000" strokeWidth="1" />
                <text x="562" y="154" fontSize="14" fill="#000">莆田</text>
                
                {/* 箭头（深圳到莆田） */}
                <path d="M150,350 L550,150" stroke="#ff4d4f" strokeWidth="3" fill="none" />
                <path d="M550,150 L535,140 L535,160 Z" fill="#ff4d4f" />
                
                {/* 箭头（龙岩到莆田） */}
                <path d="M350,200 L550,150" stroke="#ff4d4f" strokeWidth="3" fill="none" />
                <path d="M550,150 L535,140 L535,160 Z" fill="#ff4d4f" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">图例</h2>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>出发城市（深圳、龙岩）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>推荐城市（莆田）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500"></div>
              <span>路线</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <div className="flex gap-4">
            <a
              href="/map-test"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              查看动态地图
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
