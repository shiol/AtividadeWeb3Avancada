# Texto Base Para o Relatorio Tecnico

O protocolo desenvolvido resolve um problema simples de comunidades educacionais Web3: incentivar participacao, registrar conquistas e permitir decisoes coletivas com uma base minima de contratos inteligentes. Para isso, a arquitetura foi dividida em quatro componentes principais: um token ERC-20 para recompensa e utilidade, um NFT ERC-721 para certificados, um contrato de staking com recompensa e um contrato de governanca simplificada.

O token foi implementado com OpenZeppelin, usando controle de acesso com `AccessControl`, enquanto o NFT utiliza o padrao ERC-721 por ser adequado para certificados individuais. O staking foi protegido com `ReentrancyGuard` e passou a consumir um dado externo do oraculo Chainlink ETH/USD, usado para modular a recompensa com base em um preco de referencia. A governanca utiliza o saldo em stake como peso de voto, permitindo criar propostas e votar de forma objetiva.

Com isso, o MVP cobre os elementos centrais pedidos no enunciado: token, NFT, staking, governanca, seguranca, oraculo e deploy em testnet. A integracao Web3 pode ser demonstrada com chamadas de `mintAchievement`, `stake`, `claimRewards`, `createProposal` e `vote`, mostrando o fluxo funcional do protocolo.
