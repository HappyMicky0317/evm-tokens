import {expect} from '../test/utils/chai-setup';
import {ethers} from 'hardhat';
import {
  ERC721LazyMintTest,
  ERC1155LazyMintTest,
  ERC721LazyMintTransferProxy,
  ERC1155LazyMintTransferProxy,
} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Asset} from '../test/utils/order';
import {ERC1155_LAZY, ERC721_LAZY} from '../test/utils/assets';

describe('LazyMint Proxies Test', function () {
  let erc721_lazy: ERC721LazyMintTest;
  let erc1155_lazy: ERC1155LazyMintTest;
  let erc721_lazy_proxy: ERC721LazyMintTransferProxy;
  let erc1155_lazy_proxy: ERC1155LazyMintTransferProxy;
  let addrs: SignerWithAddress[];
  let testingAsSigner1: ERC721LazyMintTransferProxy;
  let testingAsSigner4: ERC721LazyMintTransferProxy;
  let testingAsSigner11: ERC1155LazyMintTransferProxy;
  let testingAsSigner44: ERC1155LazyMintTransferProxy;

  beforeEach('Deploy Contracts', async () => {
    const ERC721 = await ethers.getContractFactory('ERC721LazyMintTest');
    const ERC1155 = await ethers.getContractFactory('ERC1155LazyMintTest');
    const ERC721_PROXY = await ethers.getContractFactory('ERC721LazyMintTransferProxy');
    const ERC1155_PROXY = await ethers.getContractFactory('ERC1155LazyMintTransferProxy');
    [...addrs] = await ethers.getSigners();
    erc721_lazy_proxy = await ERC721_PROXY.deploy();
    await erc721_lazy_proxy.__OperatorRole_init();
    await erc721_lazy_proxy.addOperator(addrs[1].address);
    erc1155_lazy_proxy = await ERC1155_PROXY.deploy();
    await erc1155_lazy_proxy.__OperatorRole_init();
    await erc1155_lazy_proxy.addOperator(addrs[1].address);
    erc721_lazy = await ERC721.deploy();
    erc1155_lazy = await ERC1155.deploy();
    testingAsSigner1 = erc721_lazy_proxy.connect(addrs[1]);
    testingAsSigner4 = erc721_lazy_proxy.connect(addrs[4]);
    testingAsSigner11 = erc1155_lazy_proxy.connect(addrs[1]);
    testingAsSigner44 = erc1155_lazy_proxy.connect(addrs[4]);
  });

  it('lazy mint proxyTransfer works for ERC-721', async () => {
    const encodedMintData = await erc721_lazy.encode({
      tokenId: '1',
      tokenURI: 'uri',
      minter: addrs[1].address,
      royalties: [],
      signature: '0x',
    });
    //transfer by ERC721LazyMintTransferProxy.transfer
    await testingAsSigner1.transfer(Asset(ERC721_LAZY, encodedMintData, '1'), addrs[1].address, addrs[2].address, {
      from: addrs[1].address,
    });
    //check owner token after transfer
    expect(await erc721_lazy.ownerOf(1), addrs[2].address);
  });
  it('lazy mint proxyTransfer works for ERC-721, wrong operator, throw', async () => {
    const encodedMintData = await erc721_lazy.encode({
      tokenId: '1',
      tokenURI: 'uri',
      minter: addrs[1].address,
      royalties: [],
      signature: '0x',
    });
    //transfer by ERC721LazyMintTransferProxy.transfer
    await expect(
      testingAsSigner4.transfer(Asset(ERC721_LAZY, encodedMintData, '1'), addrs[1].address, addrs[2].address, {
        from: addrs[4].address,
      })
    ).revertedWith('OperatorRole: caller is not the operator');
  });

  it('lazy mint proxyTransfer works for ERC-1155', async () => {
    const encodedMintData = await erc1155_lazy.encode({
      tokenId: '1',
      tokenURI: 'uri',
      amount: 10,
      minter: addrs[1].address,
      royalties: [],
      signature: '0x',
    });
    //transfer by ERC1155LazyMintTransferProxy.transfer
    await testingAsSigner11.transfer(Asset(ERC1155_LAZY, encodedMintData, '5'), addrs[1].address, addrs[2].address, {
      from: addrs[1].address,
    });
    //check owner token after transfer
    expect(await erc1155_lazy.balanceOf(addrs[2].address, 1)).to.eq(5);
  });

  it('lazy mint proxyTransfer works for ERC-1155, wrong operator, throw', async () => {
    const encodedMintData = await erc1155_lazy.encode({
      tokenId: '1',
      tokenURI: 'uri',
      amount: 10,
      minter: addrs[1].address,
      royalties: [],
      signature: '0x',
    });
    //transfer by ERC721LazyMintTransferProxy.transfer
    await expect(
      testingAsSigner44.transfer(Asset(ERC1155_LAZY, encodedMintData, '5'), addrs[1].address, addrs[2].address, {
        from: addrs[4].address,
      })
    ).revertedWith('OperatorRole: caller is not the operator');
  });
});
