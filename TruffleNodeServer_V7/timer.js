/*
 *定时发送邮件
 */

const cronJob = require("cron").CronJob;
const fs = require('fs');
const readline = require('readline');
const nodemailer = require("nodemailer");
const mailConfig = require("./config/mailConfig.json");

// 生成邮件的内容
let getMailOptions = () => {
    return new Promise((resolve, reject) => {
        // 返回今日要发送的的log文件名
        console.log("__dirname=>  ", __dirname);
        let serverLogFileName = __dirname + "/log/serverLog_" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + ".log";

        fs.access(serverLogFileName, fs.constants.R_OK, (error) => {
            if (error) {
                // 不存在该log文件的情况
                fs.appendFileSync(serverLogFileName, "");
            };
            let rl = readline.createInterface({
                input: fs.createReadStream(serverLogFileName),
                terminal: false
            });
            // 记录失败记录的条数
            let failedCount = 0;
            // 拼接邮件的表单部分：表头
            let htmlStr = '<p>Log文件：' + serverLogFileName + '<p><br>' +
                '<table border="1"><th>日期</th><th>Hash</th><th>原因</th>';

            rl.on('line', (line) => {
                var lineObj = JSON.parse(line);
                // 拼接邮件的表单部分：行列
                if (lineObj.result.status == "failed") {
                    htmlStr = htmlStr +
                        "<tr>" +
                        "<td>" + lineObj.date + "</td>" +
                        "<td>" + lineObj.hash + "</td>" +
                        "<td>" + lineObj.result.msg + "</td>" +
                        "</tr>";
                    failedCount++;
                }
            });
            rl.on('close', () => {
                // 表格描述
                let emailTitle = '<strong style="color: red">失败记录 : ' + failedCount + '条</strong><br>'

                resolve({
                    // 标题
                    subject: (failedCount > 0 ? "Failure:上链记录" : "Success:上链记录"),
                    // 邮件内容
                    html: emailTitle + htmlStr + "</table>"
                });
            });

        });
    })
}

//定时发送邮件
const TimerSendMail = () => {
    // SMTP 连接
    let transport = nodemailer.createTransport({
        // 主机
        host: mailConfig.transport.host,
        // use SSL
        secureConnection: true,
        // port for secure SMTP
        port: mailConfig.transport.port,
        auth: {
            // 账号
            user: mailConfig.auth.user,
            pass: mailConfig.auth.pass
        }
    });

    let job = new cronJob({
        cronTime: mailConfig.cronTime,
        onTick: () => {
            Promise.all([getMailOptions()])
                .then((mailOptions) => {
                    transport.sendMail({
                        // 发件人地址
                        from: mailConfig.options.from,
                        // 收件人地址，可以使用逗号隔开添加多个
                        to: mailConfig.options.to,
                        // 标题
                        subject: mailOptions[0].subject,
                        // 邮件内容
                        html: mailOptions[0].html
                    }, (error, response) => {
                        if (error) {
                            console.error(error);
                        } else {
                            console.log('Mail Send Ok');
                        }
                        // 关闭连接
                        transport.close();
                    })
                }).catch((error) => {
                    console.log("error when log file");
                    return;
                });
        },
        start: false,
        timeZone: mailConfig.timeZone
    })
    job.start();
}

module.exports = {
    TimerSendMail: TimerSendMail
}