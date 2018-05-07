const validation = require("./validation.js");
const log = require("./log/log.js");
const timer = require("./timer.js");
const responceData = require("./responceData.js")
// log.saveLog();
const app = require('express')();
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
const walletConfig = require('./config/walletConfig.json');
// 签名之前构造rawTransaction用
var Tx = require('ethereumjs-tx');

const keystore = require(walletConfig.keystore);
//console.log('keystore  ', keystore);
// 用户操作
const operation = ["getDepositAddr", "createDepositAddr", "withdraw", "withdrawTo", "freezeToken"];


// 智能合约
const DRCWalletMgr_artifacts = require('./build/contracts/DRCWalletManager.json');
// 合约发布地址
const contractAT = DRCWalletMgr_artifacts.networks['4'].address;

// 合约abi
const contractABI = DRCWalletMgr_artifacts.abi;
// 初始化合约实例
let DRCWalletMgrContract;
// 调用合约的账号
let account;

// Token智能合约
const DRCToken_artifacts = require('./build/contracts/DRCToken.json');
// Token合约发布地址
const DRCToken_contractAT = DRCToken_artifacts.networks['4'].address;

// Token合约abi
const DRCToken_contractABI = DRCToken_artifacts.abi;
// 初始化Token合约实例
let DRCTokenContract;


// Add headers
app.use((req, res, next) => {

  req.setEncoding('utf8');
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', false);

  // Pass to next layer of middleware
  next();
});


// 新建initWeb3Provider连接
function initWeb3Provider() {

  if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
  } else {
    web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/" + walletConfig.infuraAPIkey));
  }

  // 解决Error：TypeError: Cannot read property 'kdf' of undefined
  account = web3.eth.accounts.decrypt(JSON.parse(JSON.stringify(keystore).toLowerCase()), walletConfig.password)
  web3.eth.defaultAccount = account.address;
  console.log('web3.eth.defaultAccount : ', web3.eth.defaultAccount);

  if (typeof web3.eth.getAccountsPromise === 'undefined') {
    //console.log('解决 Error: Web3ProviderEngine does not support synchronous requests.');
    Promise.promisifyAll(web3.eth, {
      suffix: 'Promise'
    });
  }
}

