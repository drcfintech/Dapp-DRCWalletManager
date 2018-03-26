/*
 * 往文件 serverLog_日期.log 里面写日志
 */
const fs = require('fs');

module.exports = {
    saveLog: (operation, date, hash, result) => {
        let jsonString = JSON.stringify({
            operation: operation,
            date: date,
            hash: hash,
            result: result
        }) + '\n';
        // 同步的方式读取配置文件
        const serverConfig = fs.readFileSync('./config/serverConfig.json', 'utf-8');
        const fileName = "./log/" + JSON.parse(fs.readFileSync('./config/serverConfig.json', 'utf-8')).serverLogFileName;

        fs.appendFile("./log/" + JSON.parse(fs.readFileSync('./config/serverConfig.json', 'utf-8')).serverLogFileName, jsonString, function (err, file) {
            if (err) {
                console.log(err);
                return;
            }
        });
    }
}