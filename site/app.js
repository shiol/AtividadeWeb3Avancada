const SEPOLIA_CHAIN_ID = "0xaa36a7";

const CONTRACTS = {
  token: "0xa73Fc5955C5A6Bf00f16E46e55Dd579cD9CA84eE",
  nft: "0x18eBCb125c8669Ce08025c5fBc476DF70dB053Bf",
  staking: "0x8DB36CA2CF8aa79C9d2C78B427b0A20e5b476A5B",
  governance: "0x24e45e52713d1b55589906da0b9c8e01200AdF7e",
};

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

const NFT_ABI = [
  "function mintAchievement(address to, string tokenUri) external returns (uint256)",
];

const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function claimRewards() external",
  "function stakedBalanceOf(address account) external view returns (uint256)",
  "function pendingRewards(address account) external view returns (uint256)",
  "function latestEthPrice() external view returns (uint256)",
];

const GOVERNANCE_ABI = [
  "function createProposal(string description, uint256 durationInSeconds) external returns (uint256)",
  "function vote(uint256 proposalId, bool support) external",
  "function proposalCount() external view returns (uint256)",
];

const connectButton = document.getElementById("connectButton");
const mintNftButton = document.getElementById("mintNftButton");
const approveButton = document.getElementById("approveButton");
const stakeButton = document.getElementById("stakeButton");
const claimRewardsButton = document.getElementById("claimRewardsButton");
const createProposalButton = document.getElementById("createProposalButton");
const voteButton = document.getElementById("voteButton");

const walletStatus = document.getElementById("walletStatus");
const statusText = document.getElementById("statusText");
const summaryText = document.getElementById("summaryText");
const contractsInfo = document.getElementById("contractsInfo");

const nftToInput = document.getElementById("nftToInput");
const tokenUriInput = document.getElementById("tokenUriInput");
const approveAmountInput = document.getElementById("approveAmountInput");
const stakeAmountInput = document.getElementById("stakeAmountInput");
const proposalDescriptionInput = document.getElementById("proposalDescriptionInput");
const proposalDurationInput = document.getElementById("proposalDurationInput");
const proposalIdInput = document.getElementById("proposalIdInput");
const voteSelect = document.getElementById("voteSelect");

let provider;
let signer;
let walletAddress;
let tokenContract;
let nftContract;
let stakingContract;
let governanceContract;
let tokenDecimals = 18;

contractsInfo.innerHTML = [
  `EduToken: ${CONTRACTS.token}`,
  `EduNFT: ${CONTRACTS.nft}`,
  `EduStaking: ${CONTRACTS.staking}`,
  `EduGovernance: ${CONTRACTS.governance}`,
].join("<br>");

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function setStatus(message) {
  statusText.textContent = message;
}

function ensureConnected() {
  if (!signer || !walletAddress) {
    throw new Error("Conecte a carteira antes de executar esta etapa.");
  }
}

function parseTokenAmount(value) {
  return ethers.utils.parseUnits(String(value || "0"), tokenDecimals);
}

function formatTokenAmount(value) {
  return Number(ethers.utils.formatUnits(value, tokenDecimals)).toFixed(4);
}

function formatUsdFeed(value) {
  return (Number(value) / 1e8).toFixed(2);
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("Instale a MetaMask para usar este MVP.");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);

  const chainId = await provider.send("eth_chainId", []);
  if (chainId !== SEPOLIA_CHAIN_ID) {
    setStatus("Troque a MetaMask para a rede Sepolia antes de continuar.");
    return;
  }

  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  walletAddress = await signer.getAddress();

  tokenContract = new ethers.Contract(CONTRACTS.token, TOKEN_ABI, signer);
  nftContract = new ethers.Contract(CONTRACTS.nft, NFT_ABI, signer);
  stakingContract = new ethers.Contract(CONTRACTS.staking, STAKING_ABI, signer);
  governanceContract = new ethers.Contract(
    CONTRACTS.governance,
    GOVERNANCE_ABI,
    signer
  );

  tokenDecimals = await tokenContract.decimals();
  walletStatus.textContent = `Carteira conectada: ${shortAddress(walletAddress)}`;
  nftToInput.value = walletAddress;

  setStatus("Carteira conectada. Execute as etapas em ordem para demonstrar o protocolo.");
  await refreshSummary();
}

