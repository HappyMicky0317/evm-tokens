// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../librairies/LibERC1155LazyMint.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

contract ERC1155Test is EIP712Upgradeable {
    using AddressUpgradeable for address;
    using ECDSAUpgradeable for bytes32;

    function __ERC1155Test_init() external initializer {
        __EIP712_init("Mint1155", "1");
    }

    function recover(
        LibERC1155LazyMint.Mint1155Data memory data,
        bytes memory signature
    ) external view returns (address) {
        bytes32 structHash = LibERC1155LazyMint.hash(data);
        bytes32 hash = _hashTypedDataV4(structHash);
        return hash.recover(signature);
    }
}