var Actions = {
  // 初始化：拿到web3提供的地址， 利用json文件生成合约··
  start: function () {
    DRCWalletMgrContract = new web3.eth.Contract(contractABI, contractAT, {});
    DRCTokenContract = new web3.eth.Contract(DRCToken_contractABI, DRCToken_contractAT, {});
    DRCWalletMgrContract.setProvider(web3.currentProvider);
    DRCTokenContract.setProvider(web3.currentProvider);
  },

  // 往链上存数据
  createDepositAddr: function (data) {
    let dataObject = data;

    // first check address is valid
    if (!web3.utils.isAddress(dataObject.data)) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.addressError));
      // 保存log
      log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
      return;
    }

    // 上链步骤：查询没有结果之后再上链
    DRCWalletMgrContract.methods.getDepositAddress(dataObject.data).call((error, result) => {
      if (error) {
        // 以太坊虚拟机的异常
        dataObject.res.end(JSON.stringify(responceData.evmError));
        // 保存log
        log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
        return;
      }

      console.log(' 充值地址查询结果   \n', result);
      console.log(' 充值地址详细查询结果   \n', result['0']);
      // 返回值显示已经有该hash的记录
      var resultValue = web3.utils.hexToNumberString(result);
      console.log(resultValue);
      if (resultValue != "0") {
        let returnObject = {};
        returnObject = responceData.createDepositAddrSuccess;
        returnObject.txHash = 0;
        returnObject.gasPrice = 0;
        returnObject.gasUsed = 0;
        returnObject.depositAddr = result;
        dataObject.res.end(JSON.stringify(returnObject));
        // 保存log
        log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.depositAlreadyExist);

        return;
      }

      if (resultValue == "0") {
        // 新建空对象，作为http请求的返回值
        let returnObject = {};
        let gasPrice;

        // 拿到rawTx里面的data部分
        console.log(dataObject.data);
        let encodeData_param = web3.eth.abi.encodeParameters(['address'], [dataObject.data]);
        let encodeData_function = web3.eth.abi.encodeFunctionSignature('createDepositContract(address)');
        console.log(encodeData_function);
        let encodeData = encodeData_function + encodeData_param.slice(2);
        console.log(encodeData);


        // 获取账户余额  警告 要大于 0.001Eth
        const getBalance = (callback) => {
          web3.eth.getBalance(web3.eth.defaultAccount, (error, balance) => {
            if (error) {
              dataObject.res.end(JSON.stringify(responceData.evmError));
              // 保存log
              log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
              return;
            }
            console.log('balance =>', balance);
            if (balance && web3.utils.fromWei(balance, "ether") < 0.001) {
              // 返回failed 附带message
              dataObject.res.end(JSON.stringify(responceData.lowBalance));
              // 保存log
              log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.lowBalance);
              return;
            }
            callback();
          });
        }

        // 获取data部分的nonce
        const getNonce = () => {
          return new Promise((resolve, reject) => {
            web3.eth.getTransactionCount(web3.eth.defaultAccount, (error, result) => {
              if (error) reject(error);
              resolve(web3.utils.toHex(result));
            });
          });
        }
        // 获取data部分的gasPrice
        const getGasPrice = () => {
          return new Promise((resolve, reject) => {
            web3.eth.getGasPrice((error, result) => {
              if (error) reject(error);
              //resolve(web3.utils.toHex(result));
              gasPrice = web3.utils.fromWei(result, "gwei");
              console.log('gasPrice  ', gasPrice + 'gwei');
              if (gasPrice > 2.5) {
                result = 4000000000;
              } else {
                resolve(web3.utils.toHex(result * 1.5));
              }
            });
          });
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
              console.log(receipt);
              resolve(receipt);
            })
            .on('confirmation', (confirmationNumber, receipt) => {
            });
          });
        }

        // 上链结果响应到请求方
        const returnResult = (result) => {
          returnObject = responceData.createDepositAddrSuccess;
          returnObject.txHash = result.transactionHash;
          returnObject.gasUsed = result.gasUsed;
          returnObject.gasPrice = gasPrice;

          logObject = result.logs[0];
          console.log(logObject);
          
          returnObject.depositAddr = web3.utils.numberToHex(web3.utils.hexToNumberString(logObject.data));
          // 返回success 附带message
          dataObject.res.end(JSON.stringify(returnObject));
          // 重置
          returnObject = {};
          // 保存log
          log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, gasPrice, result.gasUsed, responceData.createDepositAddrSuccess);
        }

        getBalance(() => {
          Promise.all([getNonce(), getGasPrice()])
            .then(values => {
              let rawTx = {
                nonce: values[0],
                to: contractAT,
                gasPrice: values[1],
                gasLimit: web3.utils.toHex(5900000),
                data: encodeData
              };
              return rawTx;
            })
            .then((rwaTx) => {
              return sendTransaction(rwaTx);
            })
            .then((result) => {
              returnResult(result);
            })
            .catch(e => {
              if (e) {
                console.log('evm error', e);
                dataObject.res.end(JSON.stringify(responceData.evmError));
                // 重置
                returnObject = {};
                // 保存log
                log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, gasPrice, 0, responceData.evmError);
                return;
              }
            })
        });
      }
    });

    return;
  },

  // 去链上查询结果
  getDepositAddr: function (data) {
    let dataObject = data;

    if (!web3.utils.isAddress(dataObject.data)) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.addressError));
      // 保存log
      log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
      return;
    }

    DRCWalletMgrContract.methods.getDepositAddress(dataObject.data).call((err, result) => {
      var resultValue = web3.utils.hexToNumberString(result);
      if (err || resultValue == "0") {
        console.log(err);
        // 返回failed 附带message
        dataObject.res.end(JSON.stringify(responceData.getDepositAddrFailed));
        // 保存log
        // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, responceData.getDepositAddrFailed);
        return;
      }
      let returnObject = responceData.getDepositAddrSuccess;
      returnObject.data = result;
      // 返回success 附带message
      dataObject.res.end(JSON.stringify(returnObject));
      // 重置
      returnObject = {};
      // 保存log
      // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);
    });
  },

  getDepositInfo: function (data) {
    let dataObject = data;

    if (!web3.utils.isAddress(dataObject.data)) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.addressError));
      // 保存log
      log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
      return;
    }

    DRCWalletMgrContract.methods.getDepositInfo(dataObject.data).call((err, result) => {
      if (err) {
        // 返回failed 附带message
        dataObject.res.end(JSON.stringify(responceData.getDepositInfoFailed));
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashFailed);
        return;
      }

      let returnObject = responceData.getDepositInfoSuccess;
      returnObject.balance = result["0"];
      returnObject.frozenAmount = result["1"];
      // 返回success 附带message
      dataObject.res.end(JSON.stringify(returnObject));
      // 重置
      returnObject = {};
      // 保存log
      // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);
    });
  },

  getDepositTxs: function (data) {
    let dataObject = data;
    if (dataObject.data.length == 0) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.dataError));
      // 保存log
      log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.dataError);
      return;
    }

    let addresses = dataObject.data.split(",");
    console.log(addresses);
    console.log(addresses[0]);

    for (var i = 0; i < addresses.length; i++) {
      if (!web3.utils.isAddress(addresses[i])) {
        // 返回failed 附带message
        dataObject.res.end(JSON.stringify(responceData.addressError));
        // 保存log
        log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
        return;
      }
    }
    
    // console.log(addresses[1]);
    console.log(addresses.length);

    const totalConfirmNumber = 24;
    web3.eth.getBlockNumber()
    .then((result) => {
      let currentBlock = result;
      console.log(currentBlock);
      return currentBlock;
    })
    .then((currentBlock) => {
      let blockHigh = currentBlock;
      DRCTokenContract.getPastEvents('Transfer', {
        filter: {to: addresses}, // Using an array means OR: e.g. 20 or 23
        fromBlock: currentBlock - totalConfirmNumber,
        toBlock: "latest"
      }, (err, events) => {
        if (err) {
          // 返回failed 附带message
          dataObject.res.end(JSON.stringify(responceData.evmError));
          // 保存log
          // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashFailed);
          return;
        }
        console.log(events);
      })
      .then((events) => {
        let returnObject = responceData.getDepositTxSuccess;
        returnObject.records = new Array(events.length); 

      //   var getReturnObject = () => {
      //     return new Promise((resolve, reject) => {
      //       console.log(totalConfirmNumber);
      //       console.log(blockHigh);   
      //       console.log(events[i].blockNubmber);
      //       console.log(blockHigh - events[i].blockNubmber);
      //       console.log(totalConfirmNumber - (blockHigh - events[i].blockNubmber));
      //       blockConfirm = totalConfirmNumber - (blockHigh - events[i].blockNubmber);
      //       let record = {
      //         from: events[i].returnValues.from,
      //         to: events[i].returnValues.to,
      //         value: events[i].returnValues.value,
      //         blockNumber: events[i].blockNumber,
      //         blockConfirmNum: blockConfirm,
      //         txHash: events[i].transactionHash
      //       };

      //       var gasPrice;
      //       // const getGasPrice = () => {
      //       //   return new Promise((resolve, reject) => {
      //           web3.eth.getTransaction(events[i].transactionHash, (error, result) => {
      //             if (error) reject(error);

      //             gasPrice = web3.utils.fromWei(result.gasPrice, "gwei");
      //             record.gasPrice = web3.utils.fromWei(result.gasPrice, "gwei");
      //             console.log('gasPrice  ', result.gasPrice + 'gwei');
      //             // resolve(result.gasPrice);
      //           })
      //           .then((result) => {
      //             web3.eth.getTransactionReceipt(events[i].transactionHash, (error, result) => {
      //               if (error) reject(error);
  
      //               record.gasUsed = result.gasUsed;
      //               console.log('gasUsed  ', result.gasUsed);
      //               // resolve(result.gasUsed);
      //             });
      //           });
      //       //   });
      //       // }

      //       // const getGasUsed = () => {
      //       //   return new Promise((resolve, reject) => {
               
      //       //   });
      //       // }

      //       // Promise.all([getGasPrice(), getGasUsed()])
      //       // .then(values => {
      //       //   record.gasPrice = values[0];
      //       //   record.gasUsed = values[1];
      //       // })
      //       // .then(() => {
      //       //   console.log(record);
      //       //   // returnObject.records[i] = returnOneObject;
      //       // })
      //       // .catch(e => {
      //       //   if (e) {
      //       //     console.log('evm error', e);
      //       //     dataObject.res.end(JSON.stringify(responceData.evmError));
      //       //     // 重置
      //       //     returnObject = {};
      //       //     // 保存log
      //       //     log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, gasPrice, 0, responceData.evmError);
      //       //     return;
      //       //   }
      //       // });

      //       resolve();
      //     });
      //   });

      //   Promise.all(promises)
      //   .then(() => {
      //     // 返回success 附带message
      //     console.log(returnObject);
      //     dataObject.res.end(JSON.stringify(returnObject));
      //     // 重置
      //     returnObject = {};
      //     // 保存log
      //     // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);
      //   })
      //   .catch(e => {
      //     if (e) {
      //       console.log('evm error', e);
      //       dataObject.res.end(JSON.stringify(responceData.evmError));
      //       // 重置
      //       returnObject = {};
      //       // 保存log
      //       log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, gasPrice, 0, responceData.evmError);
      //       return;
      //     }
      //   });
      // });

        for (var i = 0; i < events.length; i++) {
          // var returnOneObject = returnObject.records[i];
          // returnOneObject = {from: events[i].returnValues.from};          
          // returnOneObject.to = events[i].returnValues.to;
          // returnOneObject.value = events[i].returnValues.value;
          // returnOneObject.blockNumber = events[i].blockNumber;  
          returnObject.records[i] = {from: events[i].returnValues.from};
          returnObject.records[i].to = events[i].returnValues.to;
          returnObject.records[i].value = events[i].returnValues.value;
          returnObject.records[i].blockNumber = events[i].blockNumber;
          console.log(totalConfirmNumber);
          console.log(blockHigh);   
          console.log(events[i].blockNubmber);
          console.log(returnObject.records[i].blockNumber);
          console.log(blockHigh - events[i].blockNubmber);
          console.log(totalConfirmNumber - (blockHigh - returnObject.records[i].blockNumber));
          // returnOneObject.blockConfirmNum = totalConfirmNumber - (blockHigh - events[i].blockNubmber);
          // returnOneObject.txHash = events[i].transactionHash;
          returnObject.records[i].blockConfirmNum = totalConfirmNumber - (blockHigh - returnObject.records[i].blockNumber);
          returnObject.records[i].txHash = events[i].transactionHash;
        }
        console.log(returnObject);
        dataObject.res.end(JSON.stringify(returnObject));
        // 重置
        returnObject = {};
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);

          // web3.eth.getTransaction(events[i].transactionHash)
          // .then((result) => {
          //   returnOneObject.gasPrice = web3.utils.fromWei(result.gasPrice, "gwei");
          //   console.log('gasPrice  ', returnOneObject.gasPrice + 'gwei');
          //   return result.hash;
          // })
          // .then((txHash) => {
          //   web3.eth.getTransactionReceipt(txHash)
          //   .then((result) => {
          //     returnOneObject.gasUsed = result.gasUsed;
          //     console.log('gasUsed  ', returnOneObject.gasUsed);
          //   });
          // });

        

        // for (var i = 0; i < events.length; i++) {
        //   var returnOneObject = returnObject.records[i];
        //   Promise.all([getGasPrice(returnOneObject.txHash), getGasUsed(returnOneObject.txHash)])
        //   .then(values => {
        //     returnOneObject.gasPrice = values[0];
        //     returnOneObject.gasUsed = values[1];
        //   })
        //   .then(() => {
        //     console.log(returnOneObject);
        //     // returnObject.records[i] = returnOneObject;
        //   })
        //   .catch(e => {
        //     if (e) {
        //       console.log('evm error', e);
        //       dataObject.res.end(JSON.stringify(responceData.evmError));
        //       // 重置
        //       returnObject = {};
        //       // 保存log
        //       log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, gasPrice, 0, responceData.evmError);
        //       return;
        //     }
        //   });
        // }         

          // web3.eth.getTransaction(events[i].transactionHash, (result) => {
          //   returnObject.records[i].gasPrice = web3.utils.fromWei(result.gasPrice, "gwei");
          // });
          // web3.eth.getTransactionReceipt(events[i].transactionHash, (result) => {
          //   returnObject.records[i].gasUsed = result.gasUsed;
          // }); 
        
      //   return returnObject;
      // })
      // .then((returnObject) => {
      //   // 返回success 附带message
      //   console.log(returnObject);
      //   dataObject.res.end(JSON.stringify(returnObject));
      //   // 重置
      //   returnObject = {};
      //   // 保存log
      //   // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);
      });
    });
  },

  getDepositTxsDetail: function (data) {
    let dataObject = data;

    // let queryData = dataObject.data.split(",");
    let queryData = Array.from(JSON.stringify(dataObject.data));
    console.log(queryData);
    console.log(queryData.length);
    console.log(queryData[0]);
    if (queryData.length == 0) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.dataError));
      // 保存log
      log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.dataError);
      return;
    }

    

    let returnObject = responceData.getDepositTxDetailSuccess;
    returnObject.records = new Array(queryData.length);

    const getGasPrice = (txHash) => {
      return new Promise((resolve, reject) => {
        web3.eth.getTransaction(txHash, (error, result) => {
          if (error) reject(error);

          console.log('gasPrice  ', result.gasPrice + 'gwei');
          resolve(result.gasPrice);
        });
      });
    }    

    const getGasUsed = (txHash) => {
      return new Promise((resolve, reject) => {
        web3.eth.getTransactionReceipt(txHash, (error, result) => {
          if (error) reject(error);

          // returnOneObject.gasUsed = result.gasUsed;
          console.log('gasUsed  ', result.gasUsed);
          resolve(result.gasUsed);
        });
      });
    }

    const getTxTimestamp = (block) => {
      return new Promise((reject, error) => {
        web3.eth.getBlock(block, (err, res) => {
          if (err) reject(err);

          console.log('timestamp  ', res.timestamp);
          resolve(res.timestamp);
        });
      });
    }

    const getGasPriceUsed = async (returnOneObject, queryObj) => {
      returnOneObject.gasPrice = await getGasPrice(queryObj.txHash);
      returnOneObject.gasUsed = await getGasUsed(queryObj.txHash);
      returnOneObject.timestamp = await getTxTimestamp(queryObj.blockNumber);
      console.log(returnOneObject.gasPrice);
      console.log(returnOneObject.gasUsed);
      console.log(returnOneObject.timestamp);
    }

    var promises = returnObject.records.map((record, ind) => {      
      return getGasPriceUsed(record, queryData[ind]);
    });

    Promise.all(promises)
    .then(values => {
      // 返回success 附带message
      console.log(returnObject);
      dataObject.res.end(JSON.stringify(returnObject));
      // 重置
      returnObject = {};
      // 保存log
      // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);
    })
    .catch(e => {
      if (e) {
        console.log('evm error', e);
        dataObject.res.end(JSON.stringify(responceData.evmError));
        // 重置
        returnObject = {};
        // 保存log
        log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
        return;
      }
    });
  },

  withdraw: function (data) {
    let dataObject = data;
    let requestObject = dataObject.data;

    if (!web3.utils.isAddress(requestObject.depositAddress)) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.addressError));
      // 保存log
      log.saveLog(operation[2], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
      return;
    }

    // 上链步骤：查询没有结果之后再上链
    DRCWalletMgrContract.methods.getDepositInfo(requestObject.depositAddress).call((error, result) => {
      if (error) {
        // 以太坊虚拟机的异常
        dataObject.res.end(JSON.stringify(responceData.evmError));
        // 保存log
        log.saveLog(operation[2], new Date().toLocaleString(), qs.depositAddress, 0, 0, responceData.evmError);
        return;
      }

      console.log(' 充值地址余额查询结果   \n', result['0']);
      console.log(' 充值地址冻结查询结果   \n', result['1']);
      // 返回值显示已经有该hash的记录      
      if (result['0'] < requestObject.value || (result['0'] - result['1']) < requestObject.value) {
        dataObject.res.end(JSON.stringify(responceData.notEnoughBalance));
        // 保存log
        log.saveLog(operation[2], new Date().toLocaleString(), qs.withdrawAddress, 0, 0, responceData.notEnoughBalance);

        return;
      }

      if ((result['0'] - result['1']) >= requestObject.value) {
        // 新建空对象，作为http请求的返回值
        let returnObject = {};
        let gasPrice;

        // 拿到rawTx里面的data部分
        console.log(requestObject);
        let depositTime = new Date().getUTCMilliseconds() + 60 * 1000; // add 1 more minute
        let encodeData_params = web3.eth.abi.encodeParameters(['address', 'uint256', 'uint256'], [requestObject.withdrawAddress, depositTime, requestObject.value]);
        let encodeData_function = web3.eth.abi.encodeFunctionSignature('withdraw(address, uint256, uint256)');
        console.log(encodeData_function);
        let encodeData = encodeData_function + encodeData_params.slice(2);
        console.log(encodeData);


        // 获取账户余额  警告 要大于 0.001Eth
        const getBalance = (callback) => {
          web3.eth.getBalance(web3.eth.defaultAccount, (error, balance) => {
            if (error) {
              dataObject.res.end(JSON.stringify(responceData.evmError));
              // 保存log
              log.saveLog(operation[2], new Date().toLocaleString(), qs.depositAddress, 0, 0, responceData.evmError);
              return;
            }
            console.log('balance =>', balance);
            if (balance && web3.utils.fromWei(balance, "ether") < 0.001) {
              // 返回failed 附带message
              dataObject.res.end(JSON.stringify(responceData.lowBalance));
              // 保存log
              log.saveLog(operation[2], new Date().toLocaleString(), qs.depositAddress, 0, 0, responceData.lowBalance);
              return;
            }
            callback();
          });
        }

        // 获取data部分的nonce
        const getNonce = () => {
          return new Promise((resolve, reject) => {
            web3.eth.getTransactionCount(web3.eth.defaultAccount, (error, result) => {
              if (error) reject(error);
              resolve(web3.utils.toHex(result));
            });
          });
        }

        // 获取data部分的gasPrice
        const getGasPrice = () => {
          return new Promise((resolve, reject) => {
            web3.eth.getGasPrice((error, result) => {
              if (error) reject(error);
              //resolve(web3.utils.toHex(result));
              gasPrice = web3.utils.fromWei(result, "gwei");
              console.log('gasPrice  ', gasPrice + 'gwei');
              if (gasPrice > 4) result = gasPrice;
              else result *= 1.25;
              resolve(web3.utils.toHex(result));
            });
          });
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
            .on('transactionHash', (hash) => {
              console.log(hash);
              // resolve(hash);
            })
            .on('receipt', (receipt) => {
              console.log(receipt);
              resolve(receipt);
            })
            .on('confirmation', (confirmationNumber, receipt) => {
            });
          });
        }

        // 上链结果响应到请求方
        const returnResult = (result) => {
          status = web3.utils.hexToNumber(result.status);
          if (!status) {
            dataObject.res.end(JSON.stringify(responceData.withdrawFailed));
            log.saveLog(operation[2], new Date().toLocaleString(), qs.depositAddress, gasPrice, result.gasUsed, responceData.withdrawFailed);

            return;
          }

          returnObject = responceData.withdrawSuccess;
          // returnObject.txHash = result;
          returnObject.txHash = result.transactionHash;
          returnObject.gasUsed = result.gasUsed;
          returnObject.gasPrice = gasPrice;

          logObject = result.logs[0];
          console.log(logObject)
          
          // returnObject.depositAddr = web3.utils.numberToHex(web3.utils.hexToNumberString(logObject.data));
          // 返回success 附带message
          dataObject.res.end(JSON.stringify(returnObject));
          // 重置
          returnObject = {};
          // 保存log
          log.saveLog(operation[2], new Date().toLocaleString(), qs.depositAddress, gasPrice, result.gasUsed, responceData.createDepositAddrSuccess);
        }

        getBalance(() => {
          Promise.all([getNonce(), getGasPrice()])
          .then(values => {
            let rawTx = {
              nonce: values[0],
              to: contractAT,
              gasPrice: values[1],
              gasLimit: web3.utils.toHex(5900000),
              data: encodeData
            };
            return rawTx;
          })
          .then((rwaTx) => {
            return sendTransaction(rwaTx);
          })
          .then((result) => {
            returnResult(result);
          })
          .catch(e => {
            if (e) {
              console.log('evm error', e);
              dataObject.res.end(JSON.stringify(responceData.evmError));
              // 重置
              returnObject = {};
              // 保存log
              log.saveLog(operation[2], new Date().toLocaleString(), qs.depositAddress, gasPrice, 0, responceData.evmError);
              return;
            }
          });
        });
      }
    });

    return;
  }
};

