/* eslint-disable @typescript-eslint/no-explicit-any */
import hre from 'hardhat';

export function id(str: any): string {
  if (typeof str === 'string') {
    str = Buffer.from(str, 'utf8');
  }
  const hex = `${hre.web3.utils
    .keccak256(str)
    .toString()
    .substring(0, 2 + 8)}`;
  return hex;
}

export function enc(token: string, tokenId?: string): string {
  if (tokenId) {
    return hre.web3.eth.abi.encodeParameters(['address', 'uint256'], [token, tokenId]);
  } else if (token === '0x') {
    return '0x';
  } else {
    return hre.web3.eth.abi.encodeParameter('address', token);
  }
}

export const ZERO = '0x0000000000000000000000000000000000000000';
export const ETH = id('ETH');
export const ERC20 = id('ERC20');
export const ERC721 = id('ERC721');
export const ERC1155 = id('ERC1155');
export const ERC721_LAZY = id('ERC721_LAZY');
export const ERC1155_LAZY = id('ERC1155_LAZY');
export const COLLECTION = id('COLLECTION');
export const CRYPTO_PUNK = id('CRYPTO_PUNK');
export const ORDER_DATA_V1 = id('V1');
export const ORDER_DATA_V2 = id('V@');
export const TO_MAKER = id('TO_MAKER');
export const TO_TAKER = id('TO_TAKER');
export const PROTOCOL = id('PROTOCOL');
export const ROYALTY = id('ROYALTY');
export const ORIGIN = id('ORIGIN');
export const PAYOUT = id('PAYOUT');

export default {
  ETH,
  ERC20,
  ERC721,
  ERC1155,
  ERC721_LAZY,
  ERC1155_LAZY,
  COLLECTION,
  CRYPTO_PUNK,
  ORDER_DATA_V1,
  ORDER_DATA_V2,
  TO_MAKER,
  TO_TAKER,
  PROTOCOL,
  ROYALTY,
  ORIGIN,
  PAYOUT,
  enc,
  id,
};
