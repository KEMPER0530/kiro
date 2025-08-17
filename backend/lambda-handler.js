const serverlessExpress = require('@vendia/serverless-express');
const app = require('./src/index');

// Lambda用のハンドラー
exports.handler = serverlessExpress({
    app
});