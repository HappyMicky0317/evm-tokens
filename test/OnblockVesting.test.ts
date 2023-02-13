import {expect} from '../test/utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketToken, DeflationaryTokenTest, OnBlockVesting} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ZERO} from '../test/utils/assets';
import {TOKEN_NAME} from '../test/utils/constants';

describe('OnBlock Vesting Test', function () {
  const TOKEN_SYMBOL = 'GM';
  const TOKEN_DECIMALS = '8';
  const TOKEN_SUPPLY = '10000000000000000';
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let gm_proxy: GhostMarketToken;
  let dft_proxy: DeflationaryTokenTest;
  let obv: OnBlockVesting;
  let testingAsSigner1: OnBlockVesting;
  let testingAsSigner2: OnBlockVesting;
  let testingAsSigner3: OnBlockVesting;
  let testingAsSigner5: OnBlockVesting;

  before('Deploy Contracts', async () => {
    const GM = await ethers.getContractFactory('GhostMarketToken');
    const DFT = await ethers.getContractFactory('DeflationaryTokenTest');
    const OBV = await ethers.getContractFactory('OnBlockVesting');
    [owner, ...addrs] = await ethers.getSigners();
    gm_proxy = <GhostMarketToken>(
      await upgrades.deployProxy(GM, [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_SUPPLY, TOKEN_DECIMALS])
    );
    await gm_proxy.deployed();
    dft_proxy = <DeflationaryTokenTest>(
      await upgrades.deployProxy(DFT, ['DeflationaryTokenTest', 'DFT', TOKEN_SUPPLY, TOKEN_DECIMALS])
    );
    await dft_proxy.deployed();
    obv = <OnBlockVesting>await OBV.deploy('1000000000000000', addrs.map((x) => x.address).slice(0, 4));
    await obv.deployed();
    testingAsSigner1 = obv.connect(addrs[1]);
    testingAsSigner2 = obv.connect(addrs[2]);
    testingAsSigner3 = obv.connect(addrs[3]);
    testingAsSigner5 = obv.connect(addrs[5]);
  });

  /*beforeEach(async function () {
  })*/

  describe('Votes', function () {
    it('should have 4 voters', async () => {
      for (let i = 0; i < 4; ++i) {
        const success = await obv.isVoter(addrs[i].address);
        expect(success).to.equal(true);
      }
    });
  });

  describe('Vaults', function () {
    it('should match vault fee', async () => {
      const fee = await obv.getVaultFee();
      expect(fee).to.equal('1000000000000000');
    });

    it('should fail, because is not voter', async () => {
      await expect(
        testingAsSigner5.setVaultFee(ethers.BigNumber.from('2000000000'), {from: addrs[5].address})
      ).to.revertedWith('Sender is not an active voter');
      const fee = await obv.getVaultFee();
      expect(fee).to.equal('1000000000000000');
    });

    it('should fail without vote', async () => {
      await expect(
        testingAsSigner2.setVaultFee(ethers.BigNumber.from('9999'), {from: addrs[2].address})
      ).to.revertedWith('Vote was not successful yet');
      const fee = await obv.getVaultFee();
      expect(fee).to.equal('1000000000000000');
    });

    it('should fail, because fee to high', async () => {
      await expect(
        testingAsSigner2.setVaultFee(ethers.BigNumber.from('9000000000000000000'), {from: addrs[2].address})
      ).to.revertedWith('Vault fee is too high');
      const fee = await obv.getVaultFee();
      expect(fee).to.equal('1000000000000000');
    });

    it('should create new fee update vote', async () => {
      const receipt = testingAsSigner1.requestVote(
        ethers.BigNumber.from('3'),
        ZERO,
        ethers.BigNumber.from('20000000'),
        {from: addrs[1].address}
      );
      await expect(receipt)
        .to.emit(obv, 'VoteRequested')
        .withArgs(addrs[1].address, ZERO, ethers.BigNumber.from('20000000'), ethers.BigNumber.from('3'));
    });

    it('should vote on new fee update vote and finish', async () => {
      const createReceipt = testingAsSigner1.requestVote(
        ethers.BigNumber.from('3'),
        ZERO,
        ethers.BigNumber.from('20000000'),
        {from: addrs[1].address}
      );
      await expect(createReceipt)
        .to.emit(obv, 'VoteRequested')
        .withArgs(addrs[1].address, ZERO, ethers.BigNumber.from('20000000'), ethers.BigNumber.from('3'));

      const voteReceipt = testingAsSigner2.vote(
        ethers.BigNumber.from('3'),
        addrs[1].address,
        ZERO,
        ethers.BigNumber.from('20000000'),
        {from: addrs[2].address}
      );
      await expect(voteReceipt)
        .to.emit(obv, 'Voted')
        .withArgs(addrs[2].address, ZERO, ZERO, ethers.BigNumber.from('20000000'), ethers.BigNumber.from('3'));

      const voteStateReceipt = testingAsSigner1.isVoteDone(
        ethers.BigNumber.from('3'),
        ZERO,
        ethers.BigNumber.from('20000000'),
        {from: addrs[1].address}
      );
      await expect(voteStateReceipt)
        .to.emit(obv, 'VoteState')
        .withArgs(
          addrs[1].address,
          ZERO,
          ethers.BigNumber.from('20000000'),
          ethers.BigNumber.from('2'),
          ethers.BigNumber.from('3'),
          ethers.BigNumber.from('3')
        );

      const voteState = await testingAsSigner1.isVoteDone(
        ethers.BigNumber.from('3'),
        ZERO,
        ethers.BigNumber.from('20000000'),
        {from: addrs[1].address}
      );
      expect(voteState.value.toString()).to.equal('0');

      const voteReceipt2 = testingAsSigner3.vote(
        ethers.BigNumber.from('3'),
        addrs[1].address,
        ZERO,
        ethers.BigNumber.from('20000000'),
        {from: addrs[3].address}
      );
      await expect(voteReceipt2)
        .to.emit(obv, 'Voted')
        .withArgs(addrs[3].address, ZERO, ZERO, ethers.BigNumber.from('20000000'), ethers.BigNumber.from('3'));

      const voteStateFinal = await testingAsSigner1.isVoteDone(
        ethers.BigNumber.from('3'),
        ZERO,
        ethers.BigNumber.from('20000000'),
        {from: addrs[1].address}
      );
      expect(voteStateFinal.value.toString()).to.equal('0');

      // vote concluded set new fee now, but be sneaky, try to set a different fee
      await expect(
        testingAsSigner2.setVaultFee(ethers.BigNumber.from('9999'), {from: addrs[2].address})
      ).to.revertedWith('Vote was not successful yet');

      // ok let's be serious now
      const setFeeReceipt = testingAsSigner2.setVaultFee(ethers.BigNumber.from('20000000'), {from: addrs[2].address});
      await expect(setFeeReceipt)
        .to.emit(obv, 'FeeUpdated')
        .withArgs(addrs[2].address, ethers.BigNumber.from('20000000'));
    });

    it('should create new withdraw vote', async () => {
      const receipt = testingAsSigner1.requestVote(
        ethers.BigNumber.from('0'),
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[1].address}
      );
      await expect(receipt)
        .to.emit(obv, 'VoteRequested')
        .withArgs(addrs[1].address, addrs[5].address, ethers.BigNumber.from('0'), ethers.BigNumber.from('0'));
    });

    it('should vote on new withdraw vote and finish', async () => {
      const createReceipt = testingAsSigner1.requestVote(
        ethers.BigNumber.from('0'),
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[1].address}
      );
      await expect(createReceipt)
        .to.emit(obv, 'VoteRequested')
        .withArgs(addrs[1].address, addrs[5].address, ethers.BigNumber.from('0'), ethers.BigNumber.from('0'));

      const voteReceipt = testingAsSigner2.vote(
        ethers.BigNumber.from('0'),
        addrs[1].address,
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[2].address}
      );
      await expect(voteReceipt)
        .to.emit(obv, 'Voted')
        .withArgs(
          addrs[2].address,
          addrs[5].address,
          addrs[5].address,
          ethers.BigNumber.from('0'),
          ethers.BigNumber.from('0')
        );

      const voteStateReceipt = testingAsSigner1.isVoteDone(
        ethers.BigNumber.from('0'),
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[1].address}
      );
      await expect(voteStateReceipt)
        .to.emit(obv, 'VoteState')
        .withArgs(
          addrs[1].address,
          addrs[5].address,
          ethers.BigNumber.from('0'),
          ethers.BigNumber.from('2'),
          ethers.BigNumber.from('3'),
          ethers.BigNumber.from('0')
        );

      const voteState = await testingAsSigner1.isVoteDone(
        ethers.BigNumber.from('0'),
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[1].address}
      );
      expect(voteState.value.toString()).to.equal('0');

      const voteReceipt2 = testingAsSigner3.vote(
        ethers.BigNumber.from('0'),
        addrs[1].address,
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[3].address}
      );
      await expect(voteReceipt2)
        .to.emit(obv, 'Voted')
        .withArgs(
          addrs[3].address,
          addrs[5].address,
          addrs[5].address,
          ethers.BigNumber.from('0'),
          ethers.BigNumber.from('0')
        );

      const voteStateReceipt2 = testingAsSigner1.isVoteDone(
        ethers.BigNumber.from('0'),
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[1].address}
      );
      await expect(voteStateReceipt2)
        .to.emit(obv, 'VoteState')
        .withArgs(
          addrs[1].address,
          addrs[5].address,
          ethers.BigNumber.from('0'),
          ethers.BigNumber.from('3'),
          ethers.BigNumber.from('3'),
          ethers.BigNumber.from('0')
        );

      const voteStateFinal = await testingAsSigner1.isVoteDone(
        ethers.BigNumber.from('0'),
        addrs[5].address,
        ethers.BigNumber.from('0'),
        {from: addrs[1].address}
      );
      expect(voteStateFinal.value.toString()).to.equal('0');
    });

    it('should create new vesting vault', async () => {
      const fee = await obv.getVaultFee();
      const receipt = obv.createVault(gm_proxy.address, {value: fee});
      await expect(receipt).to.emit(obv, 'VaultCreated').withArgs(ethers.BigNumber.from('1'), gm_proxy.address, fee);
    });

    it('should create new vesting vault for deflationary', async () => {
      const fee = await obv.getVaultFee();
      const receipt = obv.createVault(dft_proxy.address, {value: fee});
      await expect(receipt).to.emit(obv, 'VaultCreated').withArgs(ethers.BigNumber.from('2'), dft_proxy.address, fee);
    });

    it('should verify fee balance', async () => {
      const feeBalance = await obv.feeBalance();
      const vaults = await obv.getActiveVaults();
      const fee = (await obv.getVaultFee()).mul(ethers.BigNumber.from(vaults.length));
      expect(feeBalance).to.equal(fee);
    });

    it('should withdraw fee', async () => {
      const balanceBefore = await ethers.provider.getBalance(addrs[5].address);
      const feeBefore = await obv.feeBalance();
      const setFeeReceipt = testingAsSigner1.withdrawVaultFee(addrs[5].address);
      await expect(setFeeReceipt)
        .to.emit(obv, 'FeeWithdraw')
        .withArgs(addrs[1].address, addrs[5].address, ethers.BigNumber.from('40000000'));
      const feeAfter = await obv.feeBalance();
      expect(feeAfter).to.equal(0);
      const balanceAfter = await ethers.provider.getBalance(addrs[5].address);
      expect(balanceBefore.add(feeBefore)).to.equal(balanceAfter);
    });

    it('should revert because vault exists already', async () => {
      await expect(obv.createVault(gm_proxy.address)).to.revertedWith('Vault exists already');
    });
  });

  describe('Beneficiaries', function () {
    it('should fail adding beneficiary, deflationary token', async () => {
      const fee = await obv.getVaultFee();
      obv.createVault(dft_proxy.address, {value: fee});
      await dft_proxy.approve(obv.address, 100);
      const block = await ethers.provider.getBlock('latest');
      const time = block.timestamp + 10;

      await expect(
        obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
          dft_proxy.address,
          addrs[1].address,
          100,
          time,
          86400 * 100 /* 100 days */,
          0,
          1
        )
      ).to.revertedWith('Deflationary tokens are not supported!');
    });

    it('should fail adding beneficiary, no allowance', async () => {
      const block = await ethers.provider.getBlock('latest');
      const time = block.timestamp + 10;
      await expect(
        obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
          gm_proxy.address,
          addrs[1].address,
          100,
          time,
          86400 * 100 /* 100 days */,
          0,
          1
        )
      ).to.revertedWith('Token allowance check failed');
    });

    it('should add beneficiary, fixed', async () => {
      await gm_proxy.approve(obv.address, 100);
      const block = await ethers.provider.getBlock('latest');
      const time = block.timestamp + 10;
      const receipt = obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
        gm_proxy.address,
        addrs[1].address,
        100,
        time,
        1000 /* 1000 seconds */,
        0,
        0
      );
      await expect(receipt)
        .to.emit(obv, 'AddedBeneficiary')
        .withArgs(
          ethers.BigNumber.from('1'),
          addrs[1].address,
          ethers.BigNumber.from('100'),
          ethers.BigNumber.from(time),
          ethers.BigNumber.from(1000),
          ethers.BigNumber.from('0')
        );
    });

    it('should fail adding beneficiary, already exists', async () => {
      await gm_proxy.approve(obv.address, 100);
      const block = await ethers.provider.getBlock('latest');
      const time = block.timestamp + 10;
      await expect(
        obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
          gm_proxy.address,
          addrs[1].address,
          100,
          time,
          1000 /* 1000 seconds */,
          0,
          0
        )
      ).to.revertedWith('Beneficiary already exists');
    });

    it('should fail adding beneficiary, more than san. period', async () => {
      await gm_proxy.approve(obv.address, 100);
      const block = await ethers.provider.getBlock('latest');
      const time = block.timestamp + 10;
      await expect(
        obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
          gm_proxy.address,
          addrs[2].address,
          200,
          time,
          1000000000000 /* 1000000000000 seconds */,
          0,
          1
        )
      ).to.revertedWith('Use the overloaded function for lock time greater than 10 years');
    });

    it('should add beneficiary, linear', async () => {
      await gm_proxy.approve(obv.address, 200);
      await gm_proxy.allowance(addrs[0].address, obv.address);
      const block = await ethers.provider.getBlock('latest');
      const time = block.timestamp + 10;
      const receipt = obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
        gm_proxy.address,
        addrs[2].address,
        200,
        time,
        1000 /* 1000 seconds */,
        0,
        1
      );
      await expect(receipt)
        .to.emit(obv, 'AddedBeneficiary')
        .withArgs(
          ethers.BigNumber.from('1'),
          addrs[2].address,
          ethers.BigNumber.from('200'),
          ethers.BigNumber.from(time),
          ethers.BigNumber.from(1000),
          ethers.BigNumber.from('1')
        );
    });

    it('should match no releaseable amount, fixed', async () => {
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [1000]);
        await ethers.provider.send('evm_mine', []);
        const amount = await obv.releasableAmount(gm_proxy.address, addrs[1].address);
        expect(amount).to.equal(0);
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should match full releaseable amount, fixed', async () => {
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [1010]);
        await ethers.provider.send('evm_mine', []);
        const amount = await obv.releasableAmount(gm_proxy.address, addrs[1].address);
        expect(amount).to.equal(100);
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should match releaseable amount, linear', async () => {
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [1000]);
        await ethers.provider.send('evm_mine', []);
        const beneficiary = await obv.readBeneficiary(gm_proxy.address, addrs[2].address);
        const block = await ethers.provider.getBlock('latest');
        const calculatedAmount = Math.trunc(
          ethers.BigNumber.from(beneficiary.amount)
            .mul(ethers.BigNumber.from(block.timestamp).sub(ethers.BigNumber.from(beneficiary.startTime)))
            .div(ethers.BigNumber.from(beneficiary.duration))
            .toNumber()
        );
        const amount = await obv.releasableAmount(gm_proxy.address, addrs[2].address);
        expect(amount).to.equal(calculatedAmount);
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should match full releaseable amount, linear', async () => {
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [10000000000]);
        await ethers.provider.send('evm_mine', []);
        const beneficiary = await obv.readBeneficiary(gm_proxy.address, addrs[2].address);
        const amount = await obv.releasableAmount(gm_proxy.address, addrs[2].address);
        expect(amount).to.equal(beneficiary.amount);
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should add beneficiary with cliff, linear', async () => {
      await gm_proxy.approve(obv.address, 200);
      await gm_proxy.allowance(owner.address, obv.address);
      const block = await ethers.provider.getBlock('latest');
      const time = block.timestamp + 10;
      const receipt = obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
        gm_proxy.address,
        addrs[3].address,
        200,
        time,
        1000 /* 1000 seconds */,
        100,
        1
      );
      await expect(receipt)
        .to.emit(obv, 'AddedBeneficiary')
        .withArgs(
          ethers.BigNumber.from('1'),
          addrs[3].address,
          ethers.BigNumber.from('200'),
          ethers.BigNumber.from(time),
          ethers.BigNumber.from(1000),
          ethers.BigNumber.from('1')
        );
    });

    it('should match no releaseable amount, before cliff, linear', async () => {
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [99]);
        await ethers.provider.send('evm_mine', []);
        const amount = await obv.releasableAmount(gm_proxy.address, addrs[3].address);
        expect(amount).to.equal(0);
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should match releaseable amount, after cliff, linear', async () => {
      const beneficiary = await obv.readBeneficiary(gm_proxy.address, addrs[3].address);
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [110]); // 100s cliff & now + 10s = startTime = 110
        await ethers.provider.send('evm_mine', []);
        const block = await ethers.provider.getBlock('latest');
        const calculatedAmount = Math.trunc(
          ethers.BigNumber.from(beneficiary.amount)
            .mul(ethers.BigNumber.from(block.timestamp).sub(ethers.BigNumber.from(beneficiary.startTime)))
            .div(ethers.BigNumber.from(beneficiary.duration))
            .toNumber()
        );
        const amount = await obv.releasableAmount(gm_proxy.address, addrs[3].address);
        expect(amount).to.equal(calculatedAmount);
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });
  });

  describe('Release', function () {
    it('should release vested amount, fixed', async () => {
      const beneficiary = await obv.readBeneficiary(gm_proxy.address, addrs[1].address);
      const contractAmountBefore = await gm_proxy.balanceOf(obv.address);
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [1010]); // 100s cliff & now + 10s = startTime = 110
        await ethers.provider.send('evm_mine', []);
        const block = await ethers.provider.getBlock('latest');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const calculatedAmount = Math.trunc(
          ethers.BigNumber.from(beneficiary.amount)
            .mul(ethers.BigNumber.from(block.timestamp).sub(ethers.BigNumber.from(beneficiary.startTime)))
            .div(ethers.BigNumber.from(beneficiary.duration))
            .toNumber()
        );
        const receipt = obv.release(gm_proxy.address, addrs[1].address);
        await expect(receipt).to.emit(obv, 'Fulfilled');
        /*.withArgs(
            ethers.BigNumber.from('1'),
            addrs[1].address,
            ethers.BigNumber.from(calculatedAmount),
            ethers.BigNumber.from(calculatedAmount)
          );*/
        const amount = await gm_proxy.balanceOf(addrs[1].address);
        //  expect(amount).to.equal(calculatedAmount;
        const contractAmountAfter = await gm_proxy.balanceOf(obv.address);
        expect(contractAmountAfter).to.equal(ethers.BigNumber.from(contractAmountBefore).sub(amount));
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should release vested amount, linear', async () => {
      const beneficiary = await obv.readBeneficiary(gm_proxy.address, addrs[2].address);
      const contractAmountBefore = await gm_proxy.balanceOf(obv.address);
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [1000]);
        await ethers.provider.send('evm_mine', []);
        const block = await ethers.provider.getBlock('latest');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const calculatedAmount = Math.trunc(
          ethers.BigNumber.from(beneficiary.amount)
            .mul(ethers.BigNumber.from(block.timestamp).sub(ethers.BigNumber.from(beneficiary.startTime)))
            .div(ethers.BigNumber.from(beneficiary.duration))
            .toNumber()
        );
        const receipt = obv.release(gm_proxy.address, addrs[2].address);
        await expect(receipt).to.emit(obv, 'Release');
        /*.withArgs(
            ethers.BigNumber.from('1'),
            addrs[2].address,
            ethers.BigNumber.from(calculatedAmount),
            ethers.BigNumber.from(calculatedAmount)
          );*/
        const amount = await gm_proxy.balanceOf(addrs[2].address);
        // expect(amount).to.equal(calculatedAmount);
        const contractAmountAfter = await gm_proxy.balanceOf(obv.address);
        expect(contractAmountAfter).to.equal(ethers.BigNumber.from(contractAmountBefore).sub(amount));
        // advance time again
        await ethers.provider.send('evm_increaseTime', [1000]);
        await ethers.provider.send('evm_mine', []);
        const releaseable = await obv.releasableAmount(gm_proxy.address, addrs[2].address);
        const beneficiary2 = await obv.readBeneficiary(gm_proxy.address, addrs[2].address);
        expect(ethers.BigNumber.from(releaseable).add(ethers.BigNumber.from(beneficiary2.released))).to.equal(
          beneficiary.amount
        );
        const receipt2 = obv.release(gm_proxy.address, addrs[2].address);
        await expect(receipt2).to.emit(obv, 'Fulfilled');
        /*.withArgs(ethers.BigNumber.from('1'), addrs[2].address, ethers.BigNumber.from('2'), beneficiary.amount);*/
        // beneficiary is removed from mapping let's add it again
        await gm_proxy.approve(obv.address, 100);
        const allowance = await gm_proxy.allowance(owner.address, obv.address);
        expect(allowance).to.equal(100);
        const blockAgain = await ethers.provider.getBlock('latest');
        const time = blockAgain.timestamp + 10;
        const receiptAgain = obv['addBeneficiary(address,address,uint256,uint256,uint256,uint256,uint8)'](
          gm_proxy.address,
          addrs[2].address,
          100,
          time,
          1000 /* 1000 seconds */,
          100,
          1
        );
        await expect(receiptAgain)
          .to.emit(obv, 'AddedBeneficiary')
          .withArgs(
            ethers.BigNumber.from('1'),
            addrs[2].address,
            ethers.BigNumber.from('100'),
            ethers.BigNumber.from(time),
            ethers.BigNumber.from(1000),
            ethers.BigNumber.from('1')
          );
        // advance time by 110s
        await ethers.provider.send('evm_increaseTime', [110]);
        await ethers.provider.send('evm_mine', []);
        const releaseable3 = await obv.releasableAmount(gm_proxy.address, addrs[2].address);
        expect(releaseable3).to.equal(10);
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should release vested amount, with cliff, linear', async () => {
      const beneficiary = await obv.readBeneficiary(gm_proxy.address, addrs[3].address);
      const contractAmountBefore = await gm_proxy.balanceOf(obv.address);
      const snapshot = await ethers.provider.send('evm_snapshot', []);
      try {
        await ethers.provider.send('evm_increaseTime', [1000]);
        await ethers.provider.send('evm_mine', []);
        const block = await ethers.provider.getBlock('latest');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const calculatedAmount = Math.trunc(
          ethers.BigNumber.from(beneficiary.amount)
            .mul(ethers.BigNumber.from(block.timestamp).sub(ethers.BigNumber.from(beneficiary.startTime)))
            .div(ethers.BigNumber.from(beneficiary.duration))
            .toNumber()
        );
        const receipt = obv.release(gm_proxy.address, addrs[3].address);
        await expect(receipt).to.emit(obv, 'Release');
        /*.withArgs(
            ethers.BigNumber.from('1'),
            addrs[3].address,
            ethers.BigNumber.from(calculatedAmount),
            ethers.BigNumber.from(calculatedAmount)
          );*/
        const amount = await gm_proxy.balanceOf(addrs[3].address);
        // expect(amount).to.equal(calculatedAmount);
        const contractAmountAfter = await gm_proxy.balanceOf(obv.address);
        expect(contractAmountAfter).to.equal(ethers.BigNumber.from(contractAmountBefore).sub(amount));
      } finally {
        await ethers.provider.send('evm_revert', [snapshot]);
      }
    });

    it('should return all active vaults', async () => {
      const vaults = await obv.getActiveVaults();
      expect(vaults.length).to.equal(2);
    });
  });
});
