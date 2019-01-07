const validation = require("./validation.js");
const log = require("./log/log.js");
const timer = require("./timer.js");
const responceData = require("./responceData.js");
// log.saveLog();
const app = require("express")();
const serverConfig = require("./config/serverConfig.json");
const path = require("path");
const http = require("http");
// 模块：对http请求所带的数据进行解析  https://www.cnblogs.com/whiteMu/p/5986297.html
const querystring = require("querystring");
const contract = require("truffle-contract");
const Web3 = require("web3");
// 解决Error：Web3ProviderEngine does not support synchronous requests
const Promise = require("bluebird");
// 生成钱包
//const HDWalletProvider = require("truffle-hdwallet-provider");
const walletConfig = require("./config/walletConfig.json");
// 签名之前构造rawTransaction用
var Tx = require("ethereumjs-tx");

const keystore = require(walletConfig.keystore);
//console.log('keystore  ', keystore);

const infura_url = {
  mainnet: "https://mainnet.infura.io/v3/",
  ropsten: "https://ropsten.infura.io/v3/",
  rinkeby: "https://rinkeby.infura.io/v3/"
};

// 用户操作
const operation = ["insertHash", "selectHash"];

const abiPath = "./contractAbi/";
const abiPath_external = "./external/";
// 智能合约
const HashDataCon_artifacts = require(abiPath + "HashDataCon.json");
// 合约发布地址
const contractAT = HashDataCon_artifacts.networks["4"].address;

// 合约abi
const contractABI = HashDataCon_artifacts.abi;
// 初始化合约实例
let HashDataConContract;
// 调用合约的账号
let account;

const GAS_LIMIT = 4700000; // default gas limit
const SAFE_GAS_PRICE = 41; // default gas price (unit is gwei)
const ADDR_ZERO = "0x0000000000000000000000000000000000000000";
const gasPricePromote = {
  GT_30: 1.25,
  GT_20: 1.2,
  GT_10: 1.15,
  GT_3: 1.12,
  DEFAULT: 1.1
};
const transactionType = {
  WITHDRAW: "withdraw",
  CREATE_DEPOSIT: "createDeposit",
  DO_DEPOSIT: "doDeposit",
  NORMAL: "normal"
};
const intervals = {
  retryTx: 300000,
  retryGasPrice: 910000,
  retryTxTimes: 3,
  retryTimes: 10
};
const decimals = {
  default: 1e18,
  fixedWidth: 1e7,
  leftWidth: 1e11
};
const constants = {
  hashLen: 64
};

// Add headers
app.use((req, res, next) => {
  req.setEncoding("utf8");
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", false);

  // Pass to next layer of middleware
  next();
});

// 新建initWeb3Provider连接
function initWeb3Provider() {
  if (typeof web3 !== "undefined") {
    web3 = new Web3(web3.currentProvider);
  } else {
    web3 = new Web3(
      new Web3.providers.HttpProvider(
        infura_url.rinkeby + walletConfig.infuraAPIkey
      )
    );
  }

  // 解决Error：TypeError: Cannot read property 'kdf' of undefined
  account = web3.eth.accounts.decrypt(
    JSON.parse(JSON.stringify(keystore).toLowerCase()),
    walletConfig.password
  );
  web3.eth.defaultAccount = account.address;
  console.log("web3.eth.defaultAccount : ", web3.eth.defaultAccount);

  if (typeof web3.eth.getAccountsPromise === "undefined") {
    //console.log('解决 Error: Web3ProviderEngine does not support synchronous requests.');
    Promise.promisifyAll(web3.eth, {
      suffix: "Promise"
    });
  }
}

// let gasPrice;
let currentNonce = -1;

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
    console.log("balance =>", balance);
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
};

// 获取data部分的nonce
const getNonce = () => {
  return new Promise((resolve, reject) => {
    const handle = setInterval(() => {
      web3.eth.getTransactionCount(web3.eth.defaultAccount, (error, result) => {
        if (error) {
          clearInterval(handle);
          reject(error);
        }
        if (result) {
          clearInterval(handle);
          console.log("current nonce is: ", currentNonce);
          console.log("current transaction count is: ", result);
          if (currentNonce < result) currentNonce = result;
          else currentNonce += 1;
          resolve(web3.utils.toHex(currentNonce)); // make sure the nonce is different
        }
      });
    }, 5000);
  }).catch(err => {
    console.log("catch error when getNonce");
    return new Promise.reject(err);
  });
};

// 获取data部分的gasPrice
const getGasPrice = () => {
  return new Promise((resolve, reject) => {
    const handle = setInterval(() => {
      web3.eth.getGasPrice((error, result) => {
        if (error) {
          clearInterval(handle);
          reject(error);
        }
        //resolve(web3.utils.toHex(result));
        if (result) {
          clearInterval(handle);

          let gasPrice = web3.utils.fromWei(result, "gwei");
          console.log("gasPrice  ", gasPrice + "gwei");
          if (gasPrice >= 30) gasPrice *= gasPricePromote.GT_30;
          else if (gasPrice >= 20) gasPrice *= gasPricePromote.GT_20;
          else if (gasPrice >= 10) gasPrice *= gasPricePromote.GT_10;
          else if (gasPrice >= 3) gasPrice *= gasPricePromote.GT_3;
          else gasPrice *= gasPricePromote.DEFAULT;

          // resolve(web3.utils.toHex(Math.round(result)));
          resolve(gasPrice.toFixed(2));
        }
      });
    }, 5000);
  }).catch(err => {
    console.log("catch error when getGasPrice");
    return new Promise.reject(err);
  });
};

// 获取estimated gasLimit
const getGasLimit = callObject => {
  return new Promise((resolve, reject) => {
    const handle = setInterval(() => {
      web3.eth.estimateGas(callObject, (error, result) => {
        if (error) {
          clearInterval(handle);
          reject(error);
        }
        //resolve(web3.utils.toHex(result));
        if (result) {
          clearInterval(handle);
          console.log("estimated gasLimit  ", result);
          resolve(Math.round(result * 1.1));
        }
      });
    }, 5000);
  }).catch(err => {
    console.log("catch error when getGasLimit");
    return new Promise.reject(err);
  });
};

const txReplaceRecs = new Map();

