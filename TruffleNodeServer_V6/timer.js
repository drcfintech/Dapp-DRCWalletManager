/*
 *定时更新服务器配置文件serverConfig的serverLogFileName字段
 *定时发送邮件
 */

const cronJob = require("cron").CronJob;
const fs = require('fs');
const serverConfigFilePath = "./config/serverConfig.json";
const serverConfig = require(serverConfigFilePath);

module.exports = {
    TimerSetServerLogFileName: () => {

        // 定时更新服务器配置文件serverConfig的serverLogFileName字段
        let job = new cronJob({
            //cronTime: "01 00 00 * * *",
            cronTime: "* * * * * *",
            onTick: function () {
                /*
                 * 每天的23:59:59
                 * 更新服务器配置文件serverConfig的serverLogFileName字段
                 */
                fs.readFile(serverConfigFilePath, "utf8", function (err, data) {
                    if (err) console.log(err);
                    // 更新serverConfig里的log文件名
                    let dataObject = JSON.parse(data);
                    // dataObject.serverLogFileName = "serverLog_" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
                    dataObject.serverLogFileName = "serverLog_" + new Date().getSeconds() + ".log";

                    fs.writeFileSync(serverConfigFilePath, JSON.stringify(dataObject));

                });
                const log = require("./log/log.js");
                log.saveLog("operation:test", new Date().toLocaleDateString(), "hash", "result");

            },
            start: false,
            timeZone: "Asia/Shanghai"
        });
        job.start();
    },

    //定时发送邮件
    TimerSendMail: () => {
        const nodemailer = require("nodemailer");
        //const smtpTransport = require("nodemailer-smtp-transport");
        // 同步的方式读取配置文件
        const serverConfig = fs.readFileSync('./config/serverConfig.json', 'utf-8');
        const fileName = JSON.parse(serverConfig).serverLogFileName;
        // 邮件内容
        const mailBody = fs.readFileSync("./log/" + fileName, 'utf-8');


        // SMTP 连接
        let transport = nodemailer.createTransport({
            // 主机
            host: "smtp.163.com",
            // 是否使用 SSL
            secureConnection: true, // use SSL
            port: 465, // port for secure SMTP
            auth: {
                // 账号
                user: "*****@163.com",
                pass: "*****"
            }
        });

        // 设置邮件
        let mailOptions = {
            // 发件人地址，例如 1234<1234@163.com>
            from: 'zhongshaobo<****@163.com>',
            // 收件人地址，可以使用逗号隔开添加多个
            // '***@qq.com, ***@163.com'
            to: '****@163.com',
            // 标题
            subject: '定时邮件发送',
            // 邮件内容
            html: '<strong style="color: red">data from log : ' + fileName + '</strong><br>' +
                '<p>' + mailBody + '</p>'
        };

        let job = new cronJob({
            //cronTime: "55 59 23 * * *",
            cronTime: "30 * * * * *",
            onTick: () => {
                /*
                 * 每天的23:59:55
                 * 更新服务器配置文件serverConfig的serverLogFileName字段
                 */
                transport.sendMail(mailOptions, (error, response) => {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Mail Send Ok')
                    }
                    // 关闭连接
                    transport.close();
                })
            },
            start: false,
            timeZone: "Asia/Shanghai"
        });
        job.start();
    }
}