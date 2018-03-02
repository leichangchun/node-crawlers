//引入第三方模块，superagent用于http请求，cheerio用于解析DOM
const request = require('superagent');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

//目标链接 博客园首页
let targetUrl = 'https://www.cnblogs.com/';

let content = '';
let imgs = [];

//发起请求
request.get(targetUrl)
       .end( (error,res) => {
           if(error){
               console.log(error)
               return;
           }
           let $ = cheerio.load(res.text);
           //抓取需要的数据
           $('#post_list .post_item').each( (index,element) => {
                let temp = {
                    '标题' : $(element).find('h3 a').text(),
                    '作者' : $(element).find('.post_item_foot > a').text(),
                    '阅读数' : +$(element).find('.article_view a').text().slice(3,-2),
                    '推荐数' : +$(element).find('.diggnum').text()
                }
                content += JSON.stringify(temp) + '\n';
                //图片地址
                if($(element).find('img.pfs').length > 0){
                    imgs.push($(element).find('img.pfs').attr('src'));
                }
           });
           mkdir('./content',saveContent);
           mkdir('./imgs',downloadImg);
       })
//创建目录
function mkdir(_path,callback){
    if(fs.existsSync(_path)){
        console.log(`${_path}目录已存在`)
    }else{
        fs.mkdir(_path,(error)=>{
            if(error){
                return console.log(`创建${_path}目录失败`);
            }
            console.log(`创建${_path}目录成功`)
        })
    }
    callback();
}
//将文字内容存入txt文件中
function saveContent() {
    fs.writeFile('./content/content.txt',content.toString());
}
//下载爬到的图片
function downloadImg() {
    imgs.forEach((imgUrl,index) => {  
        let imgName = imgUrl.split('/')[-1];
        let stream = fs.createWriteStream(`./imgs/${imgName}`);
        let req = request.get('http:' + imgUrl);
        req.pipe(stream);
        console.log('开始下载图片' + imgUrl);         
    } )
}