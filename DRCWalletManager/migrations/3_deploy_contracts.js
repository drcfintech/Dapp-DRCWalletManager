var DepositWithdrawCon = artifacts.require("./DepositWithdraw.sol");
var address = "0x19c7f02159137438b58e4959082c26ed8c5d55c0";

module.exports = function(deployer) {
  deployer.deploy(DepositWithdrawCon, address, {gas: '6700000', gasPrice: '4000000000'})
  .then(function(instance) {
    console.log(instance);
  });
};