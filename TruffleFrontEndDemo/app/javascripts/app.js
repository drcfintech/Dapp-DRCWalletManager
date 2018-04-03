// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import {
  default as Web3
} from 'web3';
import {
  default as contract
} from 'truffle-contract';
import {
  default as crypto
} from 'crypto';


import credit_artifacts from '../../build/contracts/Credit.json'


var Credit = contract(credit_artifacts);


var accounts;
var account;

window.App = {
  start: function () {
    var self = this;

    
    Credit.setProvider(web3.currentProvider);

    //获取初始账户
    web3.eth.getAccounts(function (err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }
      accounts = accs;
      account = accounts[0];
    });
  },

  //设置页面文字信息
  setText: function (message, elementID) {
    var status = document.getElementById(elementID);
    status.innerHTML = message;
  },

  
  getMessage: function () {

    var self = this;
    var meta;

    Credit.deployed().then(function (instance) {
      meta = instance;
      return meta.all.call({
        from: account
      });
    }).then(function (value) {
      let infoTemp = `链上信息查询结果 <br> ID ${value[0] || "没有值"} <br> 价格 ${value[1].c || "没有值"} <br> 存证上链Hash ${value[2] || "没有值"}`;
      self.setText(infoTemp, "info");
    }).catch(function (e) {
      console.log(e);
      self.setText("Error getting message. see log.", "error");
    });
  },

  //写数据到以太坊
  saveMessage: function () {

    var self = this;
    var meta;
    
    var identity = document.getElementById("identity").value.trim();
    var price = parseInt(document.getElementById("price").value.trim());
    
    var dataHash = crypto.createHash("sha256").update(identity + price, "utf8").digest("hex");

    var dataHash_bytes32 = crypto.createHash("sha256").update(identity + price, "utf8").digest();
    
    self.setText("存证上链的Hash " + dataHash, "dataHash");

    Credit.deployed().then(function (instance) {
      meta = instance;
      return meta.create(identity, price, dataHash, {
        from: account,
        gas: 3000000
      });
    }).then(function (value) {
      self.setText("TX HASH  " + value.tx, "txHash");
      self.setText("gasUsed  " + value.receipt.gasUsed, "gasUsed");
    }).catch(function (e) {
      console.log(e);
      self.setText("Error", "error");
    });
  }
};

window.addEventListener('load', function () {

  window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
  App.start();
});