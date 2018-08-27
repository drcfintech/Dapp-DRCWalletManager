pragma solidity ^0.4.24;

library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
    // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (_a == 0) {
      return 0;
    }

    c = _a * _b;
    assert(c / _a == _b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 _a, uint256 _b) internal pure returns (uint256) {
    // assert(_b > 0); // Solidity automatically throws when dividing by 0
    // uint256 c = _a / _b;
    // assert(_a == _b * c + _a % _b); // There is no case in which this doesn't hold
    return _a / _b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 _a, uint256 _b) internal pure returns (uint256) {
    assert(_b <= _a);
    return _a - _b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
    c = _a + _b;
    assert(c >= _a);
    return c;
  }
}

contract Ownable {
  address public owner;


  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   * @notice Renouncing to ownership will leave the contract without an owner.
   * It will not be possible to call the functions with the `onlyOwner`
   * modifier anymore.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(owner);
    owner = address(0);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) public onlyOwner {
    _transferOwnership(_newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address _newOwner) internal {
    require(_newOwner != address(0));
    emit OwnershipTransferred(owner, _newOwner);
    owner = _newOwner;
  }
}

contract Claimable is Ownable {
  address public pendingOwner;

  /**
   * @dev Modifier throws if called by any account other than the pendingOwner.
   */
  modifier onlyPendingOwner() {
    require(msg.sender == pendingOwner);
    _;
  }

  /**
   * @dev Allows the current owner to set the pendingOwner address.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    pendingOwner = newOwner;
  }

  /**
   * @dev Allows the pendingOwner address to finalize the transfer.
   */
  function claimOwnership() public onlyPendingOwner {
    emit OwnershipTransferred(owner, pendingOwner);
    owner = pendingOwner;
    pendingOwner = address(0);
  }
}

contract DRCWalletStorage is Claimable {
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
        uint256 balance;
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
        // depositRepos[_deposit].balance = 0;
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
        uint256 _balance = depositRepos[_deposit].balance;
        depositRepos[_deposit].balance = _balance.add(_value);
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
        uint256 _balance = depositRepos[_deposit].balance;
        depositRepos[_deposit].balance = _balance.sub(_value);
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
        for (uint i = 0; i < len; i = i.add(1)) {
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
        uint256 _balance = depositRepos[_deposit].balance;
        uint256 freezeAble = _balance.sub(_frozen);
        if (_freeze) {
            if (_value > freezeAble) {
                _value = freezeAble;
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
    function balanceOf(address _deposit) public view returns (uint256) {
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

