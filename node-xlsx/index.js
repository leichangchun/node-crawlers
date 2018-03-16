//导入依赖  request用于http请求，xlsx用于解析和构建excel表格 ， fs用于文件管理
const  request = require('superagent');  
const  xlsx = require('node-xlsx');
const  fs = require('fs');

//基础配置
const baseUrl = 'https://lbs.gtimg.com/maplbs/qianxi/';
let types = [0,1];  // 0/1  => 迁入/迁出
let tempSheetDate = [];
let tempDate = [];
let y = 0; //全局索引

//从city.xlsx中解析城市名和城市代码
const citySheet = xlsx.parse(`${__dirname}/city.xlsx`);  
let cityNameList = [];
let cityCodeList = [];
citySheet[0].data.slice(1).map( (value) => {
    cityNameList.push(value[0]);
    cityCodeList.push(value[1]);
})
// Todo : date数据后续需自动生成
let datelist = ['00000000','20180314','20180313']
//迁入、迁出分别遍历
types.map( type => {
    //遍历请求数据
    cityCodeList.map((code,code_index) => {
        let x = 0; //统计请求完成的数量
        tempSheetDate[code_index * 2 + type] = [];
        tempSheetDate[code_index * 2 + type].push([cityNameList[code_index]]) //每张表的表头,先不填日期，免得错位
        datelist.map( (date, col) => {
            request.get(`https://lbs.gtimg.com/maplbs/qianxi/${date}/${code}${type}6.js`).retry(3).buffer(true)
                .end( (error,res) => {
                    if(error) {
                        console.log('request error !')
                        return;
                    }  
                    let real = parseRes(res.text);
                    tempSheetDate[code_index * 2 + type][0].push(date);
                    if(tempSheetDate[code_index * 2 + type].length === 1){
                        real.map((value) => {
                            tempSheetDate[code_index * 2 + type].push([value[0],value[1]])
                        })
                    }else{
                        real.map((value) => {

                            let isHas = tempSheetDate[code_index * 2 + type].find((city) => {

                                if( city[0] === value[0]){
                                    extendArray(city,tempSheetDate[code_index * 2 + type][0].length -1, ' ');
                                    city.push(value[1])
                                    return true;
                                }
                                return false;
                            });

                            if(!isHas){
                                let tempRow = [value[0]];
                                extendArray(tempRow,tempSheetDate[code_index * 2 + type][0].length -1, ' ');
                                tempRow.push(value[1])
                                tempSheetDate[code_index * 2 + type].push(tempRow)
                            }
                        });
                    }
                    x++;
                })
        })
        let singleSheet =  setInterval( () => {
            if(x === datelist.length){
                console.log(`*** ${cityNameList[code_index]} 获取 ${type === 0 ?'迁入' : '迁出'} 数据完成***`);
                tempDate[code_index * 2 + type] = {
                    name : `${cityNameList[code_index]}（${type === 0 ?'目的地' : '来源地'}）`,
                    data : tempSheetDate[code_index * 2 + type]
                }
                y++;
                clearInterval(singleSheet);
            }
        },1000)
    })
})
//生成表单
let sheet = setInterval( () => {
    if( y === cityCodeList.length * 2){
        writeExcel(`腾讯迁徙爬取`,tempDate);
        clearInterval(sheet);
    }
},1000);
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
//填充数组到指定长度
function extendArray (array,length,value = " "){
    while(array.length < length) {
        array.push(value);
    }
}