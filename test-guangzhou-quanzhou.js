const https = require('https');
const http = require('http');

// 测试广州到泉州的路线
const postData = JSON.stringify({
  cityA: '广州市',
  cityB: '泉州市',
  maxResults: 5
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/calculate-optimal-cities',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  let rawData = '';
  res.on('data', (chunk) => {
    rawData += chunk;
  });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      console.log('响应数据:', JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.error('解析响应失败:', e);
      console.log('原始响应:', rawData);
    }
  });
});

req.on('error', (e) => {
  console.error(`请求失败: ${e.message}`);
});

// 写入数据到请求体
req.write(postData);
req.end();
