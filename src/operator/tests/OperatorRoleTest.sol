// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../OperatorRole.sol";

contract OperatorRoleTest is OperatorRole {
    function __OperatorRoleTest_init() external initializer {
        __Ownable_init();
    }

    function getSomething() external view onlyOperator returns (uint) {
        return 10;
    }

    function getOperator(address operator) external view returns (bool) {
        return operators[operator];
    }
}
