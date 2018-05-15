pragma solidity ^0.4.23;


import 'zeppelin-solidity/contracts/ownership/Claimable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Destructible.sol';
import './Autonomy.sol';

contract DRCWalletMgrParams is Claimable, Autonomy, Destructible {
    uint256 public singleWithdraw;
    uint256 public dayWithdraw;
    uint256 public monthWithdraw;

    uint256 public chargeFee;
    address public chargeFeePool;

    function initialSingleWithdraw(uint256 _value) onlyOwner public {
        require(!init);

        singleWithdraw = _value;
    }

    function initialDayWithdraw(uint256 _value) onlyOwner public {
        require(!init);

        dayWithdraw = _value;
    }

    function initialMonthWithdraw(uint256 _value) onlyOwner public {
        require(!init);

        monthWithdraw = _value;
    }

    function initialChargeFee(uint256 _value) onlyOwner public {
        require(!init);

        singleWithdraw = _value;
    }

    function initialChargeFeePool(address _pool) onlyOwner public {
        require(!init);

        chargeFeePool = _pool;
    }    

    function setSingleWithdraw(uint256 _value) onlyCongress public {
        singleWithdraw = _value;
    }

    function setDayWithdraw(uint256 _value) onlyCongress public {
        dayWithdraw = _value;
    }

    function setMonthWithdraw(uint256 _value) onlyCongress public {
        monthWithdraw = _value;
    }

    function setChargeFee(uint256 _value) onlyCongress public {
        singleWithdraw = _value;
    }

    function setChargeFeePool(address _pool) onlyOwner public {
        chargeFeePool = _pool;
    }
}