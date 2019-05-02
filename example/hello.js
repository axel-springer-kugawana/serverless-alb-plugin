module.exports.handler = async () => ({
  isBase64Encoded: false,
  statusCode: 200,
  statusDescription: '200 OK',
  headers: {
    'Set-cookie': 'cookies',
    'Content-Type': 'application/json'
  },
  body: 'Hello from Lambda'
});
