pragma solidity ^0.4.23;


import 'zeppelin-solidity/contracts/lifecycle/TokenDestructible.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './OwnerContract.sol';
import './Withdrawable.sol';
import './DepositWithdraw.sol';
import './DRCWalletMgrParamsInterface.sol';


/**
 * contract that manage the wallet operations on DRC platform
 */
contract DRCWalletManager is OwnerContract, Withdrawable, TokenDestructible {
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
        // uint256 balance;
        uint256 frozen;
        WithdrawWallet[] withdrawWallets;
        // mapping (bytes32 => address) withdrawWallets;
    }

    mapping (address => DepositRepository) depositRepos;
    mapping (address => address) public walletDeposits;
    mapping (address => bool) public frozenDeposits;

    ERC20 public tk; // the token will be managed
    IDRCWalletMgrParams public params; // the parameters that the management needs
    
    event CreateDepositAddress(address indexed _wallet, address _deposit);
    event FrozenTokens(address indexed _deposit, bool _freeze, uint256 _value);
    // event ChangeDefaultWallet(address indexed _oldWallet, address _newWallet);

    /**
	 * @dev withdraw tokens, send tokens to target default wallet
     *
     * @param _token the token address that will be withdraw
     * @param _walletParams the wallet management parameters
	 */
    function bindToken(address _token, address _walletParams) onlyOwner public returns (bool) {
        require(_token != address(0));
        require(_walletParams != address(0));

        tk = ERC20(_token);
        params = IDRCWalletMgrParams(_walletParams);
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
        walletDeposits[_wallet] = _deposit;
        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        withdrawWalletList.push(WithdrawWallet("default wallet", _wallet));
        // depositRepos[_deposit].balance = 0;
        depositRepos[_deposit].frozen = 0;

        // deposWithdr.authorize(address(tk), this, 1e27); // give authorization to owner contract

        emit CreateDepositAddress(_wallet, address(deposWithdr));
        return deposWithdr;
    }
    
    /**
	 * @dev get deposit contract address by using the default withdraw wallet
     *
     * @param _wallet the binded default withdraw wallet address
	 */
    // function getDepositAddress(address _wallet) onlyOwner public view returns (address) {
    //     require(_wallet != address(0));
    //     address deposit = walletDeposits[_wallet];

    //     return deposit;
    // }
    
    /**
	 * @dev get deposit balance and frozen amount by using the deposit address
     *
     * @param _deposit the deposit contract address
	 */
    function getDepositInfo(address _deposit) onlyOwner public view returns (uint256, uint256) {
        require(_deposit != address(0));
        uint256 _balance = tk.balanceOf(_deposit);
        uint256 frozenAmount = depositRepos[_deposit].frozen;
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

        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        uint len = withdrawWalletList.length;

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
            WithdrawWallet storage wallet = depositRepos[_deposit].withdrawWallets[_indices[i]];
            names[i] = wallet.name;
            wallets[i] = wallet.walletAddr;
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
        require(_newWallet != address(0));
        
        address deposit = walletDeposits[_oldWallet];
        DepositWithdraw deposWithdr = DepositWithdraw(deposit);
        require(deposWithdr.setWithdrawWallet(_newWallet));

        WithdrawWallet[] storage withdrawWalletList = depositRepos[deposit].withdrawWallets;
        withdrawWalletList[0].walletAddr = _newWallet;
        // emit ChangeDefaultWallet(_oldWallet, _newWallet);

        return true;
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
        
        frozenDeposits[_deposit] = _freeze;
        if (_freeze) {
            depositRepos[_deposit].frozen = depositRepos[_deposit].frozen.add(_value);
        } else {
            require(_value <= depositRepos[_deposit].frozen);
            depositRepos[_deposit].frozen = depositRepos[_deposit].frozen.sub(_value);
        }

        emit FrozenTokens(_deposit, _freeze, _value);
        return true;
    }
    
    /**
	 * @dev withdraw the tokens from the deposit address to default wallet with charge fee
     *
     * @param _deposit the deposit address
     * @param _time the timestamp the withdraw occurs
     * @param _value the amount of tokens need to be frozen
	 */
    function withdrawWithFee(address _deposit, uint256 _time, uint256 _value, bool _check) onlyOwner public returns (bool) {    
        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        return withdrawWithFee(_deposit, _time, withdrawWalletList[0].name, withdrawWalletList[0].walletAddr, _value, _check);
    }
    
    /**
	 * @dev check if the wallet name is not matching the expected wallet address
     *
     * @param _deposit the deposit address
     * @param _name the withdraw wallet name
     * @param _to the withdraw wallet address
	 */
    function checkWithdrawAddress(address _deposit, bytes32 _name, address _to) public view returns (bool, bool) {
        uint len = depositRepos[_deposit].withdrawWallets.length;
        for (uint i = 0; i < len; i = i.add(1)) {
            WithdrawWallet memory wallet = depositRepos[_deposit].withdrawWallets[i];
            if (_name == wallet.name) {
                return(true, (_to == wallet.walletAddr));
            }
            if (_to == wallet.walletAddr) {
                return(true, true);
            }
        }

        return (false, true);
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
     * @param _check if we will check the value is valid or meet the limit condition
	 */
    function withdrawWithFee(address _deposit, 
                             uint256 _time, 
                             bytes32 _name, 
                             address _to, 
                             uint256 _value, 
                             bool _check) onlyOwner public returns (bool) {
        require(_deposit != address(0));
        require(_to != address(0));

        uint256 _balance = tk.balanceOf(_deposit);
        if (_check) {
            require(_value <= _balance);
        }

        uint256 available = _balance.sub(depositRepos[_deposit].frozen);
        if (_check) {
            require(_value <= available);
        }

        bool exist;
        bool correct;
        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        (exist, correct) = checkWithdrawAddress(_deposit, _name, _to);
        if(!exist) {
            withdrawWalletList.push(WithdrawWallet(_name, _to));
        } else if(!correct) {
            return false;
        }

        DepositWithdraw deposWithdr = DepositWithdraw(_deposit);
        /**
         * if deposit address doesn't have enough tokens to withdraw, 
         * then withdraw from this contract. Record in deposit contract.
         */
        if (_value > available) {
            require(deposWithdr.checkWithdrawAmount(address(params), _value, _time));
            require(deposWithdr.withdrawToken(address(tk), this, available));
            
            require(withdrawFromThis(deposWithdr, _time, _to, _value));
            return true;
        }
        
        return (deposWithdr.withdrawToken(address(tk), address(params), _time, _to, _value, params.chargeFee(), params.chargeFeePool()));        
    }

}