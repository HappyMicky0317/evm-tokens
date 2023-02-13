import hre, {deployments, getNamedAccounts} from 'hardhat';

async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  const NAME = 'GhostMarket Token';
  const SYMBOL = 'GM';
  const SUPPLY = '10000000000000000';
  const DECIMALS = '8';

  console.log(`GhostMarketToken deployment on ${CHAIN} start`);

  const gm_proxy = await deploy('GhostMarketToken', {
    contract: 'GhostMarketToken',
    from: deployer,
    proxy: {
      owner: deployer,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [NAME, SYMBOL, SUPPLY, DECIMALS],
        },
      },
    },
    log: true,
  });
  console.log('GhostMarketToken deployed at: ', gm_proxy.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
