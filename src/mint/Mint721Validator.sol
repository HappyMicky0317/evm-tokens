// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./ERC1271Validator.sol";
import "./librairies/LibERC721LazyMint.sol";

contract Mint721Validator is ERC1271Validator {
    function __Mint721Validator_init_unchained() internal {
        __EIP712_init_unchained("Mint721", "1");
    }

    function validate(address account, bytes32 hash, bytes memory signature) internal view {
        validate1271(account, hash, signature);
    }

    uint256[49] private __gap;
}
