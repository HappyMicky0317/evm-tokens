export interface IEVMAssetTypeV2 {
  assetClass: string;
  data: string;
}

export interface IEVMAssetV2 {
  assetType: {
    assetClass: string;
    data: string;
  };
  value: string;
}

export interface IEVMOrderV2 {
  maker: string;
  makeAsset: IEVMAssetV2;
  taker: string;
  takeAsset: IEVMAssetV2;
  salt: string;
  start: number;
  end: number;
  dataType: string;
  data: string;
}

export function AssetType(assetClass: string, data: string): IEVMAssetTypeV2 {
  return {
    assetClass,
    data,
  };
}

export function Asset(assetClass: string, data: string, value: string): IEVMAssetV2 {
  return {
    assetType: AssetType(assetClass, data),
    value,
  };
}

export function Order(
  maker: string,
  makeAsset: IEVMAssetV2,
  taker: string,
  takeAsset: IEVMAssetV2,
  salt: string,
  start: number,
  end: number,
  dataType: string,
  data: string
): IEVMOrderV2 {
  return {
    maker,
    makeAsset,
    taker,
    takeAsset,
    salt,
    start,
    end,
    dataType,
    data,
  };
}

export default {AssetType, Asset, Order};
