pragma solidity >=0.4.18 <0.7.0;


/**
 * contract which define the interface of DRCWalletsStorage contract, which store 
 * the deposit and withdraw wallets data
 */
interface IDRCWalletStorage {
    // get the deposit address for this _wallet address
    function walletDeposits(address payable _wallet) external view returns (address payable); 

    // get frozen status for the deposit address
    function frozenDeposits(address payable _deposit) external view returns (bool); 

    // get a wallet address by the deposit address and the index
    function wallet(address payable _deposit, uint256 _ind) external view returns (address payable); 

    // get a wallet name by the deposit address and the index
    function walletName(address payable _deposit, uint256 _ind) external view returns (bytes32); 

    // get the wallets number of a deposit address
    function walletsNumber(address payable _deposit) external view returns (uint256);

    // get the frozen amount of the deposit address
    function frozenAmount(address payable _deposit) external view returns (uint256);

    // get the balance of the deposit address
    function balanceOf(address payable _deposit) external view returns (uint256);

    // get the deposit address by index
    function depositAddressByIndex(uint256 _ind) external view returns (address payable); 

    // get the frozen amount of the deposit address
    function size() external view returns (uint256);
    
    // judge if the _deposit address exsisted.
    function isExisted(address payable _deposit) external view returns (bool);

    // add one deposit address for that wallet
    function addDeposit(address payable _wallet, address payable _depositAddr) external returns (bool); 

    // change the default wallet address for the deposit address
    function changeDefaultWallet(address payable _oldWallet, address payable _newWallet) external returns (bool); 

    // freeze or release the tokens that has been deposited in the deposit address.
    function freezeTokens(address payable _deposit, bool _freeze, uint256 _value) external returns (bool);

    // increase balance of this deposit address
    function increaseBalance(address payable _deposit, uint256 _value) external returns (bool);

    // decrease balance of this deposit address
    function decreaseBalance(address payable _deposit, uint256 _value) external returns (bool);

    // add withdraw address for one deposit addresss
    function addWithdraw(address payable _deposit, bytes32 _name, address payable _withdraw) external returns (bool);

    // change the withdraw wallet name
    function changeWalletName(address payable _deposit, bytes32 _newName, address payable _wallet) external returns (bool);

    // remove deposit contract address from storage
    function removeDeposit(address payable _depositAddr) external returns (bool);

    // withdraw tokens from this contract
    function withdrawToken(address _token, address payable _to, uint256 _value) external returns (bool);
}