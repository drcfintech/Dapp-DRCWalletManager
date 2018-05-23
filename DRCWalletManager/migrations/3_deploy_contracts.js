var DRCWalletMgrCon = artifacts.require("./DRCWalletManager.sol");

module.exports = function(deployer) {
  deployer.deploy(DRCWalletMgrCon, {gas: '6700000', gasPrice: '4000000000'})
  .then(function(instance) {
    console.log(instance);
  });
};