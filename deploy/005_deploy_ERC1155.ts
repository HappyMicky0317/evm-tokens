import hre, {deployments, getNamedAccounts} from 'hardhat';

async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  const IS_MAINNET = !CHAIN.includes('_testnet');
  const NAME = 'GhostMarket ERC1155';
  const SYMBOL = 'GHOST';
  const API_PATH = IS_MAINNET ? 'api' : 'api-testnet';
  const API_URL = `https://${API_PATH}.ghostmarket.io/metadata/${CHAIN}`;

  console.log(`GhostMarketERC1155 deployment on ${CHAIN} start`);

  const erc1155_proxy = await deploy('GhostMarketERC1155', {
    contract: 'GhostMarketERC1155',
    from: deployer,
    proxy: {
      owner: deployer,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [NAME, SYMBOL, API_URL],
        },
      },
    },
    log: true,
  });
  console.log('GhostMarketERC1155 deployed at: ', erc1155_proxy.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