// post数据处理模块
let qs;
app.use((req, res, next) => {
  // 初始化socket连接
  initWeb3Provider();
  req.on('data', function (chunk) {
    // 将前台传来的值，转回对象类型
    qs = querystring.parse(chunk);
    // 处理java post过来的数据
    if (qs.data) {
      qs = JSON.parse(qs.data);
    }
    next();
  })
});

// 验签模块
// app.use((req, res, next) => {
//   if (validation.validate(qs.hash)) {
//     next();
//   } else {
//     // 验签不通过，返回错误信息
//     res.end(JSON.stringify(responceData.validationFailed));
//   };
// });


/**********************************************/
/**************SERVER
/**********************************************/
app.post("/createDepositAddr", function (req, res) {
  console.log('/createDepositAddr', qs.hash);
  // 上链方法
  Actions.createDepositAddr({
    data: qs.hash.slice(0, 42),
    res: res
  });
});　　

app.post("/getDepositAddr", function (req, res) {　　
  console.log('/getDepositAddr', qs.hash);
  // 查询方法
  result = Actions.getDepositAddr({
    data: qs.hash.slice(0, 42),
    res: res
  });
});　　

app.post("/getDepositTxs", function (req, res) {　　
  console.log('/getDepositTxs', qs.hash);
  // 查询方法
  result = Actions.getDepositTxs({
    data: qs.hash,
    res: res
  });
});　　　

app.post("/getDepositTxsDetail", function (req, res) {　　
  console.log('/getDepositTxsDetail', qs.hash);
  // 查询方法
  result = Actions.getDepositTxsDetail({
    data: qs.hash,
    res: res
  });
});　　　

app.post("/withdraw", function (req, res) {　　
  console.log('/withdraw from', qs.depositAddress);
  console.log('/withdraw value', qs.value);
  // 查询方法
  result = Actions.withdraw({
    data: qs,
    res: res
  });
});　　


app.listen({
  host: serverConfig.serverHost,
  port: serverConfig.serverPort
}, function () {
  // 初始化web3连接
  initWeb3Provider();
  // 初始化
  Actions.start();
  // 定时发邮件
  // timer.TimerSendMail();
  console.log("server is listening on ", serverConfig.serverHost + ":" + serverConfig.serverPort + "\n");
});


// 取消下面两行注释，即可调用merkleTreeDemo的例子
// const merkleTreeDemo = require("./merkleTreeDemo.js");
// merkleTreeDemo();