const validation = require("./validation.js");
const log = require("./log/log.js");
// const timer = require("./timer.js");
const responceData = require("./responceData.js")
// log.saveLog();
const app = require('express')();
const serverConfig = require('./config/serverConfig.json');
const path = require('path');
const http = require('http');
// 模块：对http请求所带的数据进行解析  https://www.cnblogs.com/whiteMu/p/5986297.html
const querystring = require('querystring');
const contract = require('truffle-contract');
const web3Coder = require('truffle-contract/node_modules/web3/lib/solidity/coder.js');
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
const DRCToken_artifacts = require('./external/DRCToken.json');
// Token合约发布地址
const DRCToken_contractAT = DRCToken_artifacts.networks['4'].address;

// Token合约abi
const DRCToken_contractABI = DRCToken_artifacts.abi;
// 初始化Token合约实例
let DRCTokenContract;

// 智能合约
const DRCWalletMgrParams_artifacts = require('./build/contracts/DRCWalletMgrParams.json');
// 合约发布地址
const DRCWalletMgrParams_contractAT = DRCWalletMgrParams_artifacts.networks['4'].address;

// 合约abi
const DRCWalletMgrParams_contractABI = DRCWalletMgrParams_artifacts.abi;
// 初始化合约实例
let DRCWalletMgrParamsContract;

const GAS_LIMIT = 4700000; // default gas limit
const ADDR_ZERO = "0x0000000000000000000000000000000000000000";


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

let gasPrice;

// 获取账户余额  警告 要大于 0.001Eth
const getBalance = (callback, dataObject = {}) => {
  web3.eth.getBalance(web3.eth.defaultAccount, (error, balance) => {
    if (error) {
      if (dataObject != {}) {
        dataObject.res.end(JSON.stringify(responceData.evmError));
      }
      // 保存log
      // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
      return;
    }
    console.log('balance =>', balance);
    if (balance && web3.utils.fromWei(balance, "ether") < 0.001) {
      // 返回failed 附带message
      if (dataObject.res) {
        dataObject.res.end(JSON.stringify(responceData.lowBalance));
      }
      // 保存log
      // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.lowBalance);
      return;
    }
    callback(dataObject);
  });
}

// 获取data部分的nonce
const getNonce = () => {
  return new Promise((resolve, reject) => {
    web3.eth.getTransactionCount(web3.eth.defaultAccount, (error, result) => {
      if (error) reject(error);
      resolve(web3.utils.toHex(result));
    });
  })
  .catch(err => {
    console.log("catch error when getNonce");
    return new Promise.reject(err);
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
      if (gasPrice >= 3) result *= 1.25;
      else if (gasPrice >= 2) result *= 1.5;
      else result *= 2;

      resolve(web3.utils.toHex(result));
    });
  })
  .catch(err => {
    console.log("catch error when getGasPrice");
    return new Promise.reject(err);
  });
};

// 给tx签名，并且发送上链
const sendTransaction = (rawTx) => {
  return new Promise((resolve, reject) => {
    let tx = new Tx(rawTx);

    // 解决 RangeError: private key length is invalid
    tx.sign(new Buffer(account.privateKey.slice(2), 'hex'));
    let serializedTx = tx.serialize();

    // a simple function to add the real gas Price to the receipt data
    let finalReceipt = (receipt) => {
      let res = receipt;
      res.gasPrice = rawTx.gasPrice;
      return res;
    }

    // 签好的tx发送到链上
    let txHash;
    web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
    .on('transactionHash', (hash) => {
      txHash = hash;
      console.log('TX hash: ', hash);
    })
    .on('receipt', (receipt) => {
      console.log('get receipt after send transaction: ', receipt);
      return resolve(finalReceipt(receipt));
    })
    .on('confirmation', (confirmationNumber, receipt) => {
    })
    .on('error', (err, receipt) => {
      console.error('catch an error after sendTransaction... ', err);
      if (err) {
        if (err.message.includes('not mined within 50 blocks')) {
          console.log("met error of not mined within 50 blocks...");
          if (receipt) {
            console.log('the real tx has already got the receipt: ', receipt);
            return resolve(finalReceipt(receipt));
          }

          // keep trying to get TX receipt
          const handle = setInterval(() => {
            web3.eth.getTransactionReceipt(txHash)
            .then((resp) => {
              if(resp != null && resp.blockNumber > 0) {
                clearInterval(handle);
                return resolve(finalReceipt(resp));
              }
            }); 
          });
        
          const TIME_OUT = 1800000; // 30 minutes timeout
          setTimeout(() => {
            clearTimeout(handle);
          }, TIME_OUT);
        } else if (err.message.includes('out of gas')) {
          console.error("account doesn't have enough gas...");
          console.log('TX receipt, ', receipt);
        }

        reject(err);
      }
    });
  })
  .catch(e => {
    console.error("catch error when sendTransaction");
    return new Promise.reject(e);
  });
};

