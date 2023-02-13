// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./ERC1155PresetMinterPauserUpgradeableCustom.sol";
import "./Mint1155Validator.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";

/**
 * @dev ERC1155 token with minting, burning, pause, royalties & lock content functions.
 */

contract GhostMarketERC1155 is
    Initializable,
    ERC1155PresetMinterPauserUpgradeableCustom,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    ERC165StorageUpgradeable,
    Mint1155Validator
{
    string public name;
    string public symbol;

    // dev @deprecated
    struct Royalty {
        address payable recipient;
        uint256 value;
    }

    // tokenId => royalties array
    mapping(uint256 => LibPart.Part[]) internal _royalties;

    // tokenId => locked content array
    mapping(uint256 => string) internal _lockedContent;

    // tokenId => locked content view counter array
    mapping(uint256 => uint256) internal _lockedContentViewTracker;

    // @dev deprecated
    mapping(uint256 => string) internal _metadataJson;

    // events
    event LockedContentViewed(address indexed msgSender, uint256 indexed tokenId, string lockedContent);
    event Minted(address indexed toAddress, uint256 indexed tokenId, string tokenURI, uint256 amount);
    event BurnLazy(address indexed operator, address indexed account, uint256 id, uint256 amount);
    event BurnLazyBatch(address indexed operator, address indexed account, uint256[] ids, uint256[] amounts);

    // @dev deprecated
    uint256 internal _payedMintFeesBalance;

    // @dev deprecated
    uint256 internal _ghostmarketMintFees;

    // @dev deprecated
    bytes4 public constant _INTERFACE_ID_ERC1155_GHOSTMARKET = bytes4(keccak256("_INTERFACE_ID_ERC1155_GHOSTMARKET"));

    /**
     * bytes4(keccak256(_GHOSTMARKET_NFT_ROYALTIES)) == 0xe42093a6
     */
    bytes4 public constant _GHOSTMARKET_NFT_ROYALTIES = bytes4(keccak256("_GHOSTMARKET_NFT_ROYALTIES"));

    function initialize(string memory _name, string memory _symbol, string memory uri) public virtual initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __ERC1155_init_unchained(uri);
        __ERC1155Burnable_init_unchained();
        __Pausable_init_unchained();
        __ERC1155Pausable_init_unchained();
        __ERC1155PresetMinterPauser_init_unchained();
        __Ownable_init_unchained();
        _registerInterface(_GHOSTMARKET_NFT_ROYALTIES);
        name = _name;
        symbol = _symbol;
        _tokenIdTracker.increment();
        __Mint1155Validator_init_unchained();
    }

    using CountersUpgradeable for CountersUpgradeable.Counter;

    // _tokenIdTracker to generate automated token IDs
    CountersUpgradeable.Counter private _tokenIdTracker;

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC1155PresetMinterPauserUpgradeableCustom, ERC165StorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev check if msg.sender is owner of NFT id
     */
    function _ownerOf(uint256 tokenId) internal view returns (bool) {
        return balanceOf(msg.sender, tokenId) != 0;
    }

    /**
     * @dev set a NFT royalties fees & recipients
     * fee basis points 10000 = 100%
     */
    function _saveRoyalties(uint256 tokenId, LibPart.Part[] memory royalties) internal {
        uint256 totalValue;
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            require(royalties[i].recipient != address(0x0), "Recipient should be present");
            require(royalties[i].value > 0, "Royalties value should be positive");
            totalValue += royalties[i].value;
            _royalties[tokenId].push(royalties[i]);
        }
        require(totalValue <= 5000, "Royalty total value should be < 50%");
    }

    /**
     * @dev set a NFT locked content as string
     */
    function _setLockedContent(uint256 tokenId, string memory content) internal {
        require(bytes(content).length < 200, "Lock content bytes length should be < 200");
        _lockedContent[tokenId] = content;
    }

    /**
     * @dev increment a NFT locked content view tracker
     */
    function _incrementCurrentLockedContentViewTracker(uint256 tokenId) internal {
        _lockedContentViewTracker[tokenId] = _lockedContentViewTracker[tokenId] + 1;
    }

    /**
     * @dev transfer (if existing) or mint (if non existing) a nft
     */
    function transferFromOrMint(
        LibERC1155LazyMint.Mint1155Data memory data,
        address from,
        address to,
        uint256 amount
    ) external {
        uint balance = balanceOf(from, data.tokenId);
        uint left = amount;
        if (balance != 0) {
            uint transfer = amount;
            if (balance < amount) {
                transfer = balance;
            }
            safeTransferFrom(from, to, data.tokenId, transfer, "");
            left = amount - transfer;
        }
        if (left > 0) {
            require(from == data.minter, "wrong order maker");
            mintAndTransfer(data, to, left);
        }
    }

    /**
     * @dev lazy mint a NFT, set royalties
     */
    function mintAndTransfer(
        LibERC1155LazyMint.Mint1155Data memory lazyMintData,
        address to,
        uint256 _amount
    ) public virtual {
        require(
            keccak256(abi.encodePacked(lazyMintData.tokenURI)) != keccak256(abi.encodePacked("")),
            "tokenURI can't be empty"
        );
        address minter = address(uint160(lazyMintData.tokenId >> 96));
        address sender = _msgSender();
        require(minter == sender || isApprovedForAll(minter, sender), "ERC1155: transfer caller is not approved");
        require(_amount > 0, "amount incorrect");

        if (lazyMintData.minter != _msgSender()) {
            validate(lazyMintData.minter, LibERC1155LazyMint.hash(lazyMintData), lazyMintData.signature);
        }
        if (lazyMintData.royalties.length > 0) {
            _saveRoyalties(lazyMintData.tokenId, lazyMintData.royalties);
        }
        _saveSupply(lazyMintData.tokenId, lazyMintData.amount);

        mint(to, lazyMintData.tokenId, _amount, "");

        if (minter != to) {
            emit TransferSingle(sender, address(0), minter, lazyMintData.tokenId, _amount);
            emit TransferSingle(sender, minter, to, lazyMintData.tokenId, _amount);
        } else {
            emit TransferSingle(sender, address(0), to, lazyMintData.tokenId, _amount);
        }
        emit Minted(to, lazyMintData.tokenId, lazyMintData.tokenURI, _amount);
    }

    /**
     * @dev mint NFT, set royalties, set metadata json, set lockedcontent
     * emits Minted event
     */
    function mintGhost(
        address to,
        uint256 amount,
        bytes memory data,
        LibPart.Part[] memory royalties,
        string memory tokenURI,
        string memory lockedcontent
    ) external payable nonReentrant {
        require(to != address(0x0), "to can't be empty");
        require(keccak256(abi.encodePacked(tokenURI)) != keccak256(abi.encodePacked("")), "tokenURI can't be empty");
        mint(to, _tokenIdTracker.current(), amount, data);
        if (royalties.length > 0) {
            _saveRoyalties(_tokenIdTracker.current(), royalties);
        }
        if (keccak256(abi.encodePacked(lockedcontent)) != keccak256(abi.encodePacked(""))) {
            _setLockedContent(_tokenIdTracker.current(), lockedcontent);
        }
        emit TransferSingle(_msgSender(), address(0), to, _tokenIdTracker.current(), amount);
        emit Minted(to, _tokenIdTracker.current(), tokenURI, amount);
        _tokenIdTracker.increment();
    }

    /**
     * @dev burn batch NFT, both minted or lazy minted
     * emits BurnLazyBatch event
     */
    function burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) public virtual override {
        require(ids.length == amounts.length, "ids != amounts");
        uint256[] memory leftToBurns = new uint256[](ids.length);
        uint256[] memory lazyToBurns = new uint256[](ids.length);
        for (uint i = 0; i < ids.length; ++i) {
            (leftToBurns[i], lazyToBurns[i]) = ERC1155Upgradeable._burnLazy(ids[i], amounts[i]);
        }
        ERC1155BurnableUpgradeable.burnBatch(account, ids, leftToBurns);
        emit BurnLazyBatch(_msgSender(), account, ids, lazyToBurns);
    }

    /**
     * @dev burn NFT, both minted or lazy minted
     * emits BurnLazy event
     */
    function burn(address account, uint256 id, uint256 amount) public virtual override {
        (uint256 leftToBurn, uint256 lazyToBurn) = ERC1155Upgradeable._burnLazy(id, amount);
        if (leftToBurn > 0) {
            ERC1155BurnableUpgradeable.burn(account, id, leftToBurn);
        }
        if (lazyToBurn > 0) {
            emit BurnLazy(_msgSender(), account, id, lazyToBurn);
        }
    }

    /**
     * @dev get locked content for a NFT
     * emits LockedContentViewed event
     */
    function getLockedContent(uint256 tokenId) external {
        require(_ownerOf(tokenId), "Caller must be the owner of the NFT");
        _incrementCurrentLockedContentViewTracker(tokenId);
        emit LockedContentViewed(msg.sender, tokenId, _lockedContent[tokenId]);
    }

    /**
     * @dev get a NFT current locked content view tracker
     */
    function getCurrentLockedContentViewTracker(uint256 tokenId) external view returns (uint256) {
        return _lockedContentViewTracker[tokenId];
    }

    /**
     * @dev get royalties array
     */
    function getRoyalties(uint256 tokenId) external view returns (LibPart.Part[] memory) {
        return _royalties[tokenId];
    }

    /**
     * @dev get a NFT royalties recipients
     */
    function getRoyaltiesRecipients(uint256 tokenId) external view returns (address payable[] memory) {
        LibPart.Part[] memory royalties = _royalties[tokenId];
        address payable[] memory result = new address payable[](royalties.length);
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            result[i] = royalties[i].recipient;
        }
        return result;
    }

    /**
     * @dev get a NFT royalties fees
     * fee basis points 10000 = 100%
     */
    function getRoyaltiesBps(uint256 tokenId) external view returns (uint256[] memory) {
        LibPart.Part[] memory royalties = _royalties[tokenId];
        uint256[] memory result = new uint256[](royalties.length);
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            result[i] = royalties[i].value;
        }
        return result;
    }

    /**
     * @dev current _tokenIdTracker
     */
    function getCurrentCounter() external view returns (uint256) {
        return _tokenIdTracker.current();
    }

    uint256[50] private __gap;
}
