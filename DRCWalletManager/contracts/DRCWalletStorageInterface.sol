pragma solidity ^0.4.23;


/**
 * contract which define the interface of DRCWalletsStorage contract, which store 
 * the deposit and withdraw wallets data
 */
interface IDRCWalletStorage {
    // get the deposit address for this _wallet address
    function walletDeposits(address _wallet) external view returns (address); 

    // get frozen status for the deposit address
    function frozenDeposits(address _deposit) external view returns (bool); 

    // get a wallet address by the deposit address and the index
    function wallet(address _deposit, uint256 _ind) external view returns (address); 

    // get a wallet name by the deposit address and the index
    function walletName(address _deposit, uint256 _ind) external view returns (bytes32); 

    // get the wallets number of a deposit address
    function walletsNumber(address _deposit) external view returns (uint256);

    // get the frozen amount of the deposit address
    function frozenAmount(address _deposit) external view returns (uint256);

    // get the balance of the deposit address
    function balanceOf(address _deposit) external view returns (uint256); 

    // get the frozen amount of the deposit address
    function size() external view returns (uint256);

    // add one deposit address for that wallet
    function addDeposit(address _wallet, address _depositAddr) external returns (bool); 

    // change the default wallet address for the deposit address
    function changeDefaultWallet(address _oldWallet, address _newWallet) external returns (bool); 

    // freeze or release the tokens that has been deposited in the deposit address.
    function freezeTokens(address _deposit, bool _freeze, uint256 _value) external returns (bool);

    // increase balance of this deposit address
    function increaseBalance(address _deposit, uint256 _value) external returns (bool);

    // decrease balance of this deposit address
    function decreaseBalance(address _deposit, uint256 _value) external returns (bool);

    // add withdraw address for one deposit addresss
    function addWithdraw(address _deposit, bytes32 _name, address _withdraw) external returns (bool);

    // change the withdraw wallet name
    function changeWalletName(address _deposit, bytes32 _newName, address _wallet) external returns (bool);

    // remove deposit contract address from storage
    function removeDeposit(address _depositAddr) external returns (bool);

    // withdraw tokens from this contract
    function withdrawToken(address _token, address _to, uint256 _value) external returns (bool);
}