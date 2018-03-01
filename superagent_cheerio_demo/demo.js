//引入第三方模块，superagent用于http请求，cheerio用于解析DOM
let request = require('superagent');
let cheerio = require('cheerio');

//目标链接 环球网
let targetUrl = 'http://www.huanqiu.com/';