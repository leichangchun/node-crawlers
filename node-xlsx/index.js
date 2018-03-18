//导入依赖  request用于http请求，xlsx用于解析和构建excel表格 ， fs用于文件管理
const  request = require('superagent');  
const  xlsx = require('node-xlsx');
const  fs = require('fs');

//基础配置
const baseUrl = 'https://lbs.gtimg.com/maplbs/qianxi/';
let types = [0,1];  // 0/1  => 迁入/迁出
let traffic = ['汽车','火车','飞机'];
let tempSheetDate = [];
let tempDate = [];
let trafficSheetDate = [];
let trafficDate = [];
let y = 0; //全局索引

// 指定时间范围  符合格式 YYYY-MM-DD,最新一天的为00000000
let datelist = ['00000000', ...getTimeList('2018-03-09','2018-03-15','')];

// 指定需要分析交通方式的城市code
let trafficCode = 310000;

//从city.xlsx中解析城市名和城市代码
const citySheet = xlsx.parse(`${__dirname}/city.xlsx`);  
let cityNameList = [];
let cityCodeList = [];
citySheet[0].data.slice(1).map( (value) => {
    cityNameList.push(value[0]);
    cityCodeList.push(value[1]);
})

//迁入、迁出分别遍历
types.map( type => {
    //遍历请求数据
    cityCodeList.map((code,code_index) => {
        let x = 0; //统计请求完成的数量
        tempSheetDate[code_index * 2 + type] = [];
        tempSheetDate[code_index * 2 + type].push([cityNameList[code_index]]) //每张表的表头,先不填日期，免得错位
        //交通方式数据分析
        if(code === trafficCode){
            traffic.map( (tra,tra_index) => {
                trafficSheetDate[traffic.length * type + tra_index] = [];
                trafficSheetDate[traffic.length * type + tra_index].push([cityNameList[code_index]]);
            })
        }
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
                            //写入对应的城市
                            let isHas = tempSheetDate[code_index * 2 + type].find((city) => {

                                if( city[0] === value[0]){
                                    extendArray(city,tempSheetDate[code_index * 2 + type][0].length -1, ' ');
                                    city.push(value[1])
                                    return true;
                                }
                                return false;
                            });
                            //如果城市不存在，新建一行
                            if(!isHas){
                                let tempRow = [value[0]];
                                extendArray(tempRow,tempSheetDate[code_index * 2 + type][0].length - 1, ' ');
                                tempRow.push(value[1])
                                tempSheetDate[code_index * 2 + type].push(tempRow)
                            }
                        });
                    }

                    //交通方式数据分析
                    if(code === trafficCode){
                        traffic.map( (tra,tra_index) => {
                            trafficSheetDate[traffic.length * type + tra_index][0].push(date);
                            if(trafficSheetDate[traffic.length * type + tra_index].length === 1){
                                real.map((value) => {
                                    trafficSheetDate[traffic.length * type + tra_index].push([value[0],value[tra_index + 2]])
                                })
                            }else{
                                real.map( (value) => {
                                    //写入对应的城市
                                    let isHas = trafficSheetDate[traffic.length * type + tra_index].find((city) => {

                                        if( city[0] === value[0]){
                                            extendArray(city,trafficSheetDate[traffic.length * type + tra_index][0].length -1, ' ');
                                            city.push(value[tra_index + 2])
                                            return true;
                                        }
                                        return false;
                                    });
                                    //如果城市不存在，新建一行
                                    if(!isHas){
                                        let tempRow = [value[0]];
                                        extendArray(tempRow,trafficSheetDate[traffic.length * type + tra_index][0].length - 1, ' ');
                                        tempRow.push(value[tra_index + 2])
                                        trafficSheetDate[traffic.length * type + tra_index].push(tempRow)
                                    }
                                })
                            }
                        })
                    }
                    x++;
                })
        })
        //一个单表的所有数据爬玩才能写入buffer中
        let singleSheet =  setInterval( () => {
            if(x === datelist.length){
                console.log(`*** ${cityNameList[code_index]} 获取 ${type === 0 ?'迁入' : '迁出'} 数据完成***`);
                tempDate[code_index * 2 + type] = {
                    name : `${cityNameList[code_index]}（${type === 0 ?'目的地' : '来源地'}）`,
                    data : tempSheetDate[code_index * 2 + type]
                }
                traffic.map( (tra,tra_index) => {
                    trafficDate[traffic.length * type + tra_index] = {
                        name: type === 0 ? `某地-${cityNameList[cityCodeList.indexOf(trafficCode)]}（来源地）（${traffic[tra_index]}）` : `${cityNameList[cityCodeList.indexOf(trafficCode)]} - 某地（来源地）（${traffic[tra_index]}）`,
                        data: trafficSheetDate[traffic.length * type + tra_index]
                    }
                })
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
        writeExcel(`腾讯迁徙爬取_交通方式`,trafficDate);
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
//获取指定的时间范围
function getTimeList(start = '2018-01-01',end = '2018-01-02',spliter = '-'){
    let res = [];
    let st = start.split('-');
    let et = end.split('-');
    let startTime = new Date(st[0],st[1] - 1, st[2]).getTime();
    let endTime = new Date(et[0],et[1] -1, et[2]).getTime();
    
    for( let i = startTime ; i <= endTime ; ){
        res.push(formatTime(i,''));
        i += 24 * 60 * 60 * 1000;
    }
    return res.reverse();
}

function formatTime(time,spliter = '-'){
    let date = new Date(time);
    let year = date.getFullYear();
    let month = (date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : '0' +  (date.getMonth() + 1);
    let day = date.getDate() >= 10 ? date.getDate() : '0' + date.getDate();
    return `${year}${spliter}${month}${spliter}${day}`
}
