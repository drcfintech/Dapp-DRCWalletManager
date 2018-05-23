var DRCWalletMgrParamsCon = artifacts.require("./DRCWalletMgrParams.sol");

module.exports = function(deployer) {
  deployer.deploy(DRCWalletMgrParamsCon, {gas: '6700000', gasPrice: '4000000000'})
  .then(function(instance) {
    console.log(instance);
  });
};
