// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../interfaces/ITransferProxy.sol";
import "../../mint/interfaces/IERC1155LazyMint.sol";
import "../../mint/librairies/LibERC1155LazyMint.sol";
import "../../operator/OperatorRole.sol";

contract ERC1155LazyMintTransferProxyTest is OperatorRole, ITransferProxy {
    function transfer(LibAsset.Asset memory asset, address from, address to) external override onlyOperator {
        (address token, LibERC1155LazyMint.Mint1155Data memory data) = abi.decode(
            asset.assetType.data,
            (address, LibERC1155LazyMint.Mint1155Data)
        );
        IERC1155LazyMint(token).transferFromOrMint(data, from, to, asset.value);
    }
}
