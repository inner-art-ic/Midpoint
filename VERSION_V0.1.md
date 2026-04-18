# MidPoint 项目版本记录

## V0.1 版本信息

**版本号**: V0.1
**发布日期**: 2026-04-18
**项目名称**: MidPoint - 异地约会地点推荐系统

### 功能特性

1. **城市间高铁路线查询**
   - 支持查询任意两个城市之间的高铁路线
   - 计算最优中间约会地点
   - 显示从两地出发的高铁耗时区间
   - 显示高铁票价信息

2. **评分系统**
   - 根据时间差、费用、同站到达等因素综合评分
   - 评分范围：0-100分
   - 提供评分评价描述（⭐-⭐⭐⭐⭐⭐）

3. **耗时区间显示**
   - 显示最快三个高铁班次的时间区间
   - 格式示例："1小时15分钟~1小时30分钟"
   - 包含停靠站等实际运行时间

4. **特殊路线处理**
   - 龙岩-漳州：43分钟（实际运行时间）
   - 龙岩-三明：1小时15分钟（实际运行时间）

### 技术架构

- **前端框架**: Next.js 14.2.35 + React 18
- **样式框架**: Tailwind CSS
- **地图API**: 高德地图API
- **开发语言**: TypeScript
- **端口**: 开发环境 3000/3001，生产环境 3000

### 文件结构

```
MidPoint/
├── src/
│   └── app/
│       ├── api/
│       │   └── calculate-optimal-cities/
│       │       └── route.ts          # 核心API路由
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx                   # 前端页面
├── public/
├── .env.local                         # 环境变量配置
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

### API接口

**POST** `/api/calculate-optimal-cities`

**请求参数**:
```json
{
  "cityA": "龙岩市",
  "cityB": "漳州市",
  "maxResults": 5
}
```

**响应参数**:
```json
{
  "recommendations": [
    {
      "city": "三明市",
      "location": "117.638919,26.263455",
      "score": 95,
      "routes": {
        "fromA": {
          "duration": 4500,
          "durationRange": {
            "min": 4500,
            "max": 5400,
            "formatted": "1小时15分钟~1小时30分钟"
          },
          "price": 67,
          "arrivalStation": ""
        },
        "fromB": { ... }
      },
      "sameStation": true,
      "timeDifference": 1392,
      "totalCost": 167.5
    }
  ]
}
```

### 环境配置

需要在 `.env.local` 文件中配置高德地图API密钥：
```
NEXT_PUBLIC_AMAP_KEY=你的高德地图API密钥
```

### 测试结果

1. **龙岩市-漳州市**
   - 推荐城市：三明市、泉州市、福州市
   - 评分范围：70-95分
   - 耗时区间：符合实际运行时间

2. **广州市-泉州市**
   - 推荐城市：漳州市、厦门市、三明市、福州市
   - 评分范围：70-81分
   - 耗时区间：符合实际运行时间

### 已知问题

1. 搜索附近城市时返回的数据存在编码问题（乱码），已通过使用默认城市列表解决
2. 热重载时可能出现ERR_ABORTED错误，不影响正常功能

### 上传云端建议

**推荐平台**:
1. **Vercel** (推荐)
   - 官方支持Next.js，配置简单
   - 免费额度足够个人使用
   - 自动部署，与GitHub集成

2. **Railway**
   - 支持Node.js应用
   - 提供免费额度
   - 易于部署

3. **Render**
   - 支持Next.js
   - 免费额度
   - 自动部署

**上传前准备**:
1. 确保 `.env.local` 中的API密钥已配置到环境变量中
2. 删除测试文件（test-api.js, test-guangzhou-quanzhou.js, test-core.js）
3. 添加必要的 `.gitignore` 文件
4. 配置生产环境的域名白名单（高德地图API）

### 后续优化建议

1. 添加用户登录功能
2. 实现收藏历史功能
3. 添加地图展示功能
4. 优化推荐算法
5. 添加更多交通方式（飞机、大巴等）
6. 实现实时票价查询
