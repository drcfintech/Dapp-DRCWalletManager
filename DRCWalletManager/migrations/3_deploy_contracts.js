var DepositWithdrawCon = artifacts.require("./DepositWithdraw.sol");

module.exports = function(deployer) {
  deployer.deploy(DepositWithdrawCon, {gas: '6700000', gasPrice: '4000000000'})
  .then(function(instance) {
    console.log(instance);
  });
};