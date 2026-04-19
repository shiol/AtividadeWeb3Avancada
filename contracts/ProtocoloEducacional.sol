// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract EduToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(uint256 initialSupply) ERC20("EduToken", "EDU") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

contract EduNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public nextTokenId = 1;

    constructor() ERC721("EduAchievement", "EDUNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mintAchievement(
        address to,
        string calldata tokenUri
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}

contract EduStaking is AccessControl, ReentrancyGuard {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    uint256 public constant ORACLE_DECIMALS = 1e8;
    uint256 public constant REFERENCE_ETH_PRICE = 2000 * ORACLE_DECIMALS;

    EduToken public immutable token;
    AggregatorV3Interface public immutable priceFeed;
    uint256 public annualRateBps;

    mapping(address => uint256) public stakedBalanceOf;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public lastUpdate;

    event Staked(address indexed account, uint256 amount);
    event Unstaked(address indexed account, uint256 amount);
    event RewardClaimed(address indexed account, uint256 amount);
    event AnnualRateUpdated(uint256 newAnnualRateBps);

    constructor(
        address tokenAddress,
        address oracleAddress,
        uint256 initialAnnualRateBps
    ) {
        token = EduToken(tokenAddress);
        priceFeed = AggregatorV3Interface(oracleAddress);
        annualRateBps = initialAnnualRateBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
    }

    function latestEthPrice() public view returns (uint256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        require(answer > 0, "Oracle sem preco valido");
        return uint256(answer);
    }

    function pendingRewards(address account) public view returns (uint256) {
        uint256 stakedAmount = stakedBalanceOf[account];
        uint256 accrued = rewardDebt[account];

        if (stakedAmount == 0 || lastUpdate[account] == 0) {
            return accrued;
        }

        uint256 elapsed = block.timestamp - lastUpdate[account];
        uint256 oraclePrice = latestEthPrice();

        uint256 reward = (stakedAmount *
            elapsed *
            annualRateBps *
            oraclePrice) /
            (365 days * 10_000 * REFERENCE_ETH_PRICE);

        return accrued + reward;
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Valor invalido");
        _accrue(msg.sender);

        stakedBalanceOf[msg.sender] += amount;
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transferencia falhou"
        );

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Valor invalido");
        require(stakedBalanceOf[msg.sender] >= amount, "Saldo insuficiente");

        _accrue(msg.sender);
        stakedBalanceOf[msg.sender] -= amount;
        require(token.transfer(msg.sender, amount), "Transferencia falhou");

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        _accrue(msg.sender);
        uint256 reward = rewardDebt[msg.sender];
        require(reward > 0, "Sem recompensa");

        rewardDebt[msg.sender] = 0;
        token.mint(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    function setAnnualRateBps(
        uint256 newAnnualRateBps
    ) external onlyRole(MANAGER_ROLE) {
        require(newAnnualRateBps <= 5_000, "APR muito alto");
        annualRateBps = newAnnualRateBps;
        emit AnnualRateUpdated(newAnnualRateBps);
    }

    function _accrue(address account) internal {
        rewardDebt[account] = pendingRewards(account);
        lastUpdate[account] = block.timestamp;
    }
}

contract EduGovernance is AccessControl {
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    struct Proposal {
        string description;
        uint256 deadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
    }

    EduStaking public immutable staking;
    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 deadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalFinalized(
        uint256 indexed proposalId,
        bool approved,
        uint256 yesVotes,
        uint256 noVotes
    );

    constructor(address stakingAddress) {
        staking = EduStaking(stakingAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
    }

    function createProposal(
        string calldata description,
        uint256 durationInSeconds
    ) external returns (uint256 proposalId) {
        require(bytes(description).length > 0, "Descricao obrigatoria");
        require(durationInSeconds >= 1 hours, "Duracao muito curta");
        require(
            staking.stakedBalanceOf(msg.sender) > 0,
            "Precisa ter stake para propor"
        );

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            description: description,
            deadline: block.timestamp + durationInSeconds,
            yesVotes: 0,
            noVotes: 0,
            executed: false
        });

        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            block.timestamp + durationInSeconds
        );
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.deadline != 0, "Proposta inexistente");
        require(block.timestamp < proposal.deadline, "Votacao encerrada");
        require(!hasVoted[proposalId][msg.sender], "Voto ja registrado");

        uint256 weight = staking.stakedBalanceOf(msg.sender);
        require(weight > 0, "Sem poder de voto");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.yesVotes += weight;
        } else {
            proposal.noVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function finalizeProposal(
        uint256 proposalId
    ) external onlyRole(MODERATOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.deadline != 0, "Proposta inexistente");
        require(block.timestamp >= proposal.deadline, "Votacao ainda aberta");
        require(!proposal.executed, "Proposta ja finalizada");

        proposal.executed = true;

        emit ProposalFinalized(
            proposalId,
            proposal.yesVotes > proposal.noVotes,
            proposal.yesVotes,
            proposal.noVotes
        );
    }
}
