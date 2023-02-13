import 'dotenv/config';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import '@typechain/hardhat';
import 'solidity-coverage';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-web3';
import {HardhatUserConfig} from 'hardhat/types';
import {node_url, accounts} from './utils/network';

import {ETH_NODE_URI, TESTNET_PRIVATE_KEY, MAINNET_PRIVATE_KEY, ETHERSCAN_API_KEY} from './.secrets.json';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    /*     localhost: {
      url: "127.0.0.1",     // Localhost
      port: 8545,            // Ganache CLI port
    }, */
    hardhat: {
      // process.env.HARDHAT_FORK will specify the network that the fork is made from.
      // this line ensure the use of the corresponding accounts
      accounts: accounts(process.env.HARDHAT_FORK),
      forking: process.env.HARDHAT_FORK
        ? {
            // TODO once PR merged : network: process.env.HARDHAT_FORK,
            url: node_url(process.env.HARDHAT_FORK),
            blockNumber: process.env.HARDHAT_FORK_NUMBER ? parseInt(process.env.HARDHAT_FORK_NUMBER) : undefined,
          }
        : undefined,
    },
    localhost: {
      //accounts: accounts(),
      saveDeployments: true,
      tags: ['local'],
      //gasPrice: 0,
    },
    testnet_nodeploy: {
      url: ETH_NODE_URI,
      accounts: TESTNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['testnet_nodeploy'],
    },
    ethereum_testnet: {
      chainId: 5,
      url: ETH_NODE_URI,
      accounts: TESTNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['testnet'],
    },
    ethereum_mainnet: {
      chainId: 1,
      url: ETH_NODE_URI,
      accounts: MAINNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['mainnet'],
    },
    polygon_testnet: {
      chainId: 80001,
      url: ETH_NODE_URI,
      accounts: TESTNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['testnet'],
    },
    polygon_mainnet: {
      chainId: 137,
      url: ETH_NODE_URI,
      accounts: MAINNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['mainnet'],
    },
    bsc_testnet: {
      chainId: 97,
      url: ETH_NODE_URI,
      accounts: TESTNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['testnet'],
    },
    bsc_mainnet: {
      chainId: 56,
      url: ETH_NODE_URI,
      accounts: MAINNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['mainnet'],
    },
    avalanche_testnet: {
      chainId: 43113,
      url: ETH_NODE_URI,
      accounts: TESTNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['testnet'],
    },
    avalanche_mainnet: {
      chainId: 43114,
      url: ETH_NODE_URI,
      accounts: MAINNET_PRIVATE_KEY,
      saveDeployments: true,
      tags: ['mainnet'],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: 'src',
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: process.env.REPORT_GAS ? true : false,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    maxMethodDiff: 10,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 0,
  },
  external: process.env.HARDHAT_FORK
    ? {
        deployments: {
          // process.env.HARDHAT_FORK will specify the network that the fork is made from.
          // these lines allow it to fetch the deployments from the network being forked from both for node and deploy task
          hardhat: ['deployments/' + process.env.HARDHAT_FORK],
          localhost: ['deployments/' + process.env.HARDHAT_FORK],
        },
      }
    : undefined,
};

export default config;
