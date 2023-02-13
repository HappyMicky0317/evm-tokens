import {expect} from '../test/utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketToken} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {TOKEN_NAME} from '../test/utils/constants';

describe('GhostMarket Token Test', function () {
  const TOKEN_SYMBOL = 'GM';
  const TOKEN_DECIMALS = '8';
  const TOKEN_SUPPLY = '10000000000000000';
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let gm_proxy: GhostMarketToken;

  beforeEach(async function () {
    const GM = await ethers.getContractFactory('GhostMarketToken');
    [owner, ...addrs] = await ethers.getSigners();
    gm_proxy = <GhostMarketToken>(
      await upgrades.deployProxy(GM, [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_SUPPLY, TOKEN_DECIMALS])
    );
    await gm_proxy.deployed();
  });

  it('should have name ' + TOKEN_NAME, async function () {
    expect((await gm_proxy.name()).toString()).to.equal(TOKEN_NAME);
  });

  it('should have symbol ' + TOKEN_SYMBOL, async function () {
    expect((await gm_proxy.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should have decimals ' + TOKEN_DECIMALS, async function () {
    expect((await gm_proxy.decimals()).toString()).to.equal(TOKEN_DECIMALS);
  });

  it('should have total supply ' + TOKEN_SUPPLY, async function () {
    expect((await gm_proxy.decimals()).toString()).to.equal(TOKEN_DECIMALS);
  });

  it('should be able to transfer ownership of contract', async function () {
    await gm_proxy.transferOwnership(addrs[1].address);
    expect(await gm_proxy.owner()).to.equal(addrs[1].address);
  });

  it('should be able to upgrade contract', async function () {
    const newTokenProxy = await ethers.getContractFactory('GhostMarketToken');
    const upgraded_token_proxy: GhostMarketToken = <GhostMarketToken>(
      await upgrades.upgradeProxy(gm_proxy.address, newTokenProxy)
    );
    expect(await upgraded_token_proxy.owner()).to.equal(owner.address);
    expect(upgraded_token_proxy.address).to.equal(gm_proxy.address);
  });

  it('should be able to pause/unpause contract', async () => {
    let paused = await gm_proxy.paused();
    expect(paused).to.equal(false);
    await gm_proxy.pause();
    paused = await gm_proxy.paused();
    expect(paused).to.equal(true);
    await gm_proxy.unpause();
    paused = await gm_proxy.paused();
    expect(paused).to.equal(false);
  });

  describe('ERC20 methods', function () {
    it('should have full balance on owner after deploy', async () => {
      const ownerBalance = await gm_proxy.balanceOf(owner.address);
      expect(ownerBalance).to.equal('10000000000000000');
    });

    it('should be able to transfer tokens to another wallet', async () => {
      await gm_proxy.transfer(addrs[1].address, 1000);
      const balance = await gm_proxy.balanceOf(addrs[1].address);
      expect(balance).to.equal(1000);
      await expect(gm_proxy.transfer(addrs[3].address, '9999999999999999999999999')).to.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('should support approve/allowance/transferFrom', async () => {
      await gm_proxy.approve(addrs[2].address, 2000);
      const allowance = await gm_proxy.allowance(owner.address, addrs[2].address);
      expect(allowance).to.equal(2000);
      const testingAsSigner1 = gm_proxy.connect(addrs[2]);
      await testingAsSigner1.transferFrom(owner.address, addrs[2].address, 2000);
      const balance = await gm_proxy.balanceOf(addrs[2].address);
      expect(balance).to.equal(2000);
      await expect(gm_proxy.transferFrom(owner.address, addrs[2].address, 2000)).to.revertedWith(
        'ERC20: insufficient allowance'
      );
    });
  });
});
