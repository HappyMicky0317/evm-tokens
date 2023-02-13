import {getSettings} from '../.config';
import hre, {deployments, getNamedAccounts} from 'hardhat';

async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  const BLOCKS_PER_DAY = getSettings(CHAIN).blocks_per_day;
  const START_BLOCK = getSettings(CHAIN).start_block;
  const LP_TOKEN = getSettings(CHAIN).lp_token;
  const GM_TOKEN = getSettings(CHAIN).gm_token_proxy;
  if (!LP_TOKEN || !GM_TOKEN || !START_BLOCK || !BLOCKS_PER_DAY) return;
  const TOTAL_REWARDS = 500000; // 500k per pool
  const DURATION = 90; // 90 days
  const DECIMALS = 10 ** 8; // gm decimals
  const REWARDS_PER_BLOCK = parseInt(((TOTAL_REWARDS / DURATION / BLOCKS_PER_DAY) * DECIMALS).toString());
  const END_BLOCK = START_BLOCK + DURATION * BLOCKS_PER_DAY;

  console.log(`StakingPoolForDexTokens deployment on ${CHAIN} start`);

  const staking_proxy = await deploy('StakingPoolForDexTokens', {
    contract: 'StakingPoolForDexTokens',
    from: deployer,
    proxy: {
      owner: deployer,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [LP_TOKEN, GM_TOKEN, REWARDS_PER_BLOCK, START_BLOCK, END_BLOCK],
        },
      },
    },
    log: true,
  });
  console.log('StakingPoolForDexTokens deployed at: ', staking_proxy.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
