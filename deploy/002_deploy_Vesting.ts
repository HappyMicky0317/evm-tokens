import hre, {deployments, getNamedAccounts} from 'hardhat';

async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  // to replace by custom voters before deploy - [address1, address2, address3, address4]
  const VOTERS = [deployer, deployer, deployer, deployer];
  const VAULT_FEE = '1000000000000000';

  console.log(`OnBlockVesting deployment on ${CHAIN} start`);

  const vesting = await deploy('OnBlockVesting', {
    contract: 'OnBlockVesting',
    from: deployer,
    args: [VAULT_FEE, VOTERS],
  });
  console.log('OnBlockVesting deployed at: ', vesting.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
