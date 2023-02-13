// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../Mint721Validator.sol";

contract Mint721ValidatorTest is Mint721Validator {
    function __Mint721ValidatorTest_init() external initializer {
        __Mint721Validator_init_unchained();
    }

    function validateTest(LibERC721LazyMint.Mint721Data memory data) external view {
        validate(data.minter, LibERC721LazyMint.hash(data), data.signature);
    }
}