async function refreshSummary() {
  if (!signer || !walletAddress) {
    return;
  }

  const [tokenBalance, stakedBalance, pendingRewards, ethPrice, proposalCount] =
    await Promise.all([
      tokenContract.balanceOf(walletAddress),
      stakingContract.stakedBalanceOf(walletAddress),
      stakingContract.pendingRewards(walletAddress),
      stakingContract.latestEthPrice(),
      governanceContract.proposalCount(),
    ]);

  summaryText.textContent =
    `Saldo EDU: ${formatTokenAmount(tokenBalance)} | Em stake: ${formatTokenAmount(stakedBalance)} | Rewards pendentes: ${formatTokenAmount(pendingRewards)} | ETH/USD oracle: ${formatUsdFeed(ethPrice)} | Ultima proposta: ${proposalCount.toString()}`;

  if (!proposalIdInput.value && proposalCount.gt(0)) {
    proposalIdInput.value = proposalCount.toString();
  }
}

async function submitTransaction(action, successMessage) {
  try {
    ensureConnected();
    const tx = await action();
    setStatus(`Transacao enviada: ${tx.hash}`);
    await tx.wait();
    setStatus(`${successMessage} Hash: ${tx.hash}`);
    await refreshSummary();
  } catch (error) {
    setStatus(
      error?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "A transacao falhou."
    );
  }
}

async function mintNft() {
  const to = nftToInput.value.trim();
  const tokenUri = tokenUriInput.value.trim();

  if (!ethers.utils.isAddress(to)) {
    setStatus("Informe uma carteira valida para o mint do NFT.");
    return;
  }

  if (!tokenUri) {
    setStatus("Informe um token URI para o NFT.");
    return;
  }

  await submitTransaction(
    () => nftContract.mintAchievement(to, tokenUri),
    "NFT mintado com sucesso."
  );
}

async function approveTokens() {
  const amount = approveAmountInput.value;
  if (!Number(amount) || Number(amount) <= 0) {
    setStatus("Informe uma quantidade valida para aprovar.");
    return;
  }

  await submitTransaction(
    () => tokenContract.approve(CONTRACTS.staking, parseTokenAmount(amount)),
    "Aprovacao realizada com sucesso."
  );
}

async function stakeTokens() {
  const amount = stakeAmountInput.value;
  if (!Number(amount) || Number(amount) <= 0) {
    setStatus("Informe uma quantidade valida para stake.");
    return;
  }

  await submitTransaction(
    () => stakingContract.stake(parseTokenAmount(amount)),
    "Stake realizado com sucesso."
  );
}

async function claimRewards() {
  await submitTransaction(
    () => stakingContract.claimRewards(),
    "Rewards resgatadas com sucesso."
  );
}

async function createProposal() {
  const description = proposalDescriptionInput.value.trim();
  const duration = Number(proposalDurationInput.value);

  if (!description) {
    setStatus("Informe a descricao da proposta.");
    return;
  }

  if (!duration || duration < 3600) {
    setStatus("Use pelo menos 3600 segundos de duracao.");
    return;
  }

  await submitTransaction(
    () => governanceContract.createProposal(description, duration),
    "Proposta criada com sucesso."
  );
}

async function vote() {
  const proposalId = Number(proposalIdInput.value);
  if (!proposalId || proposalId < 1) {
    setStatus("Informe um ID de proposta valido.");
    return;
  }

  await submitTransaction(
    () => governanceContract.vote(proposalId, voteSelect.value === "true"),
    "Voto registrado com sucesso."
  );
}

connectButton.addEventListener("click", connectWallet);
mintNftButton.addEventListener("click", mintNft);
approveButton.addEventListener("click", approveTokens);
stakeButton.addEventListener("click", stakeTokens);
claimRewardsButton.addEventListener("click", claimRewards);
createProposalButton.addEventListener("click", createProposal);
voteButton.addEventListener("click", vote);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
