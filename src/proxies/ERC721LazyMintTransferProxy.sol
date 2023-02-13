// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./interfaces/ITransferProxy.sol";
import "./../mint/interfaces/IERC721LazyMint.sol";
import "./../mint/librairies/LibERC721LazyMint.sol";
import "./../operator/OperatorRole.sol";

contract ERC721LazyMintTransferProxy is OperatorRole, ITransferProxy {
    function transfer(LibAsset.Asset memory asset, address from, address to) external override onlyOperator {
        require(asset.value == 1, "ERC721 value error");
        (address token, LibERC721LazyMint.Mint721Data memory data) = abi.decode(
            asset.assetType.data,
            (address, LibERC721LazyMint.Mint721Data)
        );
        IERC721LazyMint(token).transferFromOrMint(data, from, to);
    }
}
