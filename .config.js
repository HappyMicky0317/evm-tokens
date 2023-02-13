const eth_mainnet = {
  blocks_per_day: 6400,
  start_block: 0,
  lp_token: '',
  gm_token_proxy: '0x35609dC59E15d03c5c865507e1348FA5abB319A8',
  erc721_token_proxy: '',
  erc1155_token_proxy: '',
  lp_staking_proxy: '',
  skip_check_storage: false,
};

const eth_testnet = {
  blocks_per_day: 6400,
  start_block: 0,
  lp_token: '',
  gm_token_proxy: '0x54cd0f7627597b8ea25dfc1dd0cc81f952c2d900',
  erc721_token_proxy: '0xd35b5d7e184013233cc43139dc7242223ec0a708',
  erc1155_token_proxy: '0x76ffb975ca6c3f0f9e036561824c542374885e95',
  lp_staking_proxy: '',
  skip_check_storage: false,
};

const avalanche_mainnet = {
  blocks_per_day: 43200,
  start_block: 18450573,
  lp_token: '0xef61490aa6316d06d5375164f0db7d472cd0029f',
  gm_token_proxy: '0x0B53b5dA7d0F275C31a6A182622bDF02474aF253',
  erc721_token_proxy: '0x068bEF92987D16eF682FF017B822CA1211401EaF',
  erc1155_token_proxy: '0xdcdaB251151c345AD527851ECa783521Ea3209E0',
  lp_staking_proxy: '0xF3fd0F360aCE3B0e83843221a763FEC857291060',
  skip_check_storage: false,
};

const avalanche_testnet = {
  blocks_per_day: 43200,
  start_block: 0,
  lp_token: '',
  gm_token_proxy: '0x7D35e9D90bD91BA82dAe43d7e03cF1e04c14aea8',
  erc721_token_proxy: '0x31681e95A89034612926908F48A5E1Aa734EBf05',
  erc1155_token_proxy: '0xE98E9D752d6104aDa0520988cd1834035762C8c7',
  lp_staking_proxy: '',
  skip_check_storage: false,
};

const polygon_mainnet = {
  blocks_per_day: 43200,
  start_block: 31726839,
  lp_token: '0x66eae4669e5bc9a391d97d8aa2bffd7dffb2690e',
  gm_token_proxy: '0x6a335AC6A3cdf444967Fe03E7b6B273c86043990',
  erc721_token_proxy: '0x068bef92987d16ef682ff017b822ca1211401eaf',
  erc1155_token_proxy: '0xf1c82f5ddb4f1a6a8f3eed2eb25fc39fc6d33fb3',
  lp_staking_proxy: '0x32fD06f88AFc3ce26bbD1cD9FA97dd27BD0826Cd',
  skip_check_storage: false,
};

const polygon_testnet = {
  blocks_per_day: 43200,
  start_block: 0,
  lp_token: '',
  gm_token_proxy: '0x957404188EA8804eFF6dc052e6B35c58aE351357',
  erc721_token_proxy: '0x9b7e1a760751de8251e9f1ad09ed9039d4b7a676',
  erc1155_token_proxy: '0x7aa199E2D5cFf1E6275A33c8dCE3c6085E393781',
  lp_staking_proxy: '',
};

const bsc_mainnet = {
  blocks_per_day: 28800,
  start_block: 20311984,
  lp_token: '0x83895b0512c88f03c2513751475a3ea9cbec4fbe',
  gm_token_proxy: '0x0B53b5dA7d0F275C31a6A182622bDF02474aF253',
  erc721_token_proxy: '0xF41db445D7eaF45536985cE185ce131FA4b42E68',
  erc1155_token_proxy: '0x44c5ce28c29934b71a2a0447745d551dfc7b5133',
  lp_staking_proxy: '0x5992cD0fF3074A7849AA2f2799bD3ce1DD17e747',
  skip_check_storage: false,
};

const bsc_testnet = {
  blocks_per_day: 28800,
  start_block: 0,
  lp_token: '',
  gm_token_proxy: '0xf3fd0f360ace3b0e83843221a763fec857291060',
  erc721_token_proxy: '0x92832367C614A9e36D4d6394f0DA44306DF2D4D7',
  erc1155_token_proxy: '0xf1daF0C96d13251dE0FdbB60acD2caD3C9CF15BB',
  lp_staking_proxy: '',
  skip_check_storage: false,
};

let settings = {
  eth_mainnet: eth_mainnet,
  eth_testnet: eth_testnet,
  avalanche_mainnet: avalanche_mainnet,
  avalanche_testnet: avalanche_testnet,
  polygon_mainnet: polygon_mainnet,
  polygon_testnet: polygon_testnet,
  bsc_mainnet: bsc_mainnet,
  bsc_testnet: bsc_testnet,
};

function getSettings(network) {
  if (settings[network] !== undefined) {
    return settings[network];
  } else {
    return {};
  }
}

module.exports = {getSettings};
