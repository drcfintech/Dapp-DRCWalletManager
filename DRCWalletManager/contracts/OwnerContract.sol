pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/DelayedClaimable.sol';

// interface iContract {
//     function transferOwnership(address _newOwner) external;
//     function owner() external view returns (address);
// }

contract OwnerContract is DelayedClaimable {
    Claimable public ownedContract;
    address public pendingOwnedOwner;
    // address internal origOwner;

    /**
     * @dev bind a contract as its owner
     *
     * @param _contract the contract address that will be binded by this Owner Contract
     */
    function bindContract(address _contract) onlyOwner public returns (bool) {
        require(_contract != address(0));
        ownedContract = Claimable(_contract);
        // origOwner = ownedContract.owner();

        // take ownership of the owned contract
        if (ownedContract.owner() != address(this)) {
            ownedContract.claimOwnership();
        }

        return true;
    }

    /**
     * @dev change the owner of the contract from this contract address to the original one. 
     *
     */
    // function transferOwnershipBack() onlyOwner public {
    //     ownedContract.transferOwnership(origOwner);
    //     ownedContract = Claimable(address(0));
    //     origOwner = address(0);
    // }

    /**
     * @dev change the owner of the contract from this contract address to another one. 
     *
     * @param _nextOwner the contract address that will be next Owner of the original Contract
     */
    function changeOwnershipto(address _nextOwner)  onlyOwner public {
        require(ownedContract != address(0));

        if (ownedContract.owner() != pendingOwnedOwner) {
            ownedContract.transferOwnership(_nextOwner);
            pendingOwnedOwner = _nextOwner;
            // ownedContract = Claimable(address(0));
            // origOwner = address(0);
        } else {
            // the pending owner has already taken the ownership
            ownedContract = Claimable(address(0));
            pendingOwnedOwner = address(0);
        }
    }

    /**
     * @dev to confirm the owner of the owned contract has already been transferred. 
     *
     */
    function ownedOwnershipTransferred() onlyOwner public returns (bool) {
        require(ownedContract != address(0));
        if (ownedContract.owner() == pendingOwnedOwner) {
            // the pending owner has already taken the ownership  
            ownedContract = Claimable(address(0));
            pendingOwnedOwner = address(0);
            return true;
        } else {
            return false;
        }
    } 
}