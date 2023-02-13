import {expect} from '../test/utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketERC1155, Mint1155ValidatorTest} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {BigNumber} from 'ethers';
import EIP712 from '../test/utils/EIP712';
import {ZERO} from '../test/utils/assets';
import {BASE_URI, TOKEN_NAME, DATA} from '../test/utils/constants';

describe('GhostMarket ERC1155 Test', function () {
  const MINT_AMOUNT = 2;
  const TOKEN_SYMBOL = 'GHOST';
  let erc1155_proxy: GhostMarketERC1155;
  let val: Mint1155ValidatorTest;
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let testingAsSigner1: GhostMarketERC1155;
  let testingAsSigner2: GhostMarketERC1155;
  let testingAsSigner3: GhostMarketERC1155;
  let testingAsSigner5: GhostMarketERC1155;

  beforeEach(async function () {
    const ERC1155 = await ethers.getContractFactory('GhostMarketERC1155');
    [owner, ...addrs] = await ethers.getSigners();
    erc1155_proxy = <GhostMarketERC1155>await upgrades.deployProxy(ERC1155, [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI], {
      initializer: 'initialize',
      unsafeAllowCustomTypes: true,
    });
    await erc1155_proxy.deployed();
    const VAL = await ethers.getContractFactory('Mint1155ValidatorTest');
    val = await VAL.deploy();
    await val.deployed();
    val.__Mint1155ValidatorTest_init();
    testingAsSigner1 = erc1155_proxy.connect(addrs[1]);
    testingAsSigner2 = erc1155_proxy.connect(addrs[2]);
    testingAsSigner3 = erc1155_proxy.connect(addrs[3]);
    testingAsSigner5 = erc1155_proxy.connect(addrs[5]);
  });

  it('should have name ' + TOKEN_NAME, async function () {
    expect((await erc1155_proxy.name()).toString()).to.equal(TOKEN_NAME);
  });

  it('should have symbol ' + TOKEN_SYMBOL, async function () {
    expect((await erc1155_proxy.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should have initial counter = 1', async function () {
    expectEqualStringValues(await erc1155_proxy.getCurrentCounter(), 1);
  });

  it('should support ERC165 (0x01ffc9a7) interface', async () => {
    expect((await erc1155_proxy.supportsInterface(ethers.utils.hexlify('0x01ffc9a7'))).toString()).to.equal('true');
  });

  it('should support ERC1155 (0xd9b67a26/0x0e89341c) interfaces', async () => {
    expect((await erc1155_proxy.supportsInterface(ethers.utils.hexlify('0xd9b67a26'))).toString()).to.equal('true'); // ERC1155
    expect((await erc1155_proxy.supportsInterface(ethers.utils.hexlify('0x0e89341c'))).toString()).to.equal('true'); // ERC1155Metadata_URI
  });

  it('should support _GHOSTMARKET_NFT_ROYALTIES (0xe42093a6) interface', async function () {
    expect((await erc1155_proxy.supportsInterface(ethers.utils.hexlify('0xe42093a6'))).toString()).to.equal('true');
  });

  it('should be able to transfer ownership of contract', async function () {
    await erc1155_proxy.transferOwnership(addrs[1].address);
    expect(await erc1155_proxy.owner()).to.equal(addrs[1].address);
  });

  it.skip('should be able to upgrade from legacy to new contract', async function () {
    const GhostMarketERC1155V2_ContractFactory = await ethers.getContractFactory('GhostMarketERC1155');
    //upgrade
    await upgrades.upgradeProxy(erc1155_proxy.address, GhostMarketERC1155V2_ContractFactory);
  });

  it('should be able to upgrade from new contract to another new one', async function () {
    const GhostMarketERC1155_ContractFactory = await ethers.getContractFactory('GhostMarketERC1155');
    const GhostMarketERC1155V2_ContractFactory = await ethers.getContractFactory('GhostMarketERC1155V2');

    const ghostMarketERC1155 = await upgrades.deployProxy(
      GhostMarketERC1155_ContractFactory,
      [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI],
      {initializer: 'initialize', unsafeAllowCustomTypes: true}
    );

    //upgrade
    const ghostMarketERC1155V2 = await upgrades.upgradeProxy(
      ghostMarketERC1155.address,
      GhostMarketERC1155V2_ContractFactory
    );

    //test new function
    expect(await ghostMarketERC1155V2.getSomething()).to.equal(10);

    //name and symbol should be the same
    expect((await ghostMarketERC1155V2.name()).toString()).to.equal(TOKEN_NAME);
    expect((await ghostMarketERC1155V2.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should be able to pause/unpause contract', async () => {
    let paused = await erc1155_proxy.paused();
    expect(paused).to.equal(false);
    await erc1155_proxy.pause();
    paused = await erc1155_proxy.paused();
    expect(paused).to.equal(true);
    await erc1155_proxy.unpause();
    paused = await erc1155_proxy.paused();
    expect(paused).to.equal(false);
  });

  describe('burn NFT', function () {
    it('should burn a single NFT', async function () {
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', '');
      //confirm its minted
      const tokenId = await getLastTokenID(erc1155_proxy);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), MINT_AMOUNT);
      await erc1155_proxy.burn(owner.address, tokenId, MINT_AMOUNT);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), 0);
    });

    it('should revert if non owner tries to burn a NFT', async function () {
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '');
      //confirm its minted
      const tokenId = await getLastTokenID(erc1155_proxy);
      expectEqualStringValues(await erc1155_proxy.balanceOf(addrs[0].address, tokenId), MINT_AMOUNT);

      await expect(
        testingAsSigner1.burn(addrs[1].address, tokenId, MINT_AMOUNT, {from: addrs[1].address})
      ).revertedWith('ERC1155: burn amount exceeds balance');
    });

    it('should burn multiple NFTs', async function () {
      const MINT_AMOUNT = ethers.BigNumber.from(20);
      const MINT_AMOUNT2 = ethers.BigNumber.from(30);
      const burnAmounts = [ethers.BigNumber.from(20), ethers.BigNumber.from(10)];

      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', '');
      const tokenId = await getLastTokenID(erc1155_proxy);
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT2, DATA, [], 'ext_uri', '');
      const tokenId2 = await getLastTokenID(erc1155_proxy);

      //confirm its minted
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), MINT_AMOUNT);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId2), MINT_AMOUNT2);

      const tokenBatchIds = [tokenId, tokenId2];
      await erc1155_proxy.burnBatch(owner.address, tokenBatchIds, burnAmounts);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), MINT_AMOUNT.sub(burnAmounts[0]));
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId2), MINT_AMOUNT2.sub(burnAmounts[1]));
      expect(await erc1155_proxy.balanceOf(owner.address, tokenId)).to.equal(MINT_AMOUNT.sub(burnAmounts[0]));
      expect(await erc1155_proxy.balanceOf(owner.address, tokenId2)).to.equal(MINT_AMOUNT2.sub(burnAmounts[1]));
    });

    it('should revert if non owner tries to burn multiple NFTs', async function () {
      const MINT_AMOUNT = ethers.BigNumber.from(20);
      const MINT_AMOUNT2 = ethers.BigNumber.from(30);
      const burnAmounts = [ethers.BigNumber.from(20), ethers.BigNumber.from(10)];
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '');
      const tokenId = await getLastTokenID(erc1155_proxy);
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT2, DATA, [], 'ext_uri', '');
      const tokenId2 = await getLastTokenID(erc1155_proxy);
      //confirm its minted
      expectEqualStringValues(await erc1155_proxy.balanceOf(addrs[0].address, tokenId), MINT_AMOUNT);
      expectEqualStringValues(await erc1155_proxy.balanceOf(addrs[0].address, tokenId2), MINT_AMOUNT2);
      const tokenBatchIds = [tokenId, tokenId2];

      await expect(
        testingAsSigner3.burnBatch(addrs[0].address, tokenBatchIds, burnAmounts, {from: addrs[3].address})
      ).revertedWith('ERC1155: caller is not owner nor approved');
    });
  });

  describe('mint NFT', function () {
    it('should mint token and have base uri', async function () {
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '');
      const tokenId = await getLastTokenID(erc1155_proxy);
      expect(await erc1155_proxy.uri(tokenId)).to.equal(BASE_URI);
    });

    it('should mint token and have new base uri', async function () {
      const newUri = 'gggghost/api/{id}.json';
      erc1155_proxy.setURI(newUri);
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '');
      const tokenId = await getLastTokenID(erc1155_proxy);
      expect(await erc1155_proxy.uri(tokenId)).to.equal(newUri);
    });

    it('should revert if externalURI is empty', async function () {
      await expect(erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], '', '')).revertedWith(
        "tokenURI can't be empty"
      );
    });

    it('should set royalties properly', async function () {
      const royaltyValue = 100;
      await erc1155_proxy.mintGhost(
        addrs[1].address,
        MINT_AMOUNT,
        DATA,
        [{recipient: addrs[2].address, value: royaltyValue}],
        'ext_uri',
        ''
      );
      const tokenId = await getLastTokenID(erc1155_proxy);
      const royalties = await erc1155_proxy.getRoyalties(tokenId);
      expect(royalties.length).to.equal(1);
      expectEqualStringValues(royalties[0].recipient, addrs[2].address);
      expectEqualStringValues(royalties[0].value, royaltyValue);
    });

    it('should mint token with royalty fee and address', async function () {
      const value = 40;
      const counter = parseInt((await erc1155_proxy.getCurrentCounter()).toString());
      const result = erc1155_proxy.mintGhost(
        addrs[1].address,
        MINT_AMOUNT,
        DATA,
        [{recipient: addrs[0].address, value: value}],
        'ext_uri',
        ''
      );
      const tokenId = await getLastTokenID(erc1155_proxy);
      await expect(result)
        .to.emit(erc1155_proxy, 'TransferSingle')
        .withArgs(owner.address, ZERO, addrs[1].address, tokenId, MINT_AMOUNT);
      expect(parseInt((await erc1155_proxy.getCurrentCounter()).toString())).to.equal(counter + 1);

      const values = await erc1155_proxy.getRoyaltiesBps(tokenId);
      const royaltyRecipient = await erc1155_proxy.getRoyaltiesRecipients(tokenId);
      expect(values.length).to.equal(1);
      expectEqualStringValues(values[0], value);
      expectEqualStringValues(royaltyRecipient[0], addrs[0].address);

      await expect(result).to.emit(erc1155_proxy, 'Minted').withArgs(addrs[1].address, tokenId, 'ext_uri', MINT_AMOUNT);
    });

    it('should revert if royalty is more then 50%', async function () {
      const value = 5001;
      await expect(
        erc1155_proxy.mintGhost(
          addrs[1].address,
          MINT_AMOUNT,
          DATA,
          [{recipient: addrs[0].address, value: value}],
          'ext_uri',
          ''
        )
      ).revertedWith('Royalty total value should be < 50%');
    });

    it('should allow anyone to mint', async function () {
      testingAsSigner1.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', {from: addrs[2].address});
    });

    it('should mint tokens without royalty fees', async function () {
      const counter = parseInt((await erc1155_proxy.getCurrentCounter()).toString());
      const result = erc1155_proxy.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', '');
      const tokenId = await getLastTokenID(erc1155_proxy);
      await expect(result)
        .to.emit(erc1155_proxy, 'TransferSingle')
        .withArgs(owner.address, ZERO, addrs[1].address, tokenId, MINT_AMOUNT);
      expect(parseInt((await erc1155_proxy.getCurrentCounter()).toString())).to.equal(counter + 1);

      const values = await erc1155_proxy.getRoyaltiesBps(tokenId);
      const royaltyRecipient = await erc1155_proxy.getRoyaltiesRecipients(tokenId);
      expect(values.length).to.equal(0);
      expect(royaltyRecipient.length).to.equal(0);

      await expect(result).to.emit(erc1155_proxy, 'Minted').withArgs(addrs[1].address, tokenId, 'ext_uri', MINT_AMOUNT);
    });
  });

  describe('mint lazy NFT', function () {
    it('should work if signer is correct', async () => {
      const tokenId = await getLastTokenID(erc1155_proxy);
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign1155(
        addrs[0].address,
        tokenId.toString(),
        tokenURI,
        MINT_AMOUNT.toString(),
        [],
        val.address
      );
      await val.validateTest(addrs[2].address, {
        tokenId,
        tokenURI,
        amount: MINT_AMOUNT.toString(),
        minter: addrs[0].address,
        royalties: [],
        signature,
      });
    });

    it('should fail if signer is incorrect', async () => {
      const tokenId = await getLastTokenID(erc1155_proxy);
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign1155(
        addrs[0].address,
        tokenId.toString(),
        tokenURI,
        MINT_AMOUNT.toString(),
        [],
        val.address
      );
      await expect(
        val.validateTest(addrs[2].address, {
          tokenId,
          tokenURI,
          amount: MINT_AMOUNT.toString(),
          minter: addrs[1].address,
          royalties: [],
          signature,
        })
      ).revertedWith('signature verification error');
    });

    it('should recover signer', async () => {
      const royaltyValue = 100;
      const ERC = await ethers.getContractFactory('ERC1155Test');
      const erc = await ERC.deploy();
      await erc.__ERC1155Test_init();
      const tokenId = await getLastTokenID(erc1155_proxy);
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign1155(
        addrs[1].address,
        tokenId.toString(),
        tokenURI,
        MINT_AMOUNT.toString(),
        [{recipient: addrs[2].address, value: royaltyValue.toString()}],
        erc.address
      );
      const recovered = await erc.recover(
        {
          tokenId,
          tokenURI,
          amount: MINT_AMOUNT.toString(),
          minter: addrs[1].address,
          royalties: [{recipient: addrs[2].address, value: royaltyValue}],
          signature,
        },
        signature
      );
      expect(recovered).to.equal(addrs[1].address);
    });

    it('should work if signer is contract and 1271 passes', async () => {
      const ERC1271 = await ethers.getContractFactory('ERC1271Test');
      const erc1271 = await ERC1271.deploy();
      const tokenId = await getLastTokenID(erc1155_proxy);
      const tokenURI = BASE_URI + tokenId;
      await expect(
        val.validateTest(addrs[0].address, {
          tokenId,
          tokenURI,
          amount: MINT_AMOUNT.toString(),
          minter: erc1271.address,
          royalties: [],
          signature: '0x',
        })
      ).revertedWith('signature verification error');

      await erc1271.setReturnSuccessfulValidSignature(true);
      await val.validateTest(addrs[0].address, {
        tokenId,
        tokenURI,
        amount: MINT_AMOUNT.toString(),
        minter: erc1271.address,
        royalties: [],
        signature: '0x',
      });
    });

    it('should work for mint and transfer with signature from proxy', async function () {
      const ERC1155_PROXY = await ethers.getContractFactory('ERC1155LazyMintTransferProxy');
      const erc1155_lazy_proxy = await ERC1155_PROXY.deploy();
      await erc1155_lazy_proxy.__OperatorRole_init();
      await erc1155_lazy_proxy.addOperator(erc1155_proxy.address);
      const tokenId = addrs[5].address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign1155(
        addrs[5].address,
        tokenId.toString(),
        tokenURI,
        MINT_AMOUNT.toString(),
        [],
        erc1155_proxy.address
      );
      const proxy = addrs[6];
      const tProxy = erc1155_proxy.connect(proxy);
      await testingAsSigner5.setApprovalForAll(proxy.address, true, {from: addrs[5].address});
      const result = tProxy.mintAndTransfer(
        {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: addrs[5].address, royalties: [], signature},
        addrs[1].address,
        2,
        {from: proxy.address}
      );
      await expect(result)
        .to.emit(erc1155_proxy, 'Minted')
        .withArgs(addrs[1].address, tokenId, tokenURI, 2)
        .to.emit(erc1155_proxy, 'TransferSingle')
        .withArgs(proxy.address, ZERO, addrs[5].address, tokenId, 2)
        .to.emit(erc1155_proxy, 'TransferSingle')
        .withArgs(proxy.address, addrs[5].address, addrs[1].address, tokenId, 2);
      expect(await erc1155_proxy.balanceOf(addrs[1].address, tokenId)).to.equal(2);

      // new regular transfer post mint should work
      await testingAsSigner1.safeTransferFrom(addrs[1].address, addrs[6].address, tokenId, 1, '0x', {
        from: addrs[1].address,
      });
      expect(await erc1155_proxy.balanceOf(addrs[6].address, tokenId)).to.equal(1);
    });

    it('should work for mint and transfer with signature from creator', async function () {
      const tokenId = addrs[5].address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      const signature = await EIP712.sign1155(
        addrs[5].address,
        tokenId.toString(),
        tokenURI,
        MINT_AMOUNT.toString(),
        [],
        val.address
      );
      await testingAsSigner5.mintAndTransfer(
        {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: addrs[5].address, royalties: [], signature},
        addrs[1].address,
        2,
        {from: addrs[5].address}
      );
      expect(await erc1155_proxy.balanceOf(addrs[1].address, tokenId)).to.equal(2);

      // new regular transfer post mint should work
      await testingAsSigner1.safeTransferFrom(addrs[1].address, addrs[6].address, tokenId, 1, '0x', {
        from: addrs[1].address,
      });
      expect(await erc1155_proxy.balanceOf(addrs[6].address, tokenId)).to.equal(1);
    });

    it('should work for transfer from or mint from minter. not yet minted', async () => {
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        transferTo.address,
        2,
        {from: minter.address}
      );
      expect(await erc1155_proxy.balanceOf(transferTo.address, tokenId)).to.equal(2);

      // new regular transfer post mint should work
      await testingAsSigner2.safeTransferFrom(addrs[2].address, addrs[6].address, tokenId, 1, '0x', {
        from: addrs[2].address,
      });
      expect(await erc1155_proxy.balanceOf(addrs[6].address, tokenId)).to.equal(1);
    });

    it('should work for transfer from or mint from minter. already minted', async () => {
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await testingAsSigner1.mintAndTransfer(
        {tokenId, tokenURI, amount: 15, minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        2,
        {from: minter.address}
      );
      expect(await erc1155_proxy.balanceOf(minter.address, tokenId)).to.equal(2);
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        transferTo.address,
        8,
        {from: minter.address}
      );
      expect(await erc1155_proxy.balanceOf(minter.address, tokenId)).to.equal(0);
      expect(await erc1155_proxy.balanceOf(transferTo.address, tokenId)).to.equal(8);
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        transferTo.address,
        7,
        {from: minter.address}
      );
      expect(await erc1155_proxy.balanceOf(minter.address, tokenId)).to.equal(0);
      expect(await erc1155_proxy.balanceOf(transferTo.address, tokenId)).to.equal(15);
    });

    it('should work for transfer from or mint when not minter. not yet minted', async () => {
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      await expect(
        testingAsSigner2.transferFromOrMint(
          {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: minter.address, royalties: [], signature: '0x'},
          transferTo.address,
          addrs[5].address,
          MINT_AMOUNT.toString(),
          {from: transferTo.address}
        )
      ).revertedWith('wrong order maker');
      await testingAsSigner1.transferFromOrMint(
        {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: minter.address, royalties: [], signature: '0x'},
        minter.address,
        transferTo.address,
        MINT_AMOUNT.toString(),
        {from: minter.address}
      );
      await testingAsSigner2.transferFromOrMint(
        {tokenId, tokenURI, amount: MINT_AMOUNT.toString(), minter: minter.address, royalties: [], signature: '0x'},
        transferTo.address,
        addrs[5].address,
        MINT_AMOUNT.toString(),
        {from: transferTo.address}
      );
      expect(await erc1155_proxy.balanceOf(addrs[5].address, tokenId)).to.equal(2);
    });

    it('should work for burn then mint then burn then mint', async () => {
      const minter = addrs[1];
      const transferTo = addrs[2];
      const tokenId = minter.address + 'b00000000000000000000001';
      const tokenURI = BASE_URI + tokenId;
      const mintAmount = 5;
      const burnAmount = 2;
      const result = testingAsSigner1.burn(minter.address, tokenId, burnAmount); // -2
      await expect(result).to.emit(erc1155_proxy, 'BurnLazy').withArgs(minter.address, minter.address, tokenId, 2);
      await testingAsSigner1.mintAndTransfer(
        {tokenId, tokenURI, amount: mintAmount.toString(), minter: minter.address, royalties: [], signature: '0x'},
        transferTo.address,
        2,
        {from: minter.address}
      ); // +3
      expect(await erc1155_proxy.balanceOf(transferTo.address, tokenId)).to.equal(2);
      await testingAsSigner2.burn(transferTo.address, tokenId, 1, {from: transferTo.address}); // +2
      await testingAsSigner2.burn(transferTo.address, tokenId, 1, {from: transferTo.address}); // +1
      const signature = await EIP712.sign1155(
        minter.address,
        tokenId,
        tokenURI,
        mintAmount.toString(),
        [],
        erc1155_proxy.address
      );
      const proxy = addrs[6];
      const tProxy = erc1155_proxy.connect(proxy);
      await testingAsSigner1.setApprovalForAll(proxy.address, true, {from: minter.address});
      await expect(
        tProxy.mintAndTransfer(
          {tokenId, tokenURI, amount: mintAmount.toString(), minter: minter.address, royalties: [], signature},
          addrs[1].address,
          2,
          {from: proxy.address}
        )
      ).revertedWith('more than supply');
      await tProxy.mintAndTransfer(
        {tokenId, tokenURI, amount: mintAmount.toString(), minter: minter.address, royalties: [], signature},
        addrs[1].address,
        1,
        {from: proxy.address}
      );
      await testingAsSigner1.burn(minter.address, tokenId, 1, {from: minter.address});
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
          amount: MINT_AMOUNT.toString(),
          minter: minter.address,
          royalties: [{recipient: addrs[2].address, value: royaltyValue}],
          signature: '0x',
        },
        minter.address,
        transferTo.address,
        MINT_AMOUNT.toString(),
        {from: minter.address}
      );
      const royalties = await erc1155_proxy.getRoyalties(tokenId);
      expect(royalties.length).to.equal(1);
      expectEqualStringValues(royalties[0].recipient, addrs[2].address);
      expectEqualStringValues(royalties[0].value, royaltyValue);
    });
  });

  describe('locked content', function () {
    const MINT_AMOUNT = ethers.BigNumber.from(1);
    const hiddencontent = 'top secret';
    it('should set and get locked content for nft', async function () {
      await erc1155_proxy.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', hiddencontent);
      const tokenId = await getLastTokenID(erc1155_proxy);

      const result = testingAsSigner1.getLockedContent(tokenId, {from: addrs[1].address});
      await expect(result)
        .to.emit(erc1155_proxy, 'LockedContentViewed')
        .withArgs(addrs[1].address, tokenId, hiddencontent);
    });

    it('should revert if other than owner tries to get locked content', async function () {
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', hiddencontent);
      const tokenId = await getLastTokenID(erc1155_proxy);
      //caller is the minter
      await erc1155_proxy.getLockedContent(tokenId);
      await expect(testingAsSigner3.getLockedContent(tokenId, {from: addrs[3].address})).revertedWith(
        'Caller must be the owner of the NFT'
      );
    });

    it('should revert if lock content is too long', async function () {
      const hiddenLongcontent =
        'top secret top secret top secret top secret top secret top secret top secret top secret top secret top top secret top secret top secret top secret top secret top secret top secret top secret top secret top'; // 205 bytes
      await expect(
        erc1155_proxy.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', hiddenLongcontent)
      ).revertedWith('Lock content bytes length should be < 200');
    });

    it('should increment locked content view count', async function () {
      const hiddencontent = 'top secret';
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', hiddencontent);
      const tokenId = await getLastTokenID(erc1155_proxy);
      const currentCounter = await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId);
      // call two times the getLockedContent function, counter should increment by 2
      await erc1155_proxy.getLockedContent(tokenId);
      await erc1155_proxy.getLockedContent(tokenId);
      expectEqualStringValues(await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId), currentCounter.add(2));
      //another NFT
      await testingAsSigner1.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', 'top secret2');
      const tokenId2 = await getLastTokenID(erc1155_proxy);
      const currentCounter2 = await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId2);

      await testingAsSigner1.getLockedContent(tokenId2, {from: addrs[1].address});
      expectEqualStringValues(await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId2), currentCounter2.add(1));
    });
  });

  function expectEqualStringValues(value1: BigNumber | number | string, value2: BigNumber | number | string) {
    expect(value1.toString()).to.equal(value2.toString());
  }

  async function getLastTokenID(token: GhostMarketERC1155): Promise<BigNumber> {
    const counter = await token.getCurrentCounter();
    if (ethers.BigNumber.from(counter).eq(ethers.BigNumber.from(0))) {
      return ethers.BigNumber.from(counter);
    } else return ethers.BigNumber.from(counter).sub(1);
  }
});
