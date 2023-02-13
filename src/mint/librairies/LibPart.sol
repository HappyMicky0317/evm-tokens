// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

library LibPart {
    bytes32 public constant TYPE_HASH = keccak256("Part(address recipient,uint256 value)");

    struct Part {
        address payable recipient;
        uint256 value;
    }

    function hash(Part memory part) internal pure returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, part.recipient, part.value));
    }
}