let retrySendTransaction = (rawTx, origTxHash) => {
  let newRawTx = rawTx;
  let currTxHash = origTxHash;
  let prevTxHash = origTxHash;

  let iCount = 0;
  let finished = false;
  const handle = setInterval(() => {
    if (finished) {
      clearInterval(handle);
      console.log("retry TX succeed: ", currTxHash);
    }

    iCount++;
    if (iCount > intervals.retryTimes) {
      clearInterval(handle);
      console.log("has retry 10 times of retrying transactions...");
      return new Promise.reject(
        Error("Failed to retry transactions for too many times!")
      );
    }

    Promise.all([getGasPrice()]).then(values => {
      /**
       * internal retry will only take 3 times, if Tx cannot succeed, then
       * the base gasPrice is not correct, so retry another base gasPrice.
       */
      let iCountInternal = 0;
      const handleInternal = setInterval(() => {
        iCountInternal++;
        if (iCountInternal > intervals.retryTxTimes) {
          clearInterval(handleInternal);
          console.log(
            "the base gasPrice is not appropriate, need to change..."
          );
        } else {
          console.log("current retry gasPrice: ", values[0]);
          newRawTx.gasPrice = web3.utils.toHex(
            web3.utils.toWei(values[0].toString(), "gwei")
          );
          let tx = new Tx(newRawTx);

          // 解决 RangeError: private key length is invalid
          tx.sign(new Buffer(account.privateKey.slice(2), "hex"));
          let serializedTx = tx.serialize();

          web3.eth
            .sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on("transactionHash", hash => {
              console.log("current TX hash: ", currTxHash);
              console.log("retry TX hash: ", hash);
              txReplaceRecs.set(currTxHash, hash); // save this replaced Tx hash
              prevTxHash = currTxHash;
              currTxHash = hash;
            })
            .on("receipt", receipt => {
              console.log(
                "retry transaction succeed at ",
                receipt.transactionHash
              );
              txReplaceRecs.set(prevTxHash, receipt.transactionHash); // save this replaced Tx hash
              console.log(
                "get receipt after retry sending transaction: ",
                receipt
              );
              clearInterval(handle);
              finished = true;
            })
            .on("error", (err, receipt) => {
              console.error(
                "catch an error after retry sendTransaction... ",
                err
              );
              if (err) {
                if (receipt && receipt.status) {
                  console.log(
                    "the retry tx has already got the receipt: ",
                    receipt
                  );
                  txReplaceRecs.set(prevTxHash, receipt.transactionHash); // save this replaced Tx hash
                  clearInterval(handle);
                }
                if (err.message.includes("not mined within")) {
                  console.log(
                    "retry tx met error of not mined within 50 blocks or 750 seconds..."
                  );
                } else {
                  if (err.message.includes("out of gas")) {
                    console.error(
                      "account doesn't have enough gas or TX has been reverted in retry..."
                    );
                  } else {
                    console.error("retry tx met other exceptions...");
                  }
                  clearInterval(handle); // this exception will cause not retrying the Tx submission
                  return new Promise.reject(err);
                }
              }
            });

          values[0] *= gasPricePromote.GT_10; // add 15% gasPrice
        }
      }, intervals.retryTx);
    });
  }, intervals.retryGasPrice);
};

// 给tx签名，并且发送上链
const sendTransaction = (rawTx, txType) => {
  return new Promise((resolve, reject) => {
    let tx = new Tx(rawTx);

    // 解决 RangeError: private key length is invalid
    tx.sign(new Buffer(account.privateKey.slice(2), "hex"));
    let serializedTx = tx.serialize();

    // a simple function to add the real gas Price to the receipt data
    let finalReceipt = receipt => {
      let res = receipt;
      res.gasPrice = rawTx.gasPrice;
      return res;
    };

    // 签好的tx发送到链上
    let txHash;
    web3.eth
      .sendSignedTransaction("0x" + serializedTx.toString("hex"))
      .on("transactionHash", hash => {
        if (hash) {
          console.log(txType + " TX hash: ", hash);
          txHash = hash;
          if (txType != transactionType.NORMAL) {
            return resolve(txHash); // maybe there are other type of transaction not need this
          }
        }
      })
      .on("receipt", receipt => {
        console.log(txType + " get receipt after send transaction: ", receipt);
        if (txType == transactionType.NORMAL)
          return resolve(finalReceipt(receipt));
      })
      .on("confirmation", (confirmationNumber, receipt) => {
        console.log(txType + " confirmation number: ", confirmationNumber);
        if (confirmationNumber == 24 && receipt) {
          console.log(txType + "confirmation receipt", receipt);
          return resolve(finalReceipt(receipt));
        }
      })
      .on("error", (err, receipt) => {
        console.error(
          txType + " catch an error after sendTransaction... ",
          err
        );
        if (!txHash) {
          console.log("TX has not been created and error occurred...");
          currentNonce -= 1; // next Tx will take this currentNonce value;
        }
        if (err) {
          if (receipt && receipt.status) {
            console.log("the real tx has already got the receipt: ", receipt);
            if (txType == transactionType.NORMAL)
              return resolve(finalReceipt(receipt));
          }
          // if (err.message.includes('not mined within 50 blocks')
          //     || err.message.includes('not mined within750 seconds')) {
          if (txHash && err.message.includes("not mined within")) {
            console.log(
              "met error of not mined within 50 blocks or 750 seconds..."
            );

            // keep trying to get TX receipt
            let iCount = 0;
            const handle = setInterval(() => {
              iCount += 1;
              web3.eth
                .getTransactionReceipt(txHash)
                .then(resp => {
                  if (resp != null && resp.blockNumber > 0) {
                    console.log("get Tx receipt from error handling: ", resp);
                    clearInterval(handle);
                    if (txType == transactionType.NORMAL)
                      return resolve(finalReceipt(resp));
                  }
                  if (iCount >= 60) {
                    console.log(
                      "has checked if TX had been mined for 5 minutes..."
                    );
                    clearInterval(handle); // not check any more after 300 minutes
                    // throw('Tx had not been mined for more than 5 minutes...');
                    console.log("retrying tx: ", txHash);
                    retrySendTransaction(rawTx, txHash);
                  }
                })
                .catch(err => {
                  console.log(
                    "met error when getting TX receipt from error handling"
                  );
                  clearInterval(handle);
                  reject(err);
                });
            }, 5000);

            // const TIME_OUT = 1800000; // 30 minutes timeout
            // setTimeout(() => {
            //   clearTimeout(handle);
            // }, TIME_OUT);
          } else if (err.message.includes("out of gas")) {
            console.error(
              "account doesn't have enough gas or TX has been reverted..."
            );
            // console.log('TX receipt, ', receipt);
          } else {
            console.log("met other exceptions when send transaction...");
            // retrySendTransaction(rawTx, txHash);
          }

          reject(err);
        }
      });
  }).catch(e => {
    console.error(txType + " catch error when sendTransaction: ", e);
    return new Promise.reject(e);
  });
};

