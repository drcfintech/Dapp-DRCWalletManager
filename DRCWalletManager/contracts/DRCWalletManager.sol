pragma solidity ^0.4.23;


import 'openzeppelin-solidity/contracts/lifecycle/TokenDestructible.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './OwnerContract.sol';
import './Withdrawable.sol';
import './DepositWithdraw.sol';
import './DRCWalletMgrParamsInterface.sol';
import './DRCWalletStorageInterface.sol';


/**
 * contract that manage the wallet operations on DRC platform
 */
contract DRCWalletManager is OwnerContract, Withdrawable, TokenDestructible {
    using SafeMath for uint256;
    
    /**
     * withdraw wallet description
     */
    // struct WithdrawWallet {
    //     bytes32 name;
    //     address walletAddr;
    // }

    /**
     * Deposit data storage
     */
    // struct DepositRepository {
    //     // uint256 balance;
    //     uint256 frozen;
    //     WithdrawWallet[] withdrawWallets;
    //     // mapping (bytes32 => address) withdrawWallets;
    // }

    // mapping (address => DepositRepository) depositRepos;
    // mapping (address => address) public walletDeposits;
    // mapping (address => bool) public frozenDeposits;

    ERC20 public tk; // the token will be managed
    IDRCWalletMgrParams public params; // the parameters that the management needs
    IDRCWalletStorage public walletStorage; // the deposits and wallets data stored in a contract
    
    event CreateDepositAddress(address indexed _wallet, address _deposit);
    event FrozenTokens(address indexed _deposit, bool _freeze, uint256 _value);
    event ChangeDefaultWallet(address indexed _oldWallet, address _newWallet);

    /**
	 * @dev initialize this contract with token, parameters and storage address
     *
     * @param _token the token address that will be withdraw
     * @param _walletParams the wallet management parameters
	 */
    function initialize(address _token, address _walletParams, address _walletStorage) onlyOwner public returns (bool) {
        require(_token != address(0));
        require(_walletParams != address(0));

        tk = ERC20(_token);
        params = IDRCWalletMgrParams(_walletParams);
        walletStorage = IDRCWalletStorage(_walletStorage);

        return true;
    }
    
    /**
	 * @dev create deposit contract address for the default withdraw wallet
     *
     * @param _wallet the binded default withdraw wallet address
	 */
    function createDepositContract(address _wallet) onlyOwner public returns (address) {
        require(_wallet != address(0));

        DepositWithdraw deposWithdr = new DepositWithdraw(_wallet); // new contract for deposit
        address _deposit = address(deposWithdr);
        // walletDeposits[_wallet] = _deposit;
        // WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        // withdrawWalletList.push(WithdrawWallet("default wallet", _wallet));
        // // depositRepos[_deposit].balance = 0;
        // depositRepos[_deposit].frozen = 0;

        walletStorage.addDeposit(_wallet, _deposit);

        // deposWithdr.authorize(address(tk), this, 1e27); // give authorization to owner contract

        emit CreateDepositAddress(_wallet, _deposit);
        return _deposit;
    }

    /**
	 * @dev deposit a value of funds to the deposit address
     *
     * @param _deposit the deposit address
     * @param _value the deposit funds value
	 */
    function doDeposit(address _deposit, uint256 _value) onlyOwner public returns (bool) {
        return walletStorage.increaseBalance(_deposit, _value);
    }
    
    /**
	 * @dev get deposit contract address by using the default withdraw wallet
     *
     * @param _wallet the binded default withdraw wallet address
	 */
    function getDepositAddress(address _wallet) onlyOwner public view returns (address) {
        require(_wallet != address(0));
        // address deposit = walletDeposits[_wallet];

        // return deposit;
        return walletStorage.walletDeposits(_wallet);
    }
    
    /**
	 * @dev get deposit balance and frozen amount by using the deposit address
     *
     * @param _deposit the deposit contract address
	 */
    function getDepositInfo(address _deposit) onlyOwner public view returns (uint256, uint256) {
        require(_deposit != address(0));
        uint256 _balance = tk.balanceOf(_deposit);
        // uint256 frozenAmount = depositRepos[_deposit].frozen;
        uint256 frozenAmount = walletStorage.frozenAmount(_deposit);
        // depositRepos[_deposit].balance = _balance;

        return (_balance, frozenAmount);
    }
    
    /**
	 * @dev get the number of withdraw wallet addresses bindig to the deposit contract address
     *
     * @param _deposit the deposit contract address
	 */
    function getDepositWithdrawCount(address _deposit) onlyOwner public view returns (uint) {
        require(_deposit != address(0));

        // WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        // uint len = withdrawWalletList.length;
        uint len = walletStorage.walletsNumber(_deposit);

        return len;
    }
    
    /**
	 * @dev get the withdraw wallet addresses list binding to the deposit contract address
     *
     * @param _deposit the deposit contract address
     * @param _indices the array of indices of the withdraw wallets
	 */
    function getDepositWithdrawList(address _deposit, uint[] _indices) onlyOwner public view returns (bytes32[], address[]) {
        require(_indices.length != 0);

        bytes32[] memory names = new bytes32[](_indices.length);
        address[] memory wallets = new address[](_indices.length);
        
        for (uint i = 0; i < _indices.length; i = i.add(1)) {
            // WithdrawWallet storage wallet = depositRepos[_deposit].withdrawWallets[_indices[i]];
            // names[i] = wallet.name;
            // wallets[i] = wallet.walletAddr;
            names[i] = walletStorage.walletName(_deposit, i);
            wallets[i] = walletStorage.wallet(_deposit, i);
        }
        
        return (names, wallets);
    }
    
    /**
	 * @dev change the default withdraw wallet address binding to the deposit contract address
     *
     * @param _oldWallet the previous default withdraw wallet
     * @param _newWallet the new default withdraw wallet
	 */
    function changeDefaultWithdraw(address _oldWallet, address _newWallet) onlyOwner public returns (bool) {
        require(_oldWallet != address(0));
        require(_newWallet != address(0));
        
        address deposit = walletStorage.walletDeposits(_oldWallet);
        DepositWithdraw deposWithdr = DepositWithdraw(deposit);
        require(deposWithdr.setWithdrawWallet(_newWallet));

        // WithdrawWallet[] storage withdrawWalletList = depositRepos[deposit].withdrawWallets;
        // withdrawWalletList[0].walletAddr = _newWallet;
        bool res = walletStorage.changeDefaultWallet(_oldWallet, _newWallet);
        emit ChangeDefaultWallet(_oldWallet, _newWallet);

        return res;
    }
    
    /**
	 * @dev freeze the tokens in the deposit address
     *
     * @param _deposit the deposit address
     * @param _freeze to freeze or release
     * @param _value the amount of tokens need to be frozen
	 */
    function freezeTokens(address _deposit, bool _freeze, uint256 _value) onlyOwner public returns (bool) {
        // require(_deposit != address(0));
        
        // frozenDeposits[_deposit] = _freeze;
        // if (_freeze) {
        //     depositRepos[_deposit].frozen = depositRepos[_deposit].frozen.add(_value);
        // } else {
        //     require(_value <= depositRepos[_deposit].frozen);
        //     depositRepos[_deposit].frozen = depositRepos[_deposit].frozen.sub(_value);
        // }

        bool res = walletStorage.freezeTokens(_deposit, _freeze, _value);

        emit FrozenTokens(_deposit, _freeze, _value);
        return res;
    }
    
    /**
	 * @dev withdraw the tokens from the deposit address to default wallet with charge fee
     *
     * @param _deposit the deposit address
     * @param _time the timestamp the withdraw occurs
     * @param _value the amount of tokens need to be frozen
	 */
    function withdrawWithFee(address _deposit, uint256 _time, uint256 _value) onlyOwner public returns (bool) {    
        // WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        // return withdrawWithFee(_deposit, _time, withdrawWalletList[0].name, withdrawWalletList[0].walletAddr, _value, _check);
        bytes32 defaultWalletName = walletStorage.walletName(_deposit, 0);
        address defaultWallet = walletStorage.wallet(_deposit, 0);
        return withdrawWithFee(_deposit, _time, defaultWalletName, defaultWallet, _value);
    }
    
    /**
	 * @dev check if the wallet name is not matching the expected wallet address
     *
     * @param _deposit the deposit address
     * @param _name the withdraw wallet name
     * @param _to the withdraw wallet address
	 */
    function checkWithdrawAddress(address _deposit, bytes32 _name, address _to) public view returns (bool, bool) {
        // uint len = depositRepos[_deposit].withdrawWallets.length;
        uint len = walletStorage.walletsNumber(_deposit);
        for (uint i = 0; i < len; i = i.add(1)) {
            // WithdrawWallet memory wallet = depositRepos[_deposit].withdrawWallets[i];
            // if (_name == wallet.name) {
            //     return(true, (_to == wallet.walletAddr));
            // }
            // if (_to == wallet.walletAddr) {
            //     return(true, true);
            // }
            bytes32 walletName = walletStorage.walletName(_deposit, i);
            address walletAddr = walletStorage.wallet(_deposit, i);
            if (_name == walletName) {
                return(true, (_to == walletAddr));
            }
            if (_to == walletAddr) {
                return(false, true);
            }
        }

        return (false, false);
    }
    
    /**
	 * @dev withdraw tokens from this contract, send tokens to target withdraw wallet
     *
     * @param _deposWithdr the deposit contract that will record withdrawing
     * @param _time the timestamp occur the withdraw record
     * @param _to the address the token will be transfer to 
     * @param _value the token transferred value
	 */
    function withdrawFromThis(DepositWithdraw _deposWithdr, uint256 _time, address _to, uint256 _value) private returns (bool) {
        uint256 fee = params.chargeFee();
        uint256 realAmount = _value.sub(fee);
        address tokenReturn = params.chargeFeePool();
        if (tokenReturn != address(0) && fee > 0) {
            require(tk.transfer(tokenReturn, fee));
        }

        require (tk.transfer(_to, realAmount));
        _deposWithdr.recordWithdraw(_time, _to, realAmount);

        return true;
    }

    /**
	 * @dev withdraw tokens, send tokens to target withdraw wallet
     *
     * @param _deposit the deposit address that will be withdraw from
     * @param _time the timestamp occur the withdraw record
	 * @param _name the withdraw address alias name to verify
     * @param _to the address the token will be transfer to 
     * @param _value the token transferred value
     * param _check if we will check the value is valid or meet the limit condition
	 */
    function withdrawWithFee(address _deposit, 
                             uint256 _time, 
                             bytes32 _name, 
                             address _to, 
                             uint256 _value) onlyOwner public returns (bool) {
        require(_deposit != address(0));
        require(_to != address(0));

        uint256 totalBalance = walletStorage.balanceOf(_deposit);
        uint256 frozen = walletStorage.frozenAmount(_deposit);
        uint256 available = totalBalance.sub(frozen);
        require(_value <= available);

        uint256 _balance = tk.balanceOf(_deposit);
        // if (_check) {
        //     require(_value <= _balance);
        // }

        // uint256 available = _balance.sub(depositRepos[_deposit].frozen);
        // if (_check) {
        //     require(_value <= available);
        // }

        bool exist;
        bool correct;
        // WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        (exist, correct) = checkWithdrawAddress(_deposit, _name, _to);
        if(!exist) {
            // withdrawWalletList.push(WithdrawWallet(_name, _to));
            if (!correct) {
                walletStorage.addWithdraw(_deposit, _name, _to);
            } else {
                walletStorage.changeWalletName(_deposit, _name, _to);
            }
        } else {
            require(correct, "wallet address must be correct with wallet name!");
        }            

        DepositWithdraw deposWithdr = DepositWithdraw(_deposit);
        /**
         * if deposit address doesn't have enough tokens to withdraw, 
         * then withdraw from this contract. Record in independent deposit contract.
         */
        if (_value > _balance) {
            require(deposWithdr.checkWithdrawAmount(address(params), _value, _time));
            require(deposWithdr.withdrawToken(address(tk), this, _balance));
            
            require(withdrawFromThis(deposWithdr, _time, _to, _value));
            // return true;
        } else {        
            require(deposWithdr.withdrawToken(address(tk), address(params), _time, _to, _value, params.chargeFee(), params.chargeFeePool()));    
        }  

        return walletStorage.decreaseBalance(_deposit, _value);  
    }

}