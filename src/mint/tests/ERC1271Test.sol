// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../ERC1271.sol";

contract ERC1271Test is ERC1271 {
    bool private returnSuccessfulValidSignature;

    function setReturnSuccessfulValidSignature(bool value) public {
        returnSuccessfulValidSignature = value;
    }

    function isValidSignature(bytes32, bytes memory) public view override returns (bytes4) {
        return returnSuccessfulValidSignature ? ERC1271_RETURN_VALID_SIGNATURE : ERC1271_RETURN_INVALID_SIGNATURE;
    }
}
