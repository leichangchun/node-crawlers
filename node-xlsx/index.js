//导入依赖  request用于http请求，xlsx用于解析和构建excel表格 ， fs用于文件管理
const  request = require('superagent');  
const  xlsx = require('node-xlsx');
const  fs = require('fs');

//基础配置
const baseUrl = 'https://lbs.gtimg.com/maplbs/qianxi/';
let type = 0;  // 0/1  => 迁入/迁出
let tempSheetDate = [];
let tempDate = [];

//从city.xlsx中解析城市名和城市代码
const citySheet = xlsx.parse(`${__dirname}/city.xlsx`);  
let cityNameList = [];
let cityCodeList = [];
citySheet[0].data.slice(1).map( (value) => {
    cityNameList.push(value[0]);
    cityCodeList.push(value[1]);
})
//date数据后续需自动生成
let datelist = ['00000000','20180314','20180313']

//遍历请求数据
cityCodeList.map( (code,code_index) => {
    datelist.map( (date, col ) => {
        getData(date,code,type,cityNameList[code_index],col)
    })
})

setTimeout( () => {
    console.log(tempSheetDate);
},10000)
/* date格式 20180101
 当天为00000000 ， 
   code为城市编码， 
   type为迁入(0)或迁出(1) ， 
   cityName为城市名（生成文件名使用）,
   col + 2 为当前写入数据的列 */
function getData(date,code,type,cityName,col) {
    tempSheetDate.push([cityName]) //每张表的表头,先不填日期，免得错位
    request.get(`https://lbs.gtimg.com/maplbs/qianxi/${date}/${code}${type}6.js`).retry(3).buffer(true)
            .end( (error,res) => {
                if(error) {
                    console.log('request error !')
                    return;
                }  
                let real = parseRes(res.text);
                tempSheetDate[0].push(date);
                if(tempSheetDate.length === 1){
                    real.map((value) => {
                        tempSheetDate.push([value[0],[value[1]]])
                    })
                }else{
                    real.map((value) => {

                        let isHas = tempSheetDate.find((city) => {

                            if( city[0] === value[0]){
                                extendArray(city,col + 1, ' ');
                                city.push(value[1])
                                return true;
                            }
                            return false;
                        });

                        if(!isHas){
                            let tempRow = [value[0]];
                            extendArray(tempRow,col + 1, ' ');
                            tempRow.push(value[1])
                            tempSheetDate.push(tempRow)
                        }
                    });
                }
            })
}
/* resText为字符串格式响应，将会返回解析后的数组 */
function parseRes (resText) {
    let res = []
    resText.slice(28,-3).replace(/\],\[/g,'!').replace(/(\[|\])/g,'').split('!').map( (value,index) => {
        res.push(value.split(',').map( value => { return value.replace(/"/g,'')}));
    })
    return res;
}
/* name是生成的文件名  data为excel数据 */
function writeExcel (name,data) {
    let buffer = xlsx.build(data);
    fs.writeFile(`./${name}.xlsx`, buffer, (error) => {
        if(error) throw error;
        console.log(`${name}.xlsx 生成完成`);
    })
}

function extendArray (array,length,value = " "){
    while(array.length < length) {
        array.push(value);
    }
}