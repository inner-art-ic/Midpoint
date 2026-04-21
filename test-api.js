const https = require('https');
const http = require('http');

const data = JSON.stringify({
  cityA: '深圳',
  cityB: '龙岩',
  maxResults: 5
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/calculate-optimal-cities',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  res.on('end', () => {
    console.log(`响应体: ${responseBody}`);
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

// 写入数据到请求体
req.write(data);
req.end();