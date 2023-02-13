// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./ERC1271.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

abstract contract ERC1271Validator is EIP712Upgradeable {
    using AddressUpgradeable for address;
    using ECDSAUpgradeable for bytes32;

    string private constant SIGNATURE_ERROR = "signature verification error";
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    function validate1271(address signer, bytes32 structHash, bytes memory signature) internal view {
        bytes32 hash = _hashTypedDataV4(structHash);

        address signerFromSig;
        if (signature.length == 65) {
            signerFromSig = hash.recover(signature);
        }
        if (signerFromSig != signer) {
            if (signer.isContract()) {
                require(ERC1271(signer).isValidSignature(hash, signature) == MAGICVALUE, SIGNATURE_ERROR);
            } else {
                revert(SIGNATURE_ERROR);
            }
        }
    }

    uint256[50] private __gap;
}
