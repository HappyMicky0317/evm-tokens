import {expect} from '../test/utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketERC721, Mint721ValidatorTest} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {BigNumber} from 'ethers';
import EIP712 from '../test/utils/EIP712';
import {ZERO} from '../test/utils/assets';
import {BASE_URI, TOKEN_NAME} from '../test/utils/constants';

describe('GhostMarket ERC721 Test', function () {
  const TOKEN_SYMBOL = 'GHOST';
  let erc721_proxy: GhostMarketERC721;
  let val: Mint721ValidatorTest;
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let testingAsSigner1: GhostMarketERC721;
  let testingAsSigner2: GhostMarketERC721;
  let testingAsSigner5: GhostMarketERC721;

  beforeEach(async function () {
    const ERC721 = await ethers.getContractFactory('GhostMarketERC721');
    [owner, ...addrs] = await ethers.getSigners();
    erc721_proxy = <GhostMarketERC721>await upgrades.deployProxy(ERC721, [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI], {
      initializer: 'initialize',
      unsafeAllowCustomTypes: true,
    });
    await erc721_proxy.deployed();
    const VAL = await ethers.getContractFactory('Mint721ValidatorTest');
    val = await VAL.deploy();
    await val.deployed();
    val.__Mint721ValidatorTest_init();
    testingAsSigner1 = erc721_proxy.connect(addrs[1]);
    testingAsSigner2 = erc721_proxy.connect(addrs[2]);
    testingAsSigner5 = erc721_proxy.connect(addrs[5]);
  });

  it('should have name ' + TOKEN_NAME, async function () {
    expect((await erc721_proxy.name()).toString()).to.equal(TOKEN_NAME);
  });

  it('should have symbol ' + TOKEN_SYMBOL, async function () {
    expect((await erc721_proxy.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should have initial counter = 1', async function () {
    expectEqualStringValues(await erc721_proxy.getCurrentCounter(), 1);
  });

  it('should support ERC165 (0x01ffc9a7) interface', async () => {
    expect((await erc721_proxy.supportsInterface(ethers.utils.hexlify('0x01ffc9a7'))).toString()).to.equal('true');
  });

  it('should support ERC721 (0x80ac58cd/0x5b5e139f/0x780e9d63) interfaces', async () => {
    expect((await erc721_proxy.supportsInterface(ethers.utils.hexlify('0x80ac58cd'))).toString()).to.equal('true'); // ERC721
    expect((await erc721_proxy.supportsInterface(ethers.utils.hexlify('0x5b5e139f'))).toString()).to.equal('true'); // ERC721Metadata
    expect((await erc721_proxy.supportsInterface(ethers.utils.hexlify('0x780e9d63'))).toString()).to.equal('true'); // ERC721Enumerable
  });

  it('should support _GHOSTMARKET_NFT_ROYALTIES (0xe42093a6) interface', async function () {
    expect((await erc721_proxy.supportsInterface(ethers.utils.hexlify('0xe42093a6'))).toString()).to.equal('true');
  });

  it('should be able to transfer ownership of contract', async function () {
    await erc721_proxy.transferOwnership(addrs[1].address);
    expect(await erc721_proxy.owner()).to.equal(addrs[1].address);
  });

  it.skip('should be able to upgrade from legacy to new contract', async function () {
    const GhostMarketERC721V2_ContractFactory = await ethers.getContractFactory('GhostMarketERC721');
    //upgrade
    await upgrades.upgradeProxy(erc721_proxy.address, GhostMarketERC721V2_ContractFactory);
  });

  it('should be able to upgrade from new contract to another new one', async function () {
    const GhostMarketERC721_ContractFactory = await ethers.getContractFactory('GhostMarketERC721');
    const GhostMarketERC721V2_ContractFactory = await ethers.getContractFactory('GhostMarketERC721V2');

    const ghostMarketERC721 = await upgrades.deployProxy(
      GhostMarketERC721_ContractFactory,
      [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI],
      {initializer: 'initialize', unsafeAllowCustomTypes: true}
    );

    //upgrade
    const ghostMarketERC721V2 = await upgrades.upgradeProxy(
      ghostMarketERC721.address,
      GhostMarketERC721V2_ContractFactory
    );

    //test new function
    expect(await ghostMarketERC721V2.getSomething()).to.equal(10);

    //name and symbol should be the same
    expect((await ghostMarketERC721V2.name()).toString()).to.equal(TOKEN_NAME);
    expect((await ghostMarketERC721V2.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should be able to pause/unpause contract', async () => {
    let paused = await erc721_proxy.paused();
    expect(paused).to.equal(false);
    await erc721_proxy.pause();
    paused = await erc721_proxy.paused();
    expect(paused).to.equal(true);
    await erc721_proxy.unpause();
    paused = await erc721_proxy.paused();
    expect(paused).to.equal(false);
  });

  describe('burn NFT', function () {
    it('should burn a single NFT', async function () {
      await erc721_proxy.mintGhost(owner.address, [], 'ext_uri', '');
      //confirm its minted
      const tokenId = await erc721_proxy.getLastTokenID();
      expectEqualStringValues(await erc721_proxy.balanceOf(owner.address), 1);
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(owner.address);

      await erc721_proxy.burn(tokenId);
      //token should not exists anymore
      await expect(erc721_proxy.ownerOf(tokenId)).revertedWith('ERC721: owner query for nonexistent token');
    });

    it('should revert if non owner tries to burn a NFT', async function () {
      await erc721_proxy.mintGhost(owner.address, [], 'ext_uri', '');
      //confirm its minted
      const tokenId = await erc721_proxy.getLastTokenID();
      expectEqualStringValues(await erc721_proxy.balanceOf(owner.address), 1);
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(owner.address);

      await expect(testingAsSigner1.burn(tokenId)).revertedWith('ERC721Burnable: caller is not owner nor approved');
    });

    it('should burn multiple NFTs', async function () {
      const tokenIDs = [1, 2, 3, 4, 5];
      for (let i = 0; i < tokenIDs.length; ++i) {
        await erc721_proxy.mintGhost(owner.address, [], 'ext_uri', '');
      }

      //confirm minted tokens
      expectEqualStringValues(await erc721_proxy.balanceOf(owner.address), tokenIDs.length);
      for (const i of tokenIDs) {
        expect(await erc721_proxy.ownerOf(i)).to.equal(owner.address);
      }
      await erc721_proxy.burnBatch(tokenIDs);
      for (const i of tokenIDs) {
        await expect(erc721_proxy.ownerOf(i)).revertedWith('ERC721: owner query for nonexistent token');
      }
    });

    it('should revert if non owner tries to burn multiple NFTs', async function () {
      const tokenIDs = [1, 2];
      for (let i = 0; i < tokenIDs.length; ++i) {
        await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '');
      }

      //confirm minted tokens
      expectEqualStringValues(await erc721_proxy.balanceOf(addrs[0].address), tokenIDs.length);
      for (const i of tokenIDs) {
        expect(await erc721_proxy.ownerOf(i)).to.equal(addrs[0].address);
      }

      await expect(testingAsSigner1.burnBatch(tokenIDs, {from: addrs[1].address})).revertedWith(
        'ERC721Burnable: caller is not owner nor approved'
      );
    });
  });

  describe('mint NFT', function () {
    it('should mint token and have base uri + token uri', async function () {
      await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '');
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.tokenURI(tokenId)).to.equal(BASE_URI + tokenId);
    });

    it('should start at tokenId = 1', async function () {
      await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '');
      const tokenId = await erc721_proxy.getLastTokenID();
      expectEqualStringValues(tokenId, 1);
    });

    it('should revert if externalURI is empty', async function () {
      await expect(erc721_proxy.mintGhost(addrs[0].address, [], '', '')).revertedWith("tokenURI can't be empty");
    });

    it('should mint token, nft owner = contract deployer', async function () {
      await expect(erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', ''))
        .to.emit(erc721_proxy, 'Minted')
        .withArgs(addrs[0].address, 1, 'ext_uri');

      expectEqualStringValues(await erc721_proxy.balanceOf(addrs[0].address), 1);
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[0].address);
    });

    it('should mint token, nft owner = addrs[1].address', async function () {
      await erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', '');
      expectEqualStringValues(await erc721_proxy.balanceOf(addrs[1].address), 1);
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[1].address);
    });

    it('should mint token and have base uri', async function () {
      await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '');
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.tokenURI(tokenId)).to.equal(BASE_URI + tokenId);
    });

    it('should mint token and have new base uri', async function () {
      const newURI = 'new.app/';
      await erc721_proxy.setBaseTokenURI(newURI);
      await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '');
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.tokenURI(tokenId)).to.equal(newURI + tokenId);
    });

    it('should set royalties properly', async function () {
      const royaltyValue = 100;
      await erc721_proxy.mintGhost(
        addrs[0].address,
        [{recipient: addrs[2].address, value: royaltyValue}],
        'ext_uri',
        ''
      );
      const tokenId = await erc721_proxy.getLastTokenID();
      const royalties = await erc721_proxy.getRoyalties(tokenId);
      expect(royalties.length).to.equal(1);
      expectEqualStringValues(royalties[0].recipient, addrs[2].address);
      expectEqualStringValues(royalties[0].value, royaltyValue);
    });

    it('should mint token with royalty fee and address', async function () {
      const royaltyValue = ethers.BigNumber.from(100);
      const minterAccountNFTbalance = parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString());
      const result = erc721_proxy.mintGhost(
        addrs[0].address,
        [{recipient: addrs[2].address, value: royaltyValue}],
        'ext_uri',
        ''
      );
      const tokenId = (await erc721_proxy.getLastTokenID()).toString();

      await expect(result).to.emit(erc721_proxy, 'Transfer').withArgs(ZERO, addrs[0].address, tokenId);
      expect(parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString())).to.equal(
        minterAccountNFTbalance + 1
      );
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[0].address);
      const royaltyValues = await erc721_proxy.getRoyaltiesBps(tokenId);
      const royaltyRecepient = await erc721_proxy.getRoyaltiesRecipients(tokenId);
      expect(royaltyValues.length).to.equal(1);
      expect(royaltyRecepient[0]).to.equal(addrs[2].address);
      expect(royaltyValues[0]).to.equal(royaltyValue);
    });

    it('should revert if royalty is more then 50%', async function () {
      const royaltyValue = 5001;
      await expect(
        erc721_proxy.mintGhost(addrs[0].address, [{recipient: addrs[2].address, value: royaltyValue}], 'ext_uri', '')
      ).revertedWith('Royalty total value should be < 50%');
    });

    it('should allow anyone to mint', async function () {
      erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', '', {from: addrs[3].address});
    });

    it('should mint tokens without royalty fees', async function () {
      const minterAccountNFTbalance = parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString());
      const result = erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '');
      const tokenId = (await erc721_proxy.getLastTokenID()).toString();

      await expect(result).to.emit(erc721_proxy, 'Transfer').withArgs(ZERO, addrs[0].address, tokenId);
      expect(parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString())).to.equal(
        minterAccountNFTbalance + 1
      );
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[0].address);
      const values = await erc721_proxy.getRoyaltiesBps(tokenId);
      expect(values).to.be.empty;
    });
  });

  describe('mint lazy NFT', function () {
    it('should work if signer is correct', async () => {
      const tokenId = 1;
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign721(addrs[1].address, tokenId.toString(), tokenURI, [], val.address);
      await val.validateTest({tokenId, tokenURI, minter: addrs[1].address, royalties: [], signature});
    });

    it('should fail if signer is incorrect', async () => {
      const tokenId = 1;
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign721(addrs[0].address, tokenId.toString(), tokenURI, [], val.address);
      await expect(
        val.validateTest({tokenId, tokenURI, minter: addrs[1].address, royalties: [], signature})
      ).revertedWith('signature verification error');
    });

    it('should recover signer', async () => {
      const royaltyValue = 100;
      const ERC = await ethers.getContractFactory('ERC721Test');
      const erc = await ERC.deploy();
      await erc.__ERC721Test_init();
      const tokenId = 1;
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign721(
        addrs[1].address,
        tokenId.toString(),
        tokenURI,
        [{recipient: addrs[2].address, value: royaltyValue.toString()}],
        erc.address
      );
      const recovered = await erc.recover(
        {
          tokenId,
          tokenURI,
          minter: addrs[1].address,
          royalties: [{recipient: addrs[2].address, value: royaltyValue.toString()}],
          signature,
        },
        signature
      );
      expect(recovered).to.equal(addrs[1].address);
    });

    it('should work if signer is contract and 1271 passes', async () => {
      const ERC1271 = await ethers.getContractFactory('ERC1271Test');
      const erc1271 = await ERC1271.deploy();
      const tokenId = 1;
      const tokenURI = BASE_URI + tokenId;
      await expect(
        val.validateTest({tokenId, tokenURI, minter: erc1271.address, royalties: [], signature: '0x'})
      ).revertedWith('signature verification error');

      await erc1271.setReturnSuccessfulValidSignature(true);
      await val.validateTest({tokenId, tokenURI, minter: erc1271.address, royalties: [], signature: '0x'});
    });

    it('should work for mint and transfer with signature from proxy', async function () {
      const ERC721_PROXY = await ethers.getContractFactory('ERC721LazyMintTransferProxy');
      const erc721_lazy_proxy = await ERC721_PROXY.deploy();
      await erc721_lazy_proxy.__OperatorRole_init();
      await erc721_lazy_proxy.addOperator(erc721_proxy.address);
      const tokenId = addrs[5].address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign721(addrs[5].address, tokenId.toString(), tokenURI, [], erc721_proxy.address);
      const proxy = addrs[6];
      const tProxy = erc721_proxy.connect(proxy);
      await testingAsSigner5.setApprovalForAll(proxy.address, true, {from: addrs[5].address});
      await expect(
        tProxy.mintAndTransfer(
          {tokenId, tokenURI, minter: addrs[5].address, royalties: [], signature},
          addrs[1].address,
          {from: proxy.address}
        )
      )
        .to.emit(erc721_proxy, 'Minted')
        .withArgs(addrs[5].address, tokenId, tokenURI)
        .to.emit(erc721_proxy, 'Transfer')
        .withArgs(ZERO, addrs[5].address, tokenId)
        .to.emit(erc721_proxy, 'Transfer')
        .withArgs(addrs[5].address, addrs[1].address, tokenId);
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[1].address);

      // new regular transfer post mint should work
      await testingAsSigner1.transferFrom(addrs[1].address, addrs[6].address, tokenId, {from: addrs[1].address});
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[6].address);
    });

    it('should work for mint and transfer with signature from creator', async function () {
      const tokenId = addrs[5].address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign721(addrs[5].address, tokenId.toString(), tokenURI, [], val.address);
      await testingAsSigner5.mintAndTransfer(
        {tokenId, tokenURI, minter: addrs[5].address, royalties: [], signature},
        addrs[1].address,
        {from: addrs[5].address}
      );
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[1].address);

      // new regular transfer post mint should work
      await testingAsSigner1.transferFrom(addrs[1].address, addrs[6].address, tokenId, {from: addrs[1].address});
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[6].address);
    });

    it('should work for transfer from or mint from minter. not yet minted', async () => {
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        transferTo.address,
        {from: minter.address}
      );
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(transferTo.address);
    });

    it('should work for transfer from or mint from minter. already minted', async () => {
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await testingAsSigner1.mintAndTransfer(
        {tokenId, tokenURI, minter: addrs[1].address, royalties: [], signature: '0x'},
        addrs[1].address,
        {from: minter.address}
      );
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        transferTo.address,
        {from: minter.address}
      );
      await expect(
        testingAsSigner1.transferFromOrMint(
          {tokenId, tokenURI, minter: minter.address, royalties: [], signature: '0x'},
          minter.address,
          transferTo.address,
          {from: minter.address}
        )
      ).revertedWith('ERC721: transfer caller is not owner nor approved');
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(transferTo.address);
      await testingAsSigner2.approve(minter.address, tokenId, {from: transferTo.address});
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, minter: minter.address, royalties: [], signature: '0x'},
        transferTo.address,
        minter.address,
        {from: minter.address}
      );
    });

    it('should work for transfer from or mint when not minter. not yet minted', async () => {
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await expect(
        testingAsSigner2.transferFromOrMint(
          {tokenId, tokenURI, minter: minter.address, royalties: [], signature: '0x'},
          transferTo.address,
          addrs[5].address,
          {from: transferTo.address}
        )
      ).revertedWith('wrong order maker');
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        transferTo.address,
        {from: minter.address}
      );
      await testingAsSigner2.transferFromOrMint(
        {tokenId, tokenURI, minter: minter.address, royalties: [], signature: '0x'},
        transferTo.address,
        addrs[5].address,
        {from: transferTo.address}
      );
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[5].address);
    });

    it('should set royalties properly', async function () {
      const royaltyValue = 100;
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await testingAsSigner1.transferFromOrMint(
        {
          tokenId,
          tokenURI,
          minter: minter.address,
          royalties: [{recipient: addrs[2].address, value: royaltyValue}],
          signature: '0x',
        },
        minter.address,
        transferTo.address,
        {from: minter.address}
      );
      const royalties = await erc721_proxy.getRoyalties(tokenId);
      expect(royalties.length).to.equal(1);
      expectEqualStringValues(royalties[0].recipient, addrs[2].address);
      expectEqualStringValues(royalties[0].value, royaltyValue);
    });

    it('should fail for burn then mintagain', async () => {
      const minter = addrs[1];
      const transferTo = addrs[3];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await testingAsSigner1.burn(tokenId);
      await expect(
        testingAsSigner1.mintAndTransfer(
          {tokenId, tokenURI, minter: addrs[1].address, royalties: [], signature: '0x'},
          transferTo.address,
          {from: minter.address}
        )
      ).revertedWith('token already burned');
    });
  });

  describe('locked content', function () {
    const hiddencontent = 'top secret';
    it('should set and get locked content for nft', async function () {
      erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', hiddencontent);
      const tokenId = await erc721_proxy.getLastTokenID();
      const result = testingAsSigner1.getLockedContent(tokenId, {from: addrs[1].address});
      await expect(result)
        .to.emit(erc721_proxy, 'LockedContentViewed')
        .withArgs(addrs[1].address, tokenId, hiddencontent);
    });

    it('should revert if other then token owner tries to fetch locked content', async function () {
      erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', hiddencontent);
      const tokenId = await erc721_proxy.getLastTokenID();
      await expect(erc721_proxy.getLockedContent(tokenId)).revertedWith('Caller must be the owner of the NFT');
    });

    it('should revert if lock content is too long', async function () {
      const hiddenLongcontent =
        'top secret top secret top secret top secret top secret top secret top secret top secret top secret top top secret top secret top secret top secret top secret top secret top secret top secret top secret top'; // 205 bytes
      await expect(erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', hiddenLongcontent)).revertedWith(
        'Lock content bytes length should be < 200'
      );
    });

    it('should increment locked content view count', async function () {
      erc721_proxy.mintGhost(owner.address, [], 'ext_uri', hiddencontent);
      const tokenId = await erc721_proxy.getLastTokenID();
      const currentCounter = await erc721_proxy.getCurrentLockedContentViewTracker(tokenId);
      // call two times the getLockedContent function, counter should increment by 2
      await erc721_proxy.getLockedContent(tokenId);
      await erc721_proxy.getLockedContent(tokenId);
      expect(await erc721_proxy.getCurrentLockedContentViewTracker(tokenId)).to.equal(currentCounter.add(2));
      // mint another NFT
      erc721_proxy.mintGhost(owner.address, [], 'ext_uri', 'top secret2');
      const tokenId2 = await erc721_proxy.getLastTokenID();
      const currentCounter2 = await erc721_proxy.getCurrentLockedContentViewTracker(tokenId2);
      await erc721_proxy.getLockedContent(tokenId2);
      expect(await erc721_proxy.getCurrentLockedContentViewTracker(tokenId2)).to.equal(currentCounter2.add(1));
    });
  });

  function expectEqualStringValues(value1: BigNumber | number | string, value2: BigNumber | number | string) {
    expect(value1.toString()).to.equal(value2.toString());
  }
});
