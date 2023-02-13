/* eslint-disable @typescript-eslint/no-explicit-any */
import hre from 'hardhat';

export const TYPES_721 = {
  Part: [
    {name: 'recipient', type: 'address'},
    {name: 'value', type: 'uint256'},
  ],
  Mint721: [
    {name: 'tokenId', type: 'uint256'},
    {name: 'tokenURI', type: 'string'},
    {name: 'minter', type: 'address'},
    {name: 'royalties', type: 'Part[]'},
  ],
};

export const TYPES_1155 = {
  Part: [
    {name: 'recipient', type: 'address'},
    {name: 'value', type: 'uint256'},
  ],
  Mint1155: [
    {name: 'tokenId', type: 'uint256'},
    {name: 'tokenURI', type: 'string'},
    {name: 'amount', type: 'uint256'},
    {name: 'minter', type: 'address'},
    {name: 'royalties', type: 'Part[]'},
  ],
};

const DOMAIN_TYPE = [
  {
    type: 'string',
    name: 'name',
  },
  {
    type: 'string',
    name: 'version',
  },
  {
    type: 'uint256',
    name: 'chainId',
  },
  {
    type: 'address',
    name: 'verifyingContract',
  },
];

export default {
  async sign721(
    account: string,
    tokenId: string,
    tokenURI: string,
    royalties: {recipient: string; value: string}[],
    verifyingContract: string
  ): Promise<string> {
    const chainId = Number(await hre.web3.eth.getChainId());
    const data = this.createTypeData(
      {
        name: 'Mint721',
        chainId,
        version: '1',
        verifyingContract,
      },
      'Mint721',
      {tokenId, tokenURI, minter: account, royalties},
      TYPES_721
    );
    return (await this.signTypedData(hre.web3, account, data)).sig;
  },

  async sign1155(
    account: string,
    tokenId: string,
    tokenURI: string,
    amount: string,
    royalties: {recipient: string; value: string}[],
    verifyingContract: string
  ): Promise<string> {
    const chainId = Number(await hre.web3.eth.getChainId());
    const data = this.createTypeData(
      {
        name: 'Mint1155',
        chainId,
        version: '1',
        verifyingContract,
      },
      'Mint1155',
      {tokenId, tokenURI, amount, minter: account, royalties},
      TYPES_1155
    );
    return (await this.signTypedData(hre.web3, account, data)).sig;
  },

  createTypeData(
    domainData: {name: string; version: string; chainId: number; verifyingContract: string},
    primaryType: string,
    message: any,
    types: any
  ): any {
    return {
      types: Object.assign(
        {
          EIP712Domain: DOMAIN_TYPE,
        },
        types
      ),
      domain: domainData,
      primaryType,
      message,
    };
  },

  signTypedData(web3: any, from: string, data: any): any {
    return new Promise((resolve, reject) => {
      function cb(err: any, result: any) {
        if (err) {
          return reject(err);
        }
        if (result.error) {
          return reject(result.error);
        }

        const sig = result.result;
        const sig0 = sig.substring(2);
        const r = '0x' + sig0.substring(0, 64);
        const s = '0x' + sig0.substring(64, 128);
        const v = parseInt(sig0.substring(128, 130), 16);

        resolve({
          data,
          sig,
          v,
          r,
          s,
        });
      }
      if (web3.currentProvider?.isMetaMask) {
        web3.currentProvider.sendAsync(
          {
            jsonrpc: '2.0',
            method: 'eth_signTypedData_v4',
            params: [from, JSON.stringify(data)],
          },
          cb
        );
      } else {
        let send = web3.currentProvider?.sendAsync;
        if (!send) {
          send = web3.currentProvider.send;
        }
        send.bind(web3.currentProvider)(
          {
            jsonrpc: '2.0',
            method: 'eth_signTypedData_v4',
            params: [from, data],
          },
          cb
        );
      }
    });
  },
};
