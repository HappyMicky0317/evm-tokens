import {expect} from '../test/utils/chai-setup';
import {ethers} from 'hardhat';
import {OperatorRoleTest} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

describe('OperatorRole Test', function () {
  let operator: OperatorRoleTest;
  let addrs: SignerWithAddress[];
  let testingAsSigner1: OperatorRoleTest;
  let testingAsSigner2: OperatorRoleTest;

  beforeEach(async () => {
    const OP = await ethers.getContractFactory('OperatorRoleTest');
    [...addrs] = await ethers.getSigners();
    operator = await OP.deploy();
    await operator.__OperatorRoleTest_init();
    testingAsSigner1 = operator.connect(addrs[1]);
    testingAsSigner2 = operator.connect(addrs[2]);
  });

  it('should only allow owner to add/remove operators', async () => {
    await expect(testingAsSigner1.addOperator(addrs[1].address, {from: addrs[1].address})).revertedWith(
      'Ownable: caller is not the owner'
    );
    await expect(testingAsSigner1.removeOperator(addrs[1].address, {from: addrs[1].address})).revertedWith(
      'Ownable: caller is not the owner'
    );

    await operator.addOperator(addrs[1].address);

    const operatorStatus = await operator.getOperator(addrs[1].address);
    expect(operatorStatus).to.equal(true);

    await operator.removeOperator(addrs[1].address);
  });

  it('should only allow operator when calling protected functions', async () => {
    await expect(testingAsSigner2.getSomething({from: addrs[2].address})).revertedWith(
      'OperatorRole: caller is not the operator'
    );

    await operator.addOperator(addrs[2].address);
    expect(await testingAsSigner2.getSomething({from: addrs[2].address})).to.equal(10);

    await expect(testingAsSigner1.getSomething({from: addrs[1].address})).revertedWith(
      'OperatorRole: caller is not the operator'
    );
  });
});
