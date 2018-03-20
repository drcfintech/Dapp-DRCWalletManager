const log = require("./log/log.js")
// log.saveLog();
//const express = require('express');
const serverConfig = require('./config/serverConfig.json');
const path = require('path');
const http = require('http');
// 模块：对http请求所带的数据进行解析  https://www.cnblogs.com/whiteMu/p/5986297.html
const querystring = require('querystring');
const contract = require('truffle-contract');
const Web3 = require('web3');
// 解决Error：Web3ProviderEngine does not support synchronous requests
const Promise = require('bluebird');
// 生成钱包
//const HDWalletProvider = require("truffle-hdwallet-provider");
const infura_apikey = "9rWQxDtU4uAbAWdFFSAR";
const walletConfig = require('./config/walletConfig.json');
// 签名之前构造rawTransaction用
var Tx = require('ethereumjs-tx');

// 调用服务器的方法名
const functionName = ['insertHash', 'selectHash'];

const keystore = require(walletConfig.keystore);
//console.log('keystore  ', keystore);





// 智能合约
var HashDataCon_artifacts = require('./build/contracts/HashDataCon.json');
// 合约发布地址
const contractAT = HashDataCon_artifacts.networks['4'].address;

// 合约abi
const contractABI = HashDataCon_artifacts.abi;
// 初始化合约实例
var HashDataConContract;
// 调用合约的账号
let account;


// 新建socket连接
function initWebsocketProvider() {
  // 保持infura的socket连接，需要开启全局proxy
  web3 = new Web3(new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws', {
    timeout: 500
  }));
  // 设置web3的默认账号
  // web3.eth.defaultAccount = walletConfig.account;

  // 解决Error：TypeError: Cannot read property 'kdf' of undefined
  account = web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(keystore).toLowerCase()), walletConfig.password)
  web3.eth.defaultAccount = account.address;
  //console.log(account);

  if (typeof web3.eth.getAccountsPromise === 'undefined') {
    //console.log('解决 Error: Web3ProviderEngine does not support synchronous requests.');
    Promise.promisifyAll(web3.eth, {
      suffix: 'Promise'
    });
  }
}



var App = {
  // 初始化：拿到web3提供的地址， 利用json文件生成合约··
  start: function () {

    HashDataConContract = new web3.eth.Contract(contractABI, contractAT, {});
    HashDataConContract.setProvider(web3.currentProvider);

  },

  // 往链上存数据
  insertHash: function (data) {
    let dataObject = data;



    // 上链步骤：查询没有结果之后再上链
    HashDataConContract.methods.selectHash(dataObject.data).call((error, result) => {
      console.log(' 上链前的查询结果   ', result);
      if (result && result['0'] == true) {
        dataObject.res.end("{}");
        return;
      }
      if (error) {
        dataObject.res.end();
        return;
      }

      if (!error && !result['0']) {
        // 新建空对象，作为http请求的返回值
        let inserHashResult = {};

        // 拿到rawTx里面的data部分
        let encodeData_param = web3.eth.abi.encodeParameters(['string'], [dataObject.data]);
        let encodeData_function = web3.eth.abi.encodeFunctionSignature('insertHash(string)');
        let encodeData = encodeData_function + encodeData_param.slice(2);

       
        // 获取账户余额  警告 要大于 0.001Eth
        const getBalance = () => {
            web3.eth.getBalance(web3.eth.defaultAccount, (error, result) => {
              if (error) reject(error)
              console.log('web3.eth.getBalance   ', result);
              if (web3.utils.fromWei(result, "ether") < 3){
                
                dataObject.res.end(JSON.stringify(new Error('余额不足')));
                return;
              }
            })
        }
        //getBalance();

        // 获取data部分的nonce
        const getNonce = () => {
          return new Promise((resolve, reject) => {
            web3.eth.getTransactionCount(web3.eth.defaultAccount, (error, result) => {
              if (error) reject(error);
              //console.log('getTransactionCount   ', result);

              resolve(web3.utils.toHex(result));
            })
          })
        }
        // 获取data部分的gasPrice
        const getGasPrice = () => {
          return new Promise((resolve, reject) => {
            web3.eth.getGasPrice((error, result) => {
              if (error) reject(error);
              //resolve(web3.utils.toHex(result));
              resolve(web3.utils.toHex(4000000000));
            })
          })
        }
        // 给tx签名，并且发送上链
        const sendTransaction = (rawTx) => {
          return new Promise((resolve, reject) => {
            let tx = new Tx(rawTx);

            // 解决 RangeError: private key length is invalid
            tx.sign(new Buffer(account.privateKey.slice(2), 'hex'));
            let serializedTx = tx.serialize();
            // 签好的tx发送到链上
            web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
              .on('receipt', (receipt) => {
                if (error) reject(error);
                resolve(receipt);
              });
          })
        }
        // 上链结果响应到请求方
        const returnResult = (result) => {
          let returnObject = result;
          inserHashResult.receipt = returnObject;

          //console.log('insert result : ', result);
          dataObject.res.end(JSON.stringify(inserHashResult));

        }

        Promise.all([getNonce(), getGasPrice()])
          .then(values => {
            let rawTx = {
              nonce: values[0],
              to: contractAT,
              gasPrice: values[1],
              gasLimit: web3.utils.toHex(4700000),
              data: encodeData
            };

            inserHashResult.gasPrice = values[1];
            return rawTx;
          })
          .then((rwaTx) => {
            return sendTransaction(rwaTx);
          })
          .then((result) => {
            returnResult(result);
          })
          .catch(e => console.log(e))

      }
    });

    return;
  },

  // 去链上查询结果
  selectHash: function (data) {
    let dataObject = data;

    HashDataConContract.methods.selectHash(dataObject.data).call((err, result) => {
      dataObject.res.end(JSON.stringify({
        result
      }));
    });

  }
};




/**********************************************/
/**************SERVER
/**********************************************/

var server = http.createServer(function (req, res) {　　
  // 跨域请求允许post
  res.setHeader('Access-Control-Allow-Origin', '*');　
  req.setEncoding('utf8');

  req.on('data', function (chunk) {
    // 初始化socket连接
    initWebsocketProvider();

    let result;
    // 将前台传来的值，转回对象类型
    let qs = querystring.parse(chunk);


    // 前台传来的hash值进行16进制转换
    let qshash = web3.utils.asciiToHex(qs.hash);
    //let qshash = web3.utils.hexToBytes('0x' + qs.hash);

    switch (qs.functionName) {

      // 上链方法
      case functionName[0]:
        App.insertHash({
          data: qshash,
          res: res
        });
        break;

        // 查询方法
      case functionName[1]:
        result = App.selectHash({
          data: qshash,
          res: res
        });
        break;

      default:
        console.log("前台传参functionName有错");
        res.end();
    }

  });　　
});


server.listen({
  host: serverConfig.serverHost,
  port: serverConfig.serverPort
}, function () {
  // 初始化socket连接
  initWebsocketProvider();
  // 初始化 
  App.start();
  console.log("server is listening on ", serverConfig.serverHost + ":" + serverConfig.serverPort + "\n");
});

