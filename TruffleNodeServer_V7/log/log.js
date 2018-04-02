/*
 *生成日期对应的log文件名
 *往文件 serverLog_日期.log 里面写日志
 */
const fs = require("fs");
const timer = require("../timer.js");
const serverConfig = require('../config/serverConfig.json');

// 根据当日log截止时间，生成日期对应的log文件名
// 如果超过了截止之间，日期加1,生成的log放到新的log文件
const getServerLogFileName = () => {
    var date = new Date();
    if (date.getHours() >= serverConfig.endTime) {
        return "serverLog_" + new Date(date.setDate(date.getDate() + 1)).toISOString().slice(0, 10).replace(/-/g, "") + ".log";
    } else {
        return "serverLog_" + date.toISOString().slice(0, 10).replace(/-/g, "") + ".log";
    }
}
// 往文件 serverLog_日期.log 里面写日志·
const saveLog = (operation, date, hash, gasPrice, gasUsed, result) => {
    let jsonString = JSON.stringify({
        operation: operation,
        date: date,
        hash: hash.slice(0, 64),
        gasPrice: gasPrice + " Gwei",
        gasUsed: gasUsed,
        result: result
    }) + '\n';

    let stream = fs.createWriteStream(__dirname + "/" + getServerLogFileName(), {
        flags: 'a'
    });

    stream.write(jsonString);
    stream.end();
    console.log("Done saved log to => ", __dirname + "/" + getServerLogFileName());
}

module.exports = {
    getServerLogFileName: getServerLogFileName,
    saveLog: saveLog
}