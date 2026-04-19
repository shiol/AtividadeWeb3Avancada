# Atividade Web3 - Protocolo Completo

## Problema que o protocolo resolve
O protocolo proposto cria uma infraestrutura simples para cursos e comunidades educacionais Web3:

- um token ERC-20 para utilidade e recompensa;
- um NFT para certificados ou conquistas;
- staking para incentivar permanencia;
- governanca simplificada para votar em decisoes da comunidade;
- oraculo ETH/USD para ajustar a recompensa do staking com dado externo.

## Contratos do protocolo
- `EduToken`: ERC-20 com OpenZeppelin e `AccessControl`.
- `EduNFT`: ERC-721 com `tokenURI` e `AccessControl`.
- `EduStaking`: staking com recompensa, `ReentrancyGuard`, controle de acesso e uso do oraculo.
- `EduGovernance`: DAO simplificada baseada no saldo em stake.

Todos estao no arquivo `contracts/ProtocoloEducacional.sol` para facilitar deploy e republicacao no Remix.

## Deploy em Sepolia
- `EduToken`: `0xa73Fc5955C5A6Bf00f16E46e55Dd579cD9CA84eE`
- `EduNFT`: `0x18eBCb125c8669Ce08025c5fBc476DF70dB053Bf`
- `EduStaking`: `0x8DB36CA2CF8aa79C9d2C78B427b0A20e5b476A5B`
- `EduGovernance`: `0x24e45e52713d1b55589906da0b9c8e01200AdF7e`

## Links do explorer
- `EduToken`: `https://sepolia.etherscan.io/address/0xa73Fc5955C5A6Bf00f16E46e55Dd579cD9CA84eE`
- `EduNFT`: `https://sepolia.etherscan.io/address/0x18eBCb125c8669Ce08025c5fBc476DF70dB053Bf`
- `EduStaking`: `https://sepolia.etherscan.io/address/0x8DB36CA2CF8aa79C9d2C78B427b0A20e5b476A5B`
- `EduGovernance`: `https://sepolia.etherscan.io/address/0x24e45e52713d1b55589906da0b9c8e01200AdF7e`

## Arquitetura
Fluxo resumido:

1. O admin faz deploy do `EduToken`.
2. O admin faz deploy do `EduNFT`.
3. O admin faz deploy do `EduStaking` apontando para o token e para o feed ETH/USD.
4. O admin faz deploy do `EduGovernance` apontando para o staking.
5. O admin concede `MINTER_ROLE` do token ao contrato de staking.
6. O admin usa o NFT para emitir certificados.
7. Usuarios fazem stake do token e acumulam recompensa.
8. Usuarios com stake criam propostas e votam na governanca.

## Justificativa dos padroes
- `ERC-20`: melhor opcao para recompensa, staking e peso economico na governanca.
- `ERC-721`: suficiente para representar certificado individual de aluno ou conquista unica.

## Requisitos do PDF cobertos no contrato
- Token ERC-20 com OpenZeppelin.
- NFT ERC-721 com OpenZeppelin.
- Contrato de staking com recompensa.
- Contrato de governanca simples.
- Uso de `Solidity ^0.8.x`.
- Protecao contra reentrancy no staking.
- Controle de acesso com `AccessControl`.
- Integracao com oraculo via interface `AggregatorV3Interface`.

## Endereco do oraculo em Sepolia
Chainlink ETH / USD:

- `0x694AA1769357215DE4FAC081bf1f309aDC325306`

## Ordem de deploy
1. Compile `contracts/ProtocoloEducacional.sol`.
2. Deploy `EduToken` com `initialSupply` em wei, por exemplo `1000000000000000000000000` para 1.000.000 tokens.
3. Deploy `EduNFT`.
4. Deploy `EduStaking` com:
   - `tokenAddress`: endereco do `EduToken`
   - `oracleAddress`: endereco do feed Chainlink ETH/USD
   - `initialAnnualRateBps`: por exemplo `1200` para 12% ao ano
5. Deploy `EduGovernance` com o endereco do `EduStaking`.
6. No `EduToken`, execute `grantRole(MINTER_ROLE, stakingAddress)`.

## Demonstracao minima esperada
- `mintAchievement` no NFT.
- `approve` no token e depois `stake` no staking.
- `claimRewards` para mostrar recompensa.
- `createProposal` e `vote` no contrato de governanca.
