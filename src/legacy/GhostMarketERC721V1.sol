// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ERC721PresetMinterPauserAutoIdUpgradeableCustom.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";

/**
 * @dev ERC721 token with minting, burning, pause, royalties & lock content functions.
 */

contract GhostMarketERC721V1 is
    Initializable,
    ERC721PresetMinterPauserAutoIdUpgradeableCustom,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    ERC165StorageUpgradeable
{
    // struct for royalties fees
    struct Royalty {
        address payable recipient;
        uint256 value;
    }

    // tokenId => royalties array
    mapping(uint256 => Royalty[]) internal _royalties;

    // tokenId => locked content array
    mapping(uint256 => string) internal _lockedContent;

    // tokenId => locked content view counter array
    mapping(uint256 => uint256) internal _lockedContentViewTracker;

    // tokenId => attributes array
    mapping(uint256 => string) internal _metadataJson;

    // events
    event LockedContentViewed(address msgSender, uint256 tokenId, string lockedContent);
    event MintFeesWithdrawn(address feeWithdrawer, uint256 withdrawAmount);
    event MintFeesUpdated(address feeChanger, uint256 newValue);
    event Minted(address toAddress, uint256 tokenId, string externalURI);

    // mint fees balance
    uint256 internal _payedMintFeesBalance;

    // mint fees value
    uint256 internal _ghostmarketMintFees;

    /**
     * bytes4(keccak256(_INTERFACE_ID_ERC721_GHOSTMARKET)) == 0xee40ffc1
     */
    bytes4 constant _INTERFACE_ID_ERC721_GHOSTMARKET = bytes4(keccak256("_INTERFACE_ID_ERC721_GHOSTMARKET"));

    /**
     * bytes4(keccak256(_GHOSTMARKET_NFT_ROYALTIES)) == 0xe42093a6
     */
    bytes4 constant _GHOSTMARKET_NFT_ROYALTIES = bytes4(keccak256("_GHOSTMARKET_NFT_ROYALTIES"));

    function initialize(string memory name, string memory symbol, string memory uri) public override initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __ERC721Enumerable_init_unchained();
        __ERC721Burnable_init_unchained();
        __Pausable_init_unchained();
        __ERC721Pausable_init_unchained();
        __ERC721URIStorage_init_unchained();
        __ERC721_init_unchained(name, symbol);
        __ERC721PresetMinterPauserAutoId_init_unchained(uri);
        __Ownable_init_unchained();
        _registerInterface(_INTERFACE_ID_ERC721_GHOSTMARKET);
        _registerInterface(_GHOSTMARKET_NFT_ROYALTIES);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721PresetMinterPauserAutoIdUpgradeableCustom, ERC165StorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev set a NFT royalties fees & recipients
     * fee basis points 10000 = 100%
     */
    function _saveRoyalties(uint256 tokenId, Royalty[] memory royalties) internal {
        require(_exists(tokenId), "ERC721: approved query for nonexistent token");
        for (uint256 i = 0; i < royalties.length; i++) {
            require(royalties[i].recipient != address(0x0), "Recipient should be present");
            require(royalties[i].value > 0, "Royalties value should be positive");
            require(royalties[i].value <= 5000, "Royalties value should not be more than 50%");
            _royalties[tokenId].push(royalties[i]);
        }
    }

    /**
     * @dev set a NFT custom attributes to contract storage
     */
    function _setMetadataJson(uint256 tokenId, string memory metadataJson) internal {
        _metadataJson[tokenId] = metadataJson;
    }

    /**
     * @dev set a NFT locked content as string
     */
    function _setLockedContent(uint256 tokenId, string memory content) internal {
        _lockedContent[tokenId] = content;
    }

    /**
     * @dev check mint fees sent to contract
     */
    function _checkMintFees() internal {
        if (_ghostmarketMintFees > 0) {
            require(msg.value == _ghostmarketMintFees, "Wrong fees value sent to GhostMarket for mint fees");
        }
        if (msg.value > 0) {
            _payedMintFeesBalance += msg.value;
        }
    }

    /**
     * @dev increment a NFT locked content view tracker
     */
    function _incrementCurrentLockedContentViewTracker(uint256 tokenId) internal {
        _lockedContentViewTracker[tokenId] = _lockedContentViewTracker[tokenId] + 1;
    }

    /**
     * @dev mint NFT, set royalties, set metadata json, set lockedcontent
     * emits Minted event
     */
    function mintGhost(
        address to,
        Royalty[] memory royalties,
        string memory externalURI,
        string memory metadata,
        string memory lockedcontent
    ) external payable nonReentrant {
        require(to != address(0x0), "to can't be empty");
        require(
            keccak256(abi.encodePacked(externalURI)) != keccak256(abi.encodePacked("")),
            "externalURI can't be empty"
        );
        mint(to);
        uint256 tokenId = getLastTokenID();
        if (royalties.length > 0) {
            _saveRoyalties(tokenId, royalties);
        }
        if (keccak256(abi.encodePacked(metadata)) != keccak256(abi.encodePacked(""))) {
            _setMetadataJson(tokenId, metadata);
        }
        if (keccak256(abi.encodePacked(lockedcontent)) != keccak256(abi.encodePacked(""))) {
            _setLockedContent(tokenId, lockedcontent);
        }
        _checkMintFees();
        emit Minted(to, tokenId, externalURI);
    }

    /**
     * @dev withdraw contract balance
     * emits MintFeesWithdrawn event
     */
    function withdraw(uint256 withdrawAmount) external onlyOwner {
        require(
            withdrawAmount > 0 && withdrawAmount <= _payedMintFeesBalance,
            "Withdraw amount should be greater then 0 and less then contract balance"
        );
        _payedMintFeesBalance -= withdrawAmount;
        (bool success, ) = msg.sender.call{value: withdrawAmount}("");
        require(success, "Transfer failed.");
        emit MintFeesWithdrawn(msg.sender, withdrawAmount);
    }

    /**
     * @dev bulk burn NFT
     */
    function burnBatch(uint256[] memory tokensId) external {
        for (uint256 i = 0; i < tokensId.length; i++) {
            burn(tokensId[i]);
        }
    }

    /**
     * @dev sets Ghostmarket mint fees as uint256
     * emits MintFeesUpdated event
     */
    function setGhostmarketMintFee(uint256 gmmf) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Caller must have admin role to set mint fees");
        _ghostmarketMintFees = gmmf;
        emit MintFeesUpdated(msg.sender, _ghostmarketMintFees);
    }

    /**
     * @return get Ghostmarket mint fees
     */
    function getGhostmarketMintFees() external view returns (uint256) {
        return _ghostmarketMintFees;
    }

    /**
     * @dev get locked content for a NFT
     * emits LockedContentViewed event
     */
    function getLockedContent(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Caller must be the owner of the NFT");
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
     * @dev get a NFT custom attributes
     */
    function getMetadataJson(uint256 tokenId) external view returns (string memory) {
        return _metadataJson[tokenId];
    }

    /**
     * @dev get royalties array
     */
    function getRoyalties(uint256 tokenId) external view returns (Royalty[] memory) {
        return _royalties[tokenId];
    }

    /**
     * @dev get a NFT royalties recipients
     */
    function getRoyaltiesRecipients(uint256 tokenId) external view returns (address payable[] memory) {
        Royalty[] memory royalties = _royalties[tokenId];
        address payable[] memory result = new address payable[](royalties.length);
        for (uint256 i = 0; i < royalties.length; i++) {
            result[i] = royalties[i].recipient;
        }
        return result;
    }

    /**
     * @dev get a NFT royalties fees
     * fee basis points 10000 = 100%
     */
    function getRoyaltiesBps(uint256 tokenId) external view returns (uint256[] memory) {
        Royalty[] memory royalties = _royalties[tokenId];
        uint256[] memory result = new uint256[](royalties.length);
        for (uint256 i = 0; i < royalties.length; i++) {
            result[i] = royalties[i].value;
        }
        return result;
    }

    uint256[50] private __gap;
}
