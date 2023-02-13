/* eslint-disable @typescript-eslint/no-unused-vars */
import {getSettings} from '../.config';
import hre, {deployments, ethers, getNamedAccounts, upgrades} from 'hardhat';

async function main() {
  // const {execute} = deployments;
  // const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  const PROXY = getSettings(CHAIN).erc721_token_proxy;
  const SKIP_CHECK_STORAGE = getSettings(CHAIN).skip_check_storage;
  if (!PROXY) return;

  console.log(`GhostMarketERC721V1 > GhostMarketERC721 upgrade on ${CHAIN} start`);
  console.log(`using transparent proxy: ${PROXY}`);

  const V1 = await ethers.getContractFactory('GhostMarketERC721V1');
  const V2 = await ethers.getContractFactory('GhostMarketERC721');

  // uncomment to force import if missing
  // await upgrades.forceImport(PROXY, V1, {kind: 'transparent'});

  // uncomment to validate upgrade
  await upgrades.validateUpgrade(V1, V2, {kind: 'transparent', unsafeSkipStorageCheck: SKIP_CHECK_STORAGE});

  // upgrade
  await upgrades.upgradeProxy(PROXY, V2, {unsafeSkipStorageCheck: SKIP_CHECK_STORAGE});
  console.log(`GhostMarketERC721V1 > GhostMarketERC721 upgrade on ${CHAIN} complete`);

  // init new methods if required
  // await execute('GhostMarketERC721', {from: deployer.address, log: true}, '__method_to_execute__');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
