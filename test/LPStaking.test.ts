import {expect} from '../test/utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketToken, StakingPoolForDexTokens} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {TOKEN_NAME} from '../test/utils/constants';

describe('LP Staking Test', function () {
  const TOKEN_SYMBOL = 'GM';
  const TOKEN_DECIMALS = '8';
  const TOKEN_SUPPLY = '10000000000000000';
  const BLOCKS_PER_DAY = 43200;
  const START_BLOCK = 1;
  const TOTAL_REWARDS = 500000; // 500k per pool
  const DURATION = 90; // 90 days
  const DECIMALS = 10 ** 8; // gm decimals
  const REWARDS_PER_BLOCK = parseInt(((TOTAL_REWARDS / DURATION / BLOCKS_PER_DAY) * DECIMALS).toString());
  const END_BLOCK = START_BLOCK + DURATION * BLOCKS_PER_DAY;
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let gm_rewards_proxy: GhostMarketToken;
  let gm_stakes_proxy: GhostMarketToken;
  let lp_staking_proxy: StakingPoolForDexTokens;
  let testingAsSigner1: StakingPoolForDexTokens;
  let testingAsSigner11: GhostMarketToken;

  beforeEach(async function () {
    const GM = await ethers.getContractFactory('GhostMarketToken');
    const LP = await ethers.getContractFactory('StakingPoolForDexTokens');
    [owner, ...addrs] = await ethers.getSigners();
    gm_rewards_proxy = <GhostMarketToken>(
      await upgrades.deployProxy(GM, [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_SUPPLY, TOKEN_DECIMALS])
    );
    await gm_rewards_proxy.deployed();
    gm_stakes_proxy = <GhostMarketToken>(
      await upgrades.deployProxy(GM, [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_SUPPLY, TOKEN_DECIMALS])
    );
    await gm_rewards_proxy.deployed();
    lp_staking_proxy = <StakingPoolForDexTokens>(
      await upgrades.deployProxy(LP, [
        gm_stakes_proxy.address,
        gm_rewards_proxy.address,
        REWARDS_PER_BLOCK,
        START_BLOCK,
        END_BLOCK,
      ])
    );
    await lp_staking_proxy.deployed();
    testingAsSigner1 = lp_staking_proxy.connect(addrs[1]);
    testingAsSigner11 = gm_stakes_proxy.connect(addrs[1]);
  });

  it('should have START_BLOCK ' + START_BLOCK, async function () {
    expect(await lp_staking_proxy.startBlock()).to.equal(START_BLOCK);
  });

  it('should have END_BLOCK ' + END_BLOCK, async function () {
    expect(await lp_staking_proxy.endBlock()).to.equal(END_BLOCK);
  });

  it('should have initial lastRewardBlock = 0', async function () {
    expect(await lp_staking_proxy.lastRewardBlock()).to.equal(0);
  });

  it('should have REWARDS_PER_BLOCK ' + REWARDS_PER_BLOCK, async function () {
    expect(await lp_staking_proxy.rewardPerBlock()).to.equal(REWARDS_PER_BLOCK);
  });

  it('should have correct staked token set', async function () {
    expect(await lp_staking_proxy.stakedToken()).to.equal(gm_stakes_proxy.address);
  });

  it('should have correct reward token set', async function () {
    expect(await lp_staking_proxy.ghostMarketToken()).to.equal(gm_rewards_proxy.address);
  });

  it('should be able to transfer ownership of contract', async function () {
    await lp_staking_proxy.transferOwnership(addrs[1].address);
    expect(await lp_staking_proxy.owner()).to.equal(addrs[1].address);
  });

  it('should be able to upgrade contract', async function () {
    const newTokenProxy = await ethers.getContractFactory('StakingPoolForDexTokens');
    const upgraded_token_proxy: StakingPoolForDexTokens = <StakingPoolForDexTokens>(
      await upgrades.upgradeProxy(lp_staking_proxy.address, newTokenProxy)
    );
    expect(await upgraded_token_proxy.owner()).to.equal(owner.address);
    expect(upgraded_token_proxy.address).to.equal(lp_staking_proxy.address);
  });

  it('should be able to pause/unpause contract', async () => {
    let paused = await lp_staking_proxy.paused();
    expect(paused).to.equal(false);
    await lp_staking_proxy.pause();
    paused = await lp_staking_proxy.paused();
    expect(paused).to.equal(true);
    await lp_staking_proxy.unpause();
    paused = await lp_staking_proxy.paused();
    expect(paused).to.equal(false);
  });

  describe('Admin methods', function () {
    it('should be able to admin deposit / withdraw rewards', async () => {
      // set allowance
      await gm_rewards_proxy.approve(lp_staking_proxy.address, TOTAL_REWARDS * DECIMALS);
      const allowance = await gm_rewards_proxy.allowance(owner.address, lp_staking_proxy.address);
      expect(allowance).to.equal(TOTAL_REWARDS * DECIMALS);

      // deposit rewards
      const receipt = lp_staking_proxy.adminRewardDeposit(1000);
      await expect(receipt).to.emit(lp_staking_proxy, 'AdminRewardDeposit').withArgs(1000);

      // try withdraw more than available
      await expect(lp_staking_proxy.adminRewardWithdraw(20000)).to.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );

      // withdraw rewards
      const receipt2 = lp_staking_proxy.adminRewardWithdraw(500);
      await expect(receipt2).to.emit(lp_staking_proxy, 'AdminRewardWithdraw').withArgs(500);
    });

    it('should be able to update reward per block and end block', async () => {
      // try update with block < current
      await expect(lp_staking_proxy.updateRewardPerBlockAndEndBlock(REWARDS_PER_BLOCK, 10)).to.revertedWith(
        'Owner: New endBlock must be after current block'
      );

      // update rewards details
      const receipt2 = lp_staking_proxy.updateRewardPerBlockAndEndBlock(REWARDS_PER_BLOCK * 2, END_BLOCK * 2);
      await expect(receipt2)
        .to.emit(lp_staking_proxy, 'NewRewardPerBlockAndEndBlock')
        .withArgs(REWARDS_PER_BLOCK * 2, END_BLOCK * 2);
    });
  });

  describe('Stake/Unstake lp token methods', function () {
    it('should be able to deposit/withdraw lp tokens', async () => {
      // set allowance
      await testingAsSigner11.approve(lp_staking_proxy.address, 10000, {from: addrs[1].address});
      const allowance = await gm_stakes_proxy.allowance(addrs[1].address, lp_staking_proxy.address);
      expect(allowance).to.equal(10000);

      // try deposit more than balance
      await expect(testingAsSigner1.deposit(1000, {from: addrs[1].address})).to.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );

      // set up admin rewards
      await gm_rewards_proxy.approve(lp_staking_proxy.address, TOTAL_REWARDS * DECIMALS);
      await lp_staking_proxy.adminRewardDeposit(TOTAL_REWARDS * DECIMALS);

      // deposit lp tokens
      await gm_stakes_proxy.transfer(addrs[1].address, 1000);
      const receipt = testingAsSigner1.deposit(1000, {from: addrs[1].address});
      await expect(receipt).to.emit(lp_staking_proxy, 'Deposit').withArgs(addrs[1].address, 1000, 0);

      // mine new block
      await ethers.provider.send('evm_increaseTime', [1000]);
      await ethers.provider.send('evm_mine', []);

      // try withdraw more than balance
      await expect(testingAsSigner1.withdraw(2000, {from: addrs[1].address})).to.revertedWith(
        'Withdraw: Amount must be > 0 or lower than user balance'
      );

      // calculate pending rewards
      const lastBlock = (await ethers.provider.getBlock('latest')).number;
      const lastBlockRewards = await lp_staking_proxy.lastRewardBlock();
      const blockDiff = ethers.BigNumber.from(lastBlock).sub(ethers.BigNumber.from(lastBlockRewards)).add(1).toNumber();
      const tokenReward = blockDiff * REWARDS_PER_BLOCK;
      const userInfo = await lp_staking_proxy.userInfo(addrs[1].address);
      const PRECISION_FACTOR = await lp_staking_proxy.PRECISION_FACTOR();
      const stakedTokenSupply = await gm_stakes_proxy.balanceOf(lp_staking_proxy.address);
      const accTokenPerShare = await lp_staking_proxy.accTokenPerShare();
      const adjustedTokenPerShare = accTokenPerShare
        .add(ethers.BigNumber.from(tokenReward).mul(PRECISION_FACTOR))
        .div(stakedTokenSupply);
      const pendingRewards = ethers.BigNumber.from(userInfo.amount)
        .mul(ethers.BigNumber.from(adjustedTokenPerShare))
        .div(ethers.BigNumber.from(PRECISION_FACTOR))
        .sub(ethers.BigNumber.from(userInfo.rewardDebt));

      // withdraw lp tokens
      const receipt2 = testingAsSigner1.withdraw(500, {from: addrs[1].address});
      await expect(receipt2).to.emit(lp_staking_proxy, 'Withdraw').withArgs(addrs[1].address, 500, pendingRewards);

      // try emergency withdraw if unpaused
      await expect(lp_staking_proxy.emergencyWithdraw()).to.revertedWith('Pausable: not paused');

      // emergency withdraw
      await lp_staking_proxy.pause();
      const balance = (await lp_staking_proxy.userInfo(addrs[1].address)).amount;
      const receipt3 = testingAsSigner1.emergencyWithdraw();
      await expect(receipt3).to.emit(lp_staking_proxy, 'EmergencyWithdraw').withArgs(addrs[1].address, balance);
    });
  });

  describe('Claim rewards methods', function () {
    it('should be able to query/claim pending rewards', async () => {
      // set allowance
      await testingAsSigner11.approve(lp_staking_proxy.address, 10000, {from: addrs[1].address});
      const allowance = await gm_stakes_proxy.allowance(addrs[1].address, lp_staking_proxy.address);
      expect(allowance).to.equal(10000);

      // try deposit more than balance
      await expect(testingAsSigner1.deposit(1000, {from: addrs[1].address})).to.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );

      // set up admin rewards
      await gm_rewards_proxy.approve(lp_staking_proxy.address, TOTAL_REWARDS * DECIMALS);
      await lp_staking_proxy.adminRewardDeposit(TOTAL_REWARDS * DECIMALS);

      // deposit lp tokens
      await gm_stakes_proxy.transfer(addrs[1].address, 1000);
      const receipt = testingAsSigner1.deposit(1000, {from: addrs[1].address});
      await expect(receipt).to.emit(lp_staking_proxy, 'Deposit').withArgs(addrs[1].address, 1000, 0);

      // mine new block
      await ethers.provider.send('evm_increaseTime', [1000]);
      await ethers.provider.send('evm_mine', []);

      // try withdraw more than balance
      await expect(testingAsSigner1.withdraw(2000, {from: addrs[1].address})).to.revertedWith(
        'Withdraw: Amount must be > 0 or lower than user balance'
      );

      // calculate pending rewards
      const lastBlock = (await ethers.provider.getBlock('latest')).number;
      const lastBlockRewards = await lp_staking_proxy.lastRewardBlock();
      const blockDiff = ethers.BigNumber.from(lastBlock).sub(ethers.BigNumber.from(lastBlockRewards)).add(1).toNumber();
      const tokenReward = blockDiff * REWARDS_PER_BLOCK;
      const userInfo = await lp_staking_proxy.userInfo(addrs[1].address);
      const PRECISION_FACTOR = await lp_staking_proxy.PRECISION_FACTOR();
      const stakedTokenSupply = await gm_stakes_proxy.balanceOf(lp_staking_proxy.address);
      const accTokenPerShare = await lp_staking_proxy.accTokenPerShare();
      const adjustedTokenPerShare = accTokenPerShare
        .add(ethers.BigNumber.from(tokenReward).mul(PRECISION_FACTOR))
        .div(stakedTokenSupply);
      const pendingRewards = ethers.BigNumber.from(userInfo.amount)
        .mul(ethers.BigNumber.from(adjustedTokenPerShare))
        .div(ethers.BigNumber.from(PRECISION_FACTOR))
        .sub(ethers.BigNumber.from(userInfo.rewardDebt));

      // claim rewards
      const receipt2 = testingAsSigner1.harvest();
      await expect(receipt2).to.emit(lp_staking_proxy, 'Harvest').withArgs(addrs[1].address, pendingRewards);
    });
  });
});
