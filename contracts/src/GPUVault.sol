// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title GPUVault
 * @notice GPU 렌탈 플랫폼용 Vault 컨트랙트 - BEP-20 기반 결제 시스템
 * @dev Lighter/Hyperliquid 스타일의 Session Key 위임 시스템 구현
 *
 * 주요 기능:
 * - BEP-20 토큰 예치/출금
 * - Session Key 등록 및 권한 위임
 * - 세션 키를 통한 오프체인 서명 기반 지불
 * - GPU 사용료 정산
 */
contract GPUVault is ReentrancyGuard, Ownable, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============ 상수 ============
    bytes32 public constant SESSION_KEY_TYPEHASH =
        keccak256(
            "RegisterSessionKey(address mainWallet,address sessionKey,uint256 spendLimit,uint256 expiry,uint256 nonce)"
        );

    bytes32 public constant PAYMENT_TYPEHASH =
        keccak256(
            "Payment(address from,address to,uint256 amount,string jobId,uint256 nonce,uint256 deadline)"
        );

    // ============ 상태 변수 ============
    IERC20 public immutable paymentToken;

    // 사용자 예치금
    mapping(address => uint256) public deposits;

    // 세션 키 정보
    struct SessionKey {
        address mainWallet; // 메인 지갑 주소
        uint256 spendLimit; // 최대 지출 한도
        uint256 spentAmount; // 현재까지 사용액
        uint256 expiry; // 만료 시간
        bool isActive; // 활성 상태
    }

    // sessionKeyAddress => SessionKey
    mapping(address => SessionKey) public sessionKeys;

    // 사용자별 등록된 세션 키 목록
    mapping(address => address[]) public userSessionKeys;

    // Nonce for replay protection
    mapping(address => uint256) public nonces;

    // GPU 렌탈 세션
    struct Rental {
        address renter; // 대여자
        address provider; // Provider (GPU 제공자)
        uint256 pricePerSecond; // 초당 가격
        uint256 startTime; // 시작 시간
        bool isActive; // 활성 상태
        string jobId; // K8s Job ID
    }

    mapping(uint256 => Rental) public rentals;
    uint256 public rentalCount;

    // 플랫폼 수수료 (basis points: 100 = 1%)
    uint256 public platformFeeBps = 500; // 5%
    address public feeRecipient;

    // ============ 이벤트 ============
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event SessionKeyRegistered(
        address indexed mainWallet,
        address indexed sessionKey,
        uint256 spendLimit,
        uint256 expiry
    );
    event SessionKeyRevoked(
        address indexed mainWallet,
        address indexed sessionKey
    );
    event RentalStarted(
        uint256 indexed rentalId,
        address indexed renter,
        address indexed provider,
        string jobId,
        uint256 pricePerSecond
    );
    event RentalEnded(
        uint256 indexed rentalId,
        uint256 totalCost,
        uint256 platformFee
    );
    event PaymentProcessed(
        address indexed from,
        address indexed to,
        uint256 amount,
        string jobId
    );

    // ============ 에러 ============
    error InsufficientDeposit();
    error InvalidSessionKey();
    error SessionKeyExpired();
    error SpendLimitExceeded();
    error RentalNotActive();
    error InvalidSignature();
    error DeadlineExpired();
    error ZeroAmount();

    // ============ 생성자 ============
    constructor(
        address _paymentToken,
        address _feeRecipient
    ) Ownable(msg.sender) EIP712("GPUVault", "1") {
        paymentToken = IERC20(_paymentToken);
        feeRecipient = _feeRecipient;
    }

    // ============ 예치/출금 함수 ============

    /**
     * @notice BEP-20 토큰 예치
     * @param amount 예치할 금액
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice 예치금 출금 (메인 지갑만 가능)
     * @param amount 출금할 금액
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (deposits[msg.sender] < amount) revert InsufficientDeposit();

        deposits[msg.sender] -= amount;
        paymentToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    // ============ 세션 키 관리 함수 ============

    /**
     * @notice 세션 키 등록 (메인 지갑에서 직접 호출)
     * @param sessionKey 세션 키 주소
     * @param spendLimit 최대 지출 한도
     * @param duration 유효 기간 (초)
     */
    function registerSessionKey(
        address sessionKey,
        uint256 spendLimit,
        uint256 duration
    ) external {
        require(sessionKey != address(0), "Invalid session key");
        require(spendLimit > 0, "Spend limit must be > 0");
        require(duration > 0 && duration <= 30 days, "Invalid duration");

        uint256 expiry = block.timestamp + duration;

        sessionKeys[sessionKey] = SessionKey({
            mainWallet: msg.sender,
            spendLimit: spendLimit,
            spentAmount: 0,
            expiry: expiry,
            isActive: true
        });

        userSessionKeys[msg.sender].push(sessionKey);

        emit SessionKeyRegistered(msg.sender, sessionKey, spendLimit, expiry);
    }

    /**
     * @notice EIP-712 서명으로 세션 키 등록
     * @dev 프론트엔드에서 메인 지갑으로 서명하여 백엔드가 제출
     */
    function registerSessionKeyWithSignature(
        address mainWallet,
        address sessionKey,
        uint256 spendLimit,
        uint256 expiry,
        bytes calldata signature
    ) external {
        require(sessionKey != address(0), "Invalid session key");
        require(expiry > block.timestamp, "Already expired");

        // EIP-712 서명 검증
        bytes32 structHash = keccak256(
            abi.encode(
                SESSION_KEY_TYPEHASH,
                mainWallet,
                sessionKey,
                spendLimit,
                expiry,
                nonces[mainWallet]++
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        if (signer != mainWallet) revert InvalidSignature();

        sessionKeys[sessionKey] = SessionKey({
            mainWallet: mainWallet,
            spendLimit: spendLimit,
            spentAmount: 0,
            expiry: expiry,
            isActive: true
        });

        userSessionKeys[mainWallet].push(sessionKey);

        emit SessionKeyRegistered(mainWallet, sessionKey, spendLimit, expiry);
    }

    /**
     * @notice 세션 키 비활성화
     * @param sessionKey 비활성화할 세션 키
     */
    function revokeSessionKey(address sessionKey) external {
        SessionKey storage sk = sessionKeys[sessionKey];
        require(sk.mainWallet == msg.sender, "Not authorized");

        sk.isActive = false;

        emit SessionKeyRevoked(msg.sender, sessionKey);
    }

    // ============ 렌탈 함수 ============

    /**
     * @notice GPU 렌탈 시작
     * @param provider Provider 지갑 주소
     * @param pricePerSecond 초당 가격
     * @param jobId K8s Job ID
     */
    function startRental(
        address provider,
        uint256 pricePerSecond,
        string calldata jobId
    ) external returns (uint256 rentalId) {
        require(deposits[msg.sender] > 0, "Deposit required");
        require(pricePerSecond > 0, "Invalid price");

        rentalId = rentalCount++;

        rentals[rentalId] = Rental({
            renter: msg.sender,
            provider: provider,
            pricePerSecond: pricePerSecond,
            startTime: block.timestamp,
            isActive: true,
            jobId: jobId
        });

        emit RentalStarted(
            rentalId,
            msg.sender,
            provider,
            jobId,
            pricePerSecond
        );
    }

    /**
     * @notice 세션 키로 렌탈 시작 (서명 기반)
     */
    function startRentalWithSessionKey(
        address sessionKey,
        address provider,
        uint256 pricePerSecond,
        string calldata jobId
    ) external returns (uint256 rentalId) {
        SessionKey storage sk = sessionKeys[sessionKey];

        if (!sk.isActive) revert InvalidSessionKey();
        if (block.timestamp > sk.expiry) revert SessionKeyExpired();

        address mainWallet = sk.mainWallet;
        require(deposits[mainWallet] > 0, "Deposit required");

        rentalId = rentalCount++;

        rentals[rentalId] = Rental({
            renter: mainWallet,
            provider: provider,
            pricePerSecond: pricePerSecond,
            startTime: block.timestamp,
            isActive: true,
            jobId: jobId
        });

        emit RentalStarted(
            rentalId,
            mainWallet,
            provider,
            jobId,
            pricePerSecond
        );
    }

    /**
     * @notice 렌탈 종료 및 정산
     * @param rentalId 렌탈 ID
     */
    function endRental(uint256 rentalId) external nonReentrant {
        Rental storage rental = rentals[rentalId];
        if (!rental.isActive) revert RentalNotActive();

        // 사용 시간 계산
        uint256 duration = block.timestamp - rental.startTime;
        uint256 totalCost = duration * rental.pricePerSecond;

        if (totalCost > 0) {
            if (deposits[rental.renter] < totalCost)
                revert InsufficientDeposit();

            // 플랫폼 수수료 계산
            uint256 platformFee = (totalCost * platformFeeBps) / 10000;
            uint256 providerPayment = totalCost - platformFee;

            // 예치금에서 차감
            deposits[rental.renter] -= totalCost;

            // Provider에게 지급
            paymentToken.safeTransfer(rental.provider, providerPayment);

            // 플랫폼 수수료 지급
            if (platformFee > 0) {
                paymentToken.safeTransfer(feeRecipient, platformFee);
            }

            emit RentalEnded(rentalId, totalCost, platformFee);
        }

        rental.isActive = false;
    }

    // ============ 오프체인 서명 기반 지불 ============

    /**
     * @notice 세션 키 서명으로 지불 처리
     * @dev 백엔드에서 수집한 서명으로 일괄 정산
     */
    function processPaymentWithSessionKey(
        address sessionKey,
        address to,
        uint256 amount,
        string calldata jobId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert DeadlineExpired();

        SessionKey storage sk = sessionKeys[sessionKey];
        if (!sk.isActive) revert InvalidSessionKey();
        if (block.timestamp > sk.expiry) revert SessionKeyExpired();

        // 세션 키 지출 한도 확인
        if (sk.spentAmount + amount > sk.spendLimit)
            revert SpendLimitExceeded();

        address mainWallet = sk.mainWallet;

        // EIP-712 서명 검증
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_TYPEHASH,
                mainWallet,
                to,
                amount,
                keccak256(bytes(jobId)),
                nonces[sessionKey]++,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        if (signer != sessionKey) revert InvalidSignature();

        // 잔액 확인
        if (deposits[mainWallet] < amount) revert InsufficientDeposit();

        // 지출 업데이트
        sk.spentAmount += amount;
        deposits[mainWallet] -= amount;

        // 지급
        paymentToken.safeTransfer(to, amount);

        emit PaymentProcessed(mainWallet, to, amount, jobId);
    }

    // ============ 조회 함수 ============

    function getSessionKey(
        address sessionKey
    ) external view returns (SessionKey memory) {
        return sessionKeys[sessionKey];
    }

    function getUserSessionKeys(
        address user
    ) external view returns (address[] memory) {
        return userSessionKeys[user];
    }

    function getRental(uint256 rentalId) external view returns (Rental memory) {
        return rentals[rentalId];
    }

    function getAvailableBalance(address user) external view returns (uint256) {
        return deposits[user];
    }

    function calculateRentalCost(
        uint256 rentalId
    ) external view returns (uint256) {
        Rental storage rental = rentals[rentalId];
        if (!rental.isActive) return 0;

        uint256 duration = block.timestamp - rental.startTime;
        return duration * rental.pricePerSecond;
    }

    // ============ 관리자 함수 ============

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high"); // 최대 10%
        platformFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }

    // EIP-712 도메인 분리자
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
