import {IEVMAssetV2, IEVMAssetTypeV2, IEVMOrderV2} from './order';
import hre from 'hardhat';

export const ASSET_TYPE_TYPEHASH = hre.web3.utils.sha3('AssetType(bytes4 assetClass,bytes data)');

export const ASSET_TYPEHASH = hre.web3.utils.sha3(
  'Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)'
);

export const ORDER_TYPEHASH = hre.web3.utils.sha3(
  'Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,bytes4 dataType,bytes data)Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)'
);

export function hashKey(order: IEVMOrderV2) {
  return hre.web3.utils.soliditySha3(
    hre.web3.eth.abi.encodeParameters(
      ['address', 'bytes32', 'bytes32', 'uint'],
      [order.maker, hashAssetType(order.makeAsset.assetType), hashAssetType(order.takeAsset.assetType), order.salt]
    )
  );
}

export function hashAssetType(assetType: IEVMAssetTypeV2) {
  return hre.web3.utils.soliditySha3(
    hre.web3.eth.abi.encodeParameters(
      ['bytes32', 'bytes4', 'bytes32'],
      [
        ASSET_TYPE_TYPEHASH,
        assetType.assetClass,
        assetType.data == '0x'
          ? Buffer.from('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470', 'hex')
          : hre.web3.utils.keccak256(assetType.data),
      ]
    )
  );
}

export function hashAsset(asset: IEVMAssetV2) {
  return hre.web3.utils.soliditySha3(
    hre.web3.eth.abi.encodeParameters(
      ['bytes32', 'bytes32', 'uint'],
      [ASSET_TYPEHASH, hashAssetType(asset.assetType), asset.value]
    )
  );
}

export function hashOrder(order: IEVMOrderV2) {
  return hre.web3.utils.soliditySha3(
    hre.web3.eth.abi.encodeParameters(
      ['bytes32', 'address', 'bytes32', 'address', 'bytes32', 'uint', 'uint', 'uint', 'bytes4', 'bytes32'],
      [
        ORDER_TYPEHASH,
        order.maker,
        hashAsset(order.makeAsset),
        order.taker,
        hashAsset(order.takeAsset),
        order.salt,
        order.start,
        order.end,
        order.dataType,
        hre.web3.utils.keccak256(order.data),
      ]
    )
  );
}
