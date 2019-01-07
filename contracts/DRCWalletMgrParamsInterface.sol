pragma solidity ^0.4.23;


/**
 * contract that define the wallet management parameters on DRC platform
 * only owner could initialize the parameters, but the congress contract 
 * could set the parameters in the future
 */
interface IDRCWalletMgrParams {
    function singleWithdrawMin() external returns (uint256); // min value of single withdraw
    function singleWithdrawMax() external returns (uint256); // Max value of single withdraw
    function dayWithdraw() external returns (uint256); // Max value of one day of withdraw
    function monthWithdraw() external returns (uint256); // Max value of one month of withdraw
    function dayWithdrawCount() external returns (uint256); // Max number of withdraw counting

    function chargeFee() external returns (uint256); // the charge fee for withdraw
    function chargeFeePool() external returns (address); // the address that will get the returned charge fees.
}