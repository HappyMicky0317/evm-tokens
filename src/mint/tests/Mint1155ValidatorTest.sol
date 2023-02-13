// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../Mint1155Validator.sol";

contract Mint1155ValidatorTest is Mint1155Validator {
    function __Mint1155ValidatorTest_init() external initializer {
        __Mint1155Validator_init_unchained();
    }

    function validateTest(address sender, LibERC1155LazyMint.Mint1155Data memory data) external view {
        if (sender != data.minter) {
            validate(data.minter, LibERC1155LazyMint.hash(data), data.signature);
        }
    }
}