let TxExecution = function(
  contractAT,
  encodeData,
  resultCallback,
  dataObject = {},
  txType = "normal"
) {
  // 上链结果响应到请求方
  // const returnResult = (result) => {
  //   resultCallback(result);
  // }

  let callback = dataObject => {
    let returnObject = {};
    let callObject = {
      to: contractAT,
      data: encodeData
    };
    let txSubmited = false;

    Promise.all([getNonce(), getGasPrice(), getGasLimit(callObject)])
      .then(values => {
        // gasPrice = web3.utils.fromWei(values[1], "gwei");
        console.log("current gasPrice: ", values[1] + "gwei");
        console.log("current gasLimit: ", values[2]);

        // if current gas price is too high, then cancel the transaction
        if (values[1] > SAFE_GAS_PRICE) {
          if (dataObject != {}) {
            dataObject.res.end(JSON.stringify(responceData.gasPriceTooHigh));
          }
          // 重置
          returnObject = {};
          // 保存log
          // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, gasPrice, 0, responceData.evmError);
          return;
        }

        let rawTx = {
          nonce: values[0],
          to: contractAT,
          gasPrice: web3.utils.toHex(
            web3.utils.toWei(values[1].toString(), "gwei")
          ), // values[1],
          gasLimit: web3.utils.toHex(values[2]), //web3.utils.toHex(GAS_LIMIT),
          data: encodeData
        };

        return rawTx;
      })
      .then(rawTx => {
        let res = sendTransaction(rawTx, txType);
        txSubmited = true;
        return res;
      })
      .then(result => {
        // console.log("data object is ", dataObject);

        if (dataObject.res) {
          resultCallback(result, returnObject, dataObject);
        } else {
          resultCallback(result, returnObject);
        }
      })
      .catch(e => {
        if (e) {
          console.error("evm error", e);
          if (!txSubmited) {
            currentNonce -= 1; // tx hadn't succeed submitting, so nonce should not increase
          }
          if (dataObject != {}) {
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

let realValue = value => {
  var temp = value.toFixed(7);
  // web3.utils.toBN(requestObject.value).mul(wb3.utils.toBN(decimals.default));
  return web3.utils
    .toBN(Number.parseInt(temp * decimals.fixedWidth))
    .mul(web3.utils.toBN(decimals.leftWidth))
    .toString();
};

var Actions = {
  // 初始化：拿到web3提供的地址， 利用json文件生成合约··
  start: function() {
    HashDataConContract = new web3.eth.Contract(contractABI, contractAT, {});
    HashDataConContract.setProvider(web3.currentProvider);
  },

  // 往链上存数据
  insertHash: function(data) {
    let dataObject = data;
    let requestObject = dataObject.data;

    // first check hash value is valid
    if (
      !web3.utils.isHex(requestObject.roothash) &&
      requestObject.roothash.length != constants.hashLen
    ) {
      // 返回failed 附带message
      dataObject.res.end(JSON.stringify(responceData.addressError));
      // 保存log
      log.saveLog(
        operation[1],
        new Date().toLocaleString(),
        requestObject,
        0,
        0,
        responceData.dataError
      );
      return;
    }

    // 上链步骤：查询没有结果之后再上链
    HashDataConContract.methods
      .selectHash(requestObject.roothash)
      .call((error, result) => {
        if (error) {
          // 以太坊虚拟机的异常
          dataObject.res.end(JSON.stringify(responceData.evmError));
          // 保存log
          log.saveLog(
            operation[0],
            new Date().toLocaleString(),
            requestObject,
            0,
            0,
            responceData.evmError
          );
          return;
        }

        console.log(" 数据上链前的查询结果   \n", result);
        // 返回值显示已经有该hash的记录
        if (result && result["0"] == true) {
          dataObject.res.end(JSON.stringify(responceData.hashAlreadyInserted));
          // 保存log
          log.saveLog(
            operation[0],
            new Date().toLocaleString(),
            requestObject,
            0,
            0,
            responceData.hashAlreadyInserted
          );

          return;
        }

        if (result && !result["0"]) {
          // 拿到rawTx里面的data部分
          console.log(requestObject);
          console.log("upload hash is ", requestObject.roothash);
          let encodeData_param = web3.eth.abi.encodeParameters(
            ["string"],
            [requestObject.roothash]
          );
          console.log(encodeData_params);
          let encodeData_function = web3.eth.abi.encodeFunctionSignature(
            "insertHash(string)"
          );
          console.log(encodeData_function);
          let encodeData = encodeData_function + encodeData_param.slice(2);
          console.log(encodeData);

          // 上链结果响应到请求方
          let processResult = (result, returnObject, dataObject) => {
            // status = web3.utils.hexToNumber(web3.utils.toHex(result.status));
            console.log("insertHash tx: ", result);
            if (!result) {
              // console.log(dataObject);
              dataObject.res.end(JSON.stringify(responceData.doDepositFailed));
              // log.saveLog(operation[2], new Date().toLocaleString(), qs.withdrawAddress, gasPrice, result.gasUsed, responceData.withdrawFailed);

              return;
            }

            returnObject = responceData.doDepositTxSuccess;
            if (!result.transactionHash) {
              returnObject.txHash = result;
            } else {
              returnObject.txHash = result.transactionHash;
              returnObject.gasUsed = result.gasUsed;
              returnObject.gasPrice = result.gasPrice;

              let logObject = result.logs[0];
              console.log(logObject);
            }

            console.log("doDepoist return object is: ", returnObject);

            // 返回success 附带message
            // console.log(dataObject);
            dataObject.res.end(JSON.stringify(returnObject));
            // 重置
            returnObject = {};
            // 保存log
            // log.saveLog(operation[2], new Date().toLocaleString(), qs.withdrawAddress, gasPrice, result.gasUsed, responceData.createDepositAddrSuccess);
          };

          // console.log("data Object outside is ", dataObject);

          TxExecution(
            contractAT,
            encodeData,
            processResult,
            dataObject,
            transactionType.NORMAL
          );
        }
      })
      .catch(e => {
        if (e) {
          console.log("program error", e);
          dataObject.res.end(JSON.stringify(responceData.programError));
          // 重置
          returnObject = {};
          // 保存log
          // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
          return;
        }
      });

    return;
  },

  // 去链上查询结果
  selectHash: function(data) {
    let dataObject = data;

    HashDataConContract.methods
      .selectHash(dataObject.data)
      .call((err, result) => {
        if (err || !result["0"]) {
          // 返回failed 附带message
          dataObject.res.end(JSON.stringify(responceData.selectHashFailed));
          // 保存log
          // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashFailed);
          return;
        }
        let returnObject = responceData.selectHashSuccess;
        returnObject.data = result;
        // 返回success 附带message
        dataObject.res.end(JSON.stringify(returnObject));
        // 重置
        returnObject = {};
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, responceData.selectHashSuccess);
      });
  }
};

// post数据处理模块
let qs;
app.use((req, res, next) => {
  // 初始化socket连接
  initWeb3Provider();
  req.on("data", function(chunk) {
    try {
      // 将前台传来的值，转回对象类型
      qs = querystring.parse(chunk);
      console.log("data from client side: ", qs);
      // 处理java post过来的数据
      if (qs.data) {
        qs = JSON.parse(qs.data);
        console.log(qs);
      }
      next();
    } catch (e) {
      if (e) {
        console.error("program error", e);
        res.end(JSON.stringify(responceData.programError));
        // 保存log
        // log.saveLog(operation[1], new Date().toLocaleString(), qs.hash, 0, 0, responceData.evmError);
        return;
      }
    }
  });
});

// 验签模块
app.use((req, res, next) => {
  if (typeof qs.hash != "string") {
    qs.hash = JSON.stringify(qs.hash);
  }
  if (validation.validate(qs.hash, qs.sign)) {
    next();
  } else {
    // 验签不通过，返回错误信息
    res.end(JSON.stringify(responceData.validationFailed));
  }
});

/**********************************************/
/**************SERVER
/**********************************************/
// app.post("/insertHash", function (req, res) {
//   console.log('/insertHash', qs.hash);
//   // 上链方法
//   Actions.insertHash({
//     data: qs.hash.slice(0, 64),
//     res: res
//   });
// });

let lastDid;
app.post("/insertHash", function(req, res) {
  if (qs.hash) {
    console.log("/doDeposit info: ", qs.hash);
    qs = JSON.parse(qs.hash);
  }
  console.log("/roothash ", qs.roothash);
  console.log("/type ", qs.type);
  console.log("/timestamp ", qs.timestamp);
  console.log("/upload id: ", qs.did);
  console.log("/operator ", qs.operator);
  console.log("/filename ", qs.filename);
  console.log("/author ", qs.author);
  console.log("/subhash ", qs.subhash);
  console.log("dders ", qs.dders);

  if (lastDid && qs.did === lastDid) return;
  lastDid = qs.did;
  console.log("last did now is: ", lastDid);

  // 查询方法
  result = Actions.insertHash({
    data: qs,
    res: res
  });
});

app.post("/selectHash", function(req, res) {
  console.log("/selectHash", qs.hash);
  // 查询方法
  result = Actions.selectHash({
    data: qs.hash.slice(0, 64),
    res: res
  });
});

app.listen(
  {
    host: serverConfig.serverHost,
    port: serverConfig.serverPort
  },
  function() {
    // 初始化web3连接
    initWeb3Provider();
    // 初始化
    Actions.start();
    // 定时发邮件
    timer.TimerSendMail();
    console.log(
      "server is listening on ",
      serverConfig.serverHost + ":" + serverConfig.serverPort + "\n"
    );
  }
);

// 取消下面两行注释，即可调用merkleTreeDemo的例子
// const merkleTreeDemo = require("./merkleTreeDemo.js");
// merkleTreeDemo();