let TxExecution = function(encodeData, resultCallback, dataObject = {}) {   

  // 上链结果响应到请求方
  // const returnResult = (result) => {
  //   resultCallback(result);        
  // }

  let callback = (dataObject) => {
    let returnObject = {};
    Promise.all([getNonce(), getGasPrice()])
      .then(values => {
        let rawTx = {
          nonce: values[0],
          to: contractAT,
          gasPrice: values[1],
          gasLimit: web3.utils.toHex(GAS_LIMIT),
          data: encodeData
        };
 
        gasPrice = web3.utils.fromWei(values[1], "gwei");
        return rawTx;
      })
      .then((rawTx) => {
        return sendTransaction(rawTx);
      })
      .then((result) => {
        // console.log("data object is ", dataObject);

        if (dataObject.res) {
          resultCallback(result, returnObject, dataObject);
        } else {
          resultCallback(result, returnObject);
        }
      })
      .catch(e => {
        if (e) {
          console.error('evm error', e);
          if(dataObject != {}) {
            dataObject.res.end(JSON.stringify(responceData.transactionError));
          }
          // 重置
          returnObject = {};
          // 保存log
          // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, gasPrice, 0, responceData.evmError);
          return;
        }
      });
  };

  getBalance(callback, dataObject);
};

var Actions = {
  // 初始化：拿到web3提供的地址， 利用json文件生成合约··
  start: function () {
    DRCWalletMgrContract = new web3.eth.Contract(contractABI, contractAT, {});
    DRCTokenContract = new web3.eth.Contract(DRCToken_contractABI, DRCToken_contractAT, {});
    DRCWalletMgrParamsContract = new web3.eth.Contract(DRCWalletMgrParams_contractABI, DRCWalletMgrParams_contractAT, {});
    DRCWalletMgrContract.setProvider(web3.currentProvider);
    DRCTokenContract.setProvider(web3.currentProvider);
    DRCWalletMgrParamsContract.setProvider(web3.currentProvider);

    // bind token address
    DRCWalletMgrContract.methods.tk().call()
    .then(result => {
      var bindTk = web3.utils.toHex(result);
      console.log(bindTk);

     if (bindTk == ADDR_ZERO) {
        // 拿到rawTx里面的data部分
        console.log(DRCToken_contractAT);
        let encodeData_param = web3.eth.abi.encodeParameters(
          ['address', 'address'], 
          [DRCToken_contractAT, DRCWalletMgrParams_contractAT.slice(2)]
        );
        console.log(encodeData_param);
        let encodeData_function = web3.eth.abi.encodeFunctionSignature('bindToken(address,address)');
        console.log(encodeData_function);
        let encodeData = encodeData_function + encodeData_param.slice(2);
        console.log(encodeData);
  
        let processResult = (result, returnObject) => {
          returnObject = {from: contractAT};
          returnObject.txHash = result.transactionHash;
          returnObject.gasUsed = result.gasUsed;
          returnObject.gasPrice = result.gasPrice;
          console.log(returnObject);
  
          logObject = result.logs[0];
          console.log(logObject);
  
          // 重置
          returnObject = {};
          // 保存log
          // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, gasPrice, result.gasUsed, responceData.createDepositAddrSuccess);
        };
  
        TxExecution(encodeData, processResult);
     }
    });    
  },

  // 往链上存数据
  createDepositAddr: function (data) {
    let dataObject = data;

    // first check address is valid
    if (!web3.utils.isAddress(dataObject.data)) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.addressError));
      // 保存log
      // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
      return;
    }

    // 上链步骤：查询没有结果之后再上链
    DRCWalletMgrContract.methods.walletDeposits(dataObject.data).call((error, result) => {
      if (error) {
        // 以太坊虚拟机的异常
        dataObject.res.end(JSON.stringify(responceData.evmError));
        // 保存log
        // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
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
        // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.depositAlreadyExist);

        return;
      }

      if (resultValue == "0") {
        // let gasPrice;

        // 拿到rawTx里面的data部分
        console.log(dataObject.data);
        let encodeData_param = web3.eth.abi.encodeParameters(['address'], [dataObject.data]);
        let encodeData_function = web3.eth.abi.encodeFunctionSignature('createDepositContract(address)');
        console.log(encodeData_function);
        let encodeData = encodeData_function + encodeData_param.slice(2);
        console.log(encodeData);

        // 上链结果响应到请求方
        const returnResult = (result, returnObject, dataObject) => {
          // 新return对象，作为http请求的返回值
          returnObject = responceData.createDepositAddrSuccess;
          returnObject.txHash = result.transactionHash;
          returnObject.gasUsed = result.gasUsed;
          returnObject.gasPrice = result.gasPrice;

          logObject = result.logs[0];
          console.log(logObject);
          
          returnObject.depositAddr = web3.utils.numberToHex(web3.utils.hexToNumberString(logObject.data));
          // 返回success 附带message
          dataObject.res.end(JSON.stringify(returnObject));
          // 重置
          returnObject = {};
          // 保存log
          // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, gasPrice, result.gasUsed, responceData.createDepositAddrSuccess);
        }
  
        TxExecution(encodeData, returnResult, dataObject);       
      }
    })
    .catch(e => {
      if (e) {
        console.log('program error', e);
        dataObject.res.end(JSON.stringify(responceData.programError));
        // 重置
        // returnObject = {};
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
        return;
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
      // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
      return;
    }

    DRCWalletMgrContract.methods.wallletDeposits(dataObject.data).call((err, result) => {
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
      // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
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
      console.log(result);
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
      // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.dataError);
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
        // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
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

        for (var i = 0; i < events.length; i++) {
          returnObject.records[i] = {from: events[i].returnValues.from};
          returnObject.records[i].to = events[i].returnValues.to;
          returnObject.records[i].value = events[i].returnValues.value;
          returnObject.records[i].blockNumber = events[i].blockNumber;
          console.log(totalConfirmNumber);
          console.log(blockHigh);
          console.log(returnObject.records[i].blockNumber);
          console.log(blockHigh - returnObject.records[i].blockNumber);
          returnObject.records[i].blockConfirmNum = blockHigh - returnObject.records[i].blockNumber;
          returnObject.records[i].txHash = events[i].transactionHash;
        }
        console.log(returnObject);
        dataObject.res.end(JSON.stringify(returnObject));
        // 重置
        returnObject = {};
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);        
      });
    })
    .catch(err => {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.evmError));
      // 保存log
      // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashFailed);
      return;
    });
  },

  getDepositTxsDetail: function (data) {
    let dataObject = data;

    // let queryData = dataObject.data.split(",");
    let queryData = JSON.parse(dataObject.data);
    console.log(queryData);
    console.log(queryData.length);
    console.log(queryData[0]);
    if (queryData.length == 0) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.dataError));
      // 保存log
      // log.saveLog(operation[0], new Date().toLocaleString(), qs.hash, 0, 0, responceData.dataError);
      return;
    }

    const totalConfirmNumber = 24;
    web3.eth.getBlockNumber()
    .then((result) => {
      let currentBlock = result;
      console.log(currentBlock);
      return currentBlock;
    })
    .then((currentBlock) => {
      let blockHigh = currentBlock;
      let returnObject = responceData.getDepositTxDetailSuccess;
      returnObject.records = new Array(queryData.length);

      for (var i = 0; i < queryData.length; i++) {  
        returnObject.records[i] = {txHash: queryData[i].txHash};
        returnObject.records[i].blockNumber = queryData[i].blockNumber;
        console.log(totalConfirmNumber);
        console.log(blockHigh);   
        console.log(queryData[i].blockNubmber);
        console.log(returnObject.records[i].blockNumber);
        console.log(blockHigh - queryData[i].blockNubmber);
        console.log(totalConfirmNumber - (blockHigh - returnObject.records[i].blockNumber));
        if ((blockHigh - returnObject.records[i].blockNumber) > totalConfirmNumber) {
          returnObject.records[i].blockConfirmNum = totalConfirmNumber;
        } else {
          returnObject.records[i].blockConfirmNum = blockHigh - returnObject.records[i].blockNumber; 
        }     
      }
      console.log("get Tx details return object is: ", returnObject);

      const getGasPrice = (txHash) => {
        return new Promise((resolve, reject) => {
          web3.eth.getTransaction(txHash, (error, result) => {
            if (error) reject(error);

            if (result) console.log('gasPrice  ', result.gasPrice);
            resolve(result.gasPrice);
          });
        })
        .catch(err => {
          console.log("catch error when getGasPrice");
          return new Promise.reject(err);
        });
      }    

      const getGasUsed = (txHash) => {
        return new Promise((resolve, reject) => {
          web3.eth.getTransactionReceipt(txHash, (error, result) => {
            if (error) reject(error);

            // returnOneObject.gasUsed = result.gasUsed;
            if (result) console.log('gasUsed  ', result.gasUsed);
            resolve(result.gasUsed);
          });
        })
        .catch(err => {
          console.log("catch error when getGasUsed");
          return new Promise.reject(err);
        });
      }
      
      const getTxTimestamp = (block) => {
        return new Promise((resolve, reject) => {
          web3.eth.getBlock(block, (err, res) => {
            if (err) reject(err);
 
            if (res) console.log('timestamp  ', res.timestamp);
            resolve(res.timestamp);
          });
        })
        .catch(err => {
          console.log("catch error when getTxTimestamp");
          return new Promise.reject(err);
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
        console.log("return Object is: ", returnObject);
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
          // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
          return;
        }
      });
    })
    .catch(e => {
      if (e) {
        console.log('program error', e);
        dataObject.res.end(JSON.stringify(responceData.programError));
        // 重置
        // returnObject = {};
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
        return;
      }      
    });

    return;
  },

  withdraw: function (data) {
    let dataObject = data;
    let requestObject = dataObject.data;

    if (!web3.utils.isAddress(requestObject.withdrawAddress)) {
      // 返回failed 附带message
      console.log("the withdraw address is invalid: ", requestObject.withdrawAddress);
      dataObject.res.end(JSON.stringify(responceData.addressError));
      // 保存log
      // log.saveLog(operation[2], new Date().toLocaleString(), qs.hash, 0, 0, responceData.addressError);
      return;
    }

    // 上链步骤：查询没有结果之后再上链
    DRCWalletMgrContract.methods.getDepositWithdrawCount(requestObject.depositAddress).call((error, result) => {
      if (error) {
        // 以太坊虚拟机的异常
        dataObject.res.end(JSON.stringify(responceData.evmError));
        // 保存log
        // log.saveLog(operation[2], new Date().toLocaleString(), qs.depositAddress, 0, 0, responceData.evmError);
        return;
      }

      console.log("withdraw wallet count result is: ", result);
      return result;
    })
    .then((withdrawAddrCount) => {
      let num = parseInt(withdrawAddrCount) + 1;
      console.log("withdraw deposit address is：", requestObject.depositAddress);
      // console.log("data Object in withdrawAddrCount ", dataObject);

      let callData_param = web3.eth.abi.encodeParameter(
        'address', 
        requestObject.depositAddress
      );
      console.log(callData_param);
      let callData_function = web3.eth.abi.encodeFunctionSignature('getDepositInfo(address)');
      console.log(callData_function);
      let callData = callData_function + callData_param.slice(2);
      console.log(callData);
      let calldata = {
        to: contractAT,
        data: callData
      };

      web3.eth.call(calldata)
      .then((result) => {
        console.log(result);
        console.log(web3.utils.toBN(result.slice(0,66)));
        let depositInfo = {
          balance: web3.utils.toBN(result.slice(0,66)).div(web3.utils.toBN(1e18)).toString(),
          frozen: web3.utils.toBN(result.slice(66)).div(web3.utils.toBN(1e18)).toString()
        }
        return depositInfo;
      })
      .then((depositInfo) => {
        console.log(' 充值地址余额查询结果   \n', depositInfo.balance);
        console.log(' 充值地址冻结查询结果   \n', depositInfo.frozen);

        // console.log("data Object in depositInfo ", dataObject);

        var ifCheck = false;
        // 返回值显示已经有该hash的记录  
        var balanceVal = parseInt(depositInfo.balance);
        var frozenVal = parseInt(depositInfo.frozen);   
        if (ifCheck && (balanceVal < requestObject.value || (balanceVal - frozenVal) < requestObject.value)) {
          dataObject.res.end(JSON.stringify(responceData.notEnoughBalance));
          // 保存log
          // log.saveLog(operation[2], new Date().toLocaleString(), qs.withdrawAddress, 0, 0, responceData.notEnoughBalance);

          return;
        }

        if (!ifCheck || (balanceVal - frozenVal) >= requestObject.value) {
          // 新建空对象，作为http请求的返回值  
          let returnObject = responceData.withdrawSuccess;      
          let gasPrice;

          // 拿到rawTx里面的data部分
          console.log(requestObject);
          let depositTime = Math.round((new Date().getTime() + 60 * 1000) / 1000); // add 1 more minute
          console.log(depositTime);
          let withdrawAddrName = 'withdraw address ' + num;
          console.log(withdrawAddrName);
          // let withdrawAddrNameBytes = web3.eth.abi.encodeParameter('bytes32', withdrawAddrName);
          let withdrawAddrNameBytes = '0x' + web3Coder.encodeParam('bytes32', withdrawAddrName);  
          console.log(withdrawAddrNameBytes); 
          // const DECIMAL = web3.utils.toHex(1e18); 
          let realValue = (value) => {
            var temp = value.toFixed(18);
            // web3.utils.toBN(requestObject.value).mul(web3.utils.toBN(DECIMAL));
            return web3.utils.toBN(Math.imul(temp, 1e18));
          }
          console.log("real withdraw value is ", realValue(requestObject.value));
          let encodeData_params = web3.eth.abi.encodeParameters(
            ['address', 'uint256', 'bytes32', 'address','uint256','bool'], 
            [requestObject.depositAddress.slice(2), 
              depositTime, 
              withdrawAddrNameBytes,
              requestObject.withdrawAddress.slice(2),
              realValue,
              false]
          );
          console.log(encodeData_params);
          let encodeData_function = web3.eth.abi.encodeFunctionSignature('withdrawWithFee(address,uint256,bytes32,address,uint256,bool)');
          console.log(encodeData_function);
          let encodeData = encodeData_function + encodeData_params.slice(2);
          console.log(encodeData);


          // 上链结果响应到请求方
          let processResult = (result, returnObject, dataObject) => {
            status = web3.utils.hexToNumber(web3.utils.toHex(result.status));
            console.log("withdraw status: ", status);
            if (!status) {
              // console.log(dataObject);
              dataObject.res.end(JSON.stringify(responceData.withdrawFailed));
              // log.saveLog(operation[2], new Date().toLocaleString(), qs.withdrawAddress, gasPrice, result.gasUsed, responceData.withdrawFailed);

              return;
            }
            
            returnObject = responceData.withdrawSuccess;
            returnObject.txHash = result.transactionHash;
            returnObject.blockNumber = result.blockNumber;
            returnObject.gasUsed = result.gasUsed;
            returnObject.gasPrice = result.gasPrice;

            logObject = result.logs[0];
            console.log(logObject);

            console.log("withdraw return object is: ", returnObject);
          
            // returnObject.depositAddr = web3.utils.numberToHex(web3.utils.hexToNumberString(logObject.data));
            // 返回success 附带message
            // console.log(dataObject);
            dataObject.res.end(JSON.stringify(returnObject));
            // 重置
            returnObject = {};
            // 保存log
            // log.saveLog(operation[2], new Date().toLocaleString(), qs.withdrawAddress, gasPrice, result.gasUsed, responceData.createDepositAddrSuccess);
          }

          // console.log("data Object outside is ", dataObject);

          TxExecution(encodeData, processResult, dataObject);
        }
      });
    })
    .catch(e => {
      if (e) {
        console.log('program error', e);
        dataObject.res.end(JSON.stringify(responceData.programError));
        // 重置
        // returnObject = {};
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
        return;
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
    console.log("data from client side: ", qs);
    // 处理java post过来的数据
    if (qs.data) {
      qs = JSON.parse(qs.data);
      console.log(qs);
    }
    next();
  })
});

// 验签模块
app.use((req, res, next) => {
  if (typeof qs.hash != 'string') {
    qs.hash = JSON.stringify(qs.hash);
  }
  if (validation.validate(qs.hash, qs.sign)) {
    next();
  } else {
    // 验签不通过，返回错误信息
    res.end(JSON.stringify(responceData.validationFailed));
  };
});


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
  if (qs.hash) {
    console.log('/withdraw info: ', qs.hash);
    qs = JSON.parse(qs.hash);
  }　
  console.log('/withdraw to ', qs.withdrawAddress);
  console.log('/withdraw from ', qs.depositAddress);
  console.log('/withdraw value ', qs.value);
  // 查询方法
  result = Actions.withdraw({
    data: qs,
    res: res
  });
});　　


app.listen({
  // host: serverConfig.serverHost,
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
