pragma solidity ^0.4.23;


import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/Claimable.sol';
import './Withdrawable.sol';


/**
 * contract that manage the wallet operations on DRC platform
 */
contract DRCWalletStorage is Withdrawable, Claimable {
    using SafeMath for uint256;
    
    /**
     * withdraw wallet description
     */
    struct WithdrawWallet {
        bytes32 name;
        address walletAddr;
    }

    /**
     * Deposit data storage
     */
    struct DepositRepository {
        int256 balance; // can be negative
        uint256 frozen;
        WithdrawWallet[] withdrawWallets;
        // mapping (bytes32 => address) withdrawWallets;
    }

    mapping (address => DepositRepository) depositRepos;
    mapping (address => address) public walletDeposits;
    mapping (address => bool) public frozenDeposits;
    uint256 public size;

    
    /**
	 * @dev add deposit contract address for the default withdraw wallet
     *
     * @param _wallet the default withdraw wallet address
     * @param _depositAddr the corresponding deposit address to the default wallet
	 */
    function addDeposit(address _wallet, address _depositAddr) onlyOwner public returns (bool) {
        require(_wallet != address(0));
        require(_depositAddr != address(0));
        
        walletDeposits[_wallet] = _depositAddr;
        WithdrawWallet[] storage withdrawWalletList = depositRepos[_depositAddr].withdrawWallets;
        withdrawWalletList.push(WithdrawWallet("default wallet", _wallet));
        depositRepos[_depositAddr].balance = 0;
        depositRepos[_depositAddr].frozen = 0;

        size = size.add(1);
        return true;
    }
    
    /**
	 * @dev remove deposit contract address from storage
     *
     * @param _depositAddr the corresponding deposit address 
	 */
    function removeDeposit(address _depositAddr) onlyOwner public returns (bool) {
        require(_depositAddr != address(0));

        WithdrawWallet memory withdraw = depositRepos[_depositAddr].withdrawWallets[0];
        delete walletDeposits[withdraw.walletAddr];
        delete depositRepos[_depositAddr];
        delete frozenDeposits[_depositAddr];
        
        size = size.sub(1);
        return true;
    }

    /**
	 * @dev add withdraw address for one deposit addresss
     *
     * @param _deposit the corresponding deposit address 
     * @param _name the new withdraw wallet name
     * @param _withdraw the new withdraw wallet address
	 */
    function addWithdraw(address _deposit, bytes32 _name, address _withdraw) onlyOwner public returns (bool) {
        require(_deposit != address(0));

        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        withdrawWalletList.push(WithdrawWallet(_name, _withdraw));
        return true;
    }

    /**
	 * @dev increase balance of this deposit address
     *
     * @param _deposit the corresponding deposit address 
     * @param _value the amount that the balance will be increased
	 */
    function increaseBalance(address _deposit, uint256 _value) onlyOwner public returns (bool) {
        // require(_deposit != address(0));
        require (walletsNumber(_deposit) > 0);
        int256 _balance = depositRepos[_deposit].balance;
        depositRepos[_deposit].balance = _balance + int256(_value);
        return true;
    }

    /**
	 * @dev decrease balance of this deposit address
     *
     * @param _deposit the corresponding deposit address 
     * @param _value the amount that the balance will be decreased
	 */
    function decreaseBalance(address _deposit, uint256 _value) onlyOwner public returns (bool) {
        // require(_deposit != address(0));
        require (walletsNumber(_deposit) > 0);
        int256 _balance = depositRepos[_deposit].balance;
        depositRepos[_deposit].balance = _balance - int256(_value);
        return true;
    }

    /**
	 * @dev change the default withdraw wallet address binding to the deposit contract address
     *
     * @param _oldWallet the old default withdraw wallet
     * @param _newWallet the new default withdraw wallet
	 */
    function changeDefaultWallet(address _oldWallet, address _newWallet) onlyOwner public returns (bool) {
        require(_oldWallet != address(0));
        require(_newWallet != address(0));

        address _deposit = walletDeposits[_oldWallet];      
        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        withdrawWalletList[0].walletAddr = _newWallet;
        // emit ChangeDefaultWallet(_oldWallet, _newWallet);
        walletDeposits[_newWallet] = _deposit;
        delete walletDeposits[_oldWallet];

        return true;
    }

    /**
	 * @dev change the name of the withdraw wallet address of the deposit contract address
     *
     * @param _deposit the deposit address
     * @param _newName the wallet name
     * @param _wallet the withdraw wallet
	 */
    function changeWalletName(address _deposit, bytes32 _newName, address _wallet) onlyOwner public returns (bool) {
        require(_deposit != address(0));
        require(_wallet != address(0));
      
        uint len = walletsNumber(_deposit);
        // default wallet name do not change
        for (uint i = 1; i < len; i = i.add(1)) {
            WithdrawWallet storage wallet = depositRepos[_deposit].withdrawWallets[i];            
            if (_wallet == wallet.walletAddr) {
                wallet.name = _newName;
                return true;
            }
        }

        return false;
    }

    /**
	 * @dev freeze the tokens in the deposit address
     *
     * @param _deposit the deposit address
     * @param _freeze to freeze or release
     * @param _value the amount of tokens need to be frozen
	 */
    function freezeTokens(address _deposit, bool _freeze, uint256 _value) onlyOwner public returns (bool) {
        require(_deposit != address(0));
        // require(_value <= balanceOf(_deposit));
        
        frozenDeposits[_deposit] = _freeze;
        uint256 _frozen = depositRepos[_deposit].frozen;
        int256 _balance = depositRepos[_deposit].balance;
        int256 freezeAble = _balance - int256(_frozen);
        freezeAble = freezeAble < 0 ? 0 : freezeAble;
        if (_freeze) {
            if (_value > uint256(freezeAble)) {
                _value = uint256(freezeAble);
            }
            depositRepos[_deposit].frozen = _frozen.add(_value);
        } else {
            if (_value > _frozen) {
                _value = _frozen;
            }
            depositRepos[_deposit].frozen = _frozen.sub(_value);
        }

        return true;
    }

    /**
	 * @dev get the wallet address for the deposit address
     *
     * @param _deposit the deposit address
     * @param _ind the wallet index in the list
	 */
    function wallet(address _deposit, uint256 _ind) public view returns (address) {
        require(_deposit != address(0));

        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        return withdrawWalletList[_ind].walletAddr;
    }

    /**
	 * @dev get the wallet name for the deposit address
     *
     * @param _deposit the deposit address
     * @param _ind the wallet index in the list
	 */
    function walletName(address _deposit, uint256 _ind) public view returns (bytes32) {
        require(_deposit != address(0));

        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        return withdrawWalletList[_ind].name;
    }

    /**
	 * @dev get the wallet name for the deposit address
     *
     * @param _deposit the deposit address
	 */
    function walletsNumber(address _deposit) public view returns (uint256) {
        require(_deposit != address(0));

        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        return withdrawWalletList.length;
    }

    /**
	 * @dev get the balance of the deposit account
     *
     * @param _deposit the deposit address
	 */
    function balanceOf(address _deposit) public view returns (int256) {
        require(_deposit != address(0));
        return depositRepos[_deposit].balance;
    }

    /**
	 * @dev get the frozen amount of the deposit address
     *
     * @param _deposit the deposit address
	 */
    function frozenAmount(address _deposit) public view returns (uint256) {
        require(_deposit != address(0));
        return depositRepos[_deposit].frozen;
    }
}