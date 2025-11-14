# Assignment 2: User Stories & On-Chain Requirements

## Part A: User Stories & On-Chain Requirements Document

### **Project Value Proposition**

A mobile-first Solana payment app that provides UPI-like functionality for cryptocurrency transactions, enabling instant, low-fee payments using human-readable identifiers (VPAs) instead of complex wallet addresses.

### **Core User Personas**

#### 1. Individual Users (Primary)

- Daily crypto users seeking simple peer-to-peer payments
- UPI users transitioning to crypto payments
- Tech-savvy users wanting faster, cheaper alternatives

#### **2. Merchants (Secondary)**

- Small businesses accepting crypto payments
- Online vendors seeking low-fee payment processing
- Retail stores wanting instant settlement

#### **3. System Administrators (Supporting)**

- App maintainers managing user support
- Security monitors handling fraud prevention

### **Refined User Stories**

#### **Individual User Stories**

#### **Story 1:** User creates account with VPA

- User downloads app and connects Solana wallet
- User selects unique VPA identifier (e.g., "john@cryptoupi")
- System validates VPA availability and creates account

#### **Story 2:** User sends payment via VPA

- User enters recipient VPA and payment amount
- User confirms transaction details
- System processes payment instantly

#### **Story 3:** User receives payment notification

- System detects incoming payment
- User receives real-time notification
- User views updated balance

#### **Story 4:** User scans QR for payment

- User scans merchant QR code
- App pre-fills payment details
- User confirms and completes payment

#### **Merchant Stories**

#### **Story 5:** Merchant generates payment QR

- Merchant enters sale amount
- System generates QR code with payment details
- Customer scans and pays

#### **Story 6:** Merchant tracks payment status

- Merchant views pending payments
- System shows real-time payment confirmations
- Merchant receives settlement notification

### **On-Chain Requirements**

#### **Story 1: User creates account with VPA**

- Create PDA account using user's wallet address as seed
- Store VPA string with maximum 50 character limit
- Store user wallet public key for ownership verification
- Initialize account status as active
- Set initial sent/received balance counters to zero

#### **Story 2: User sends payment via VPA**

- Validate sender has sufficient token balance
- Look up recipient account by VPA identifier
- Execute SPL token transfer via CPI to token program
- Update sender's total_sent counter
- Update recipient's total_received counter
- Create payment record with timestamp and description

#### **Story 3: User receives payment notification**

- Emit program event with payment details
- Include sender VPA, amount, and timestamp
- Store payment record in recipient's transaction history
- Update recipient account balance counters

#### **Story 4: User scans QR for payment**

- Parse payment request from QR data structure
- Validate merchant account exists and is active
- Execute same payment flow as VPA transfer
- Include merchant-specific metadata in transaction

#### **Story 5: Merchant generates payment QR**

- Create merchant account with business verification
- Generate payment request with amount and description
- Encode merchant VPA and payment details in QR format
- Set payment expiration timestamp

#### **Story 6: Merchant tracks payment status**

- Query merchant account for incoming payments
- Filter payments by time range and status
- Aggregate payment totals and transaction counts
- Provide real-time payment event subscriptions

---

## Part B: Process Appendix

### **Part A Process Log**

#### **Manual User Brainstorming**

Initial comprehensive user list included: individual users, merchants, developers, wallet providers, regulators, token holders, payment processors, and system administrators.

#### **AI-Assisted Prioritization**

**AI Prompt:** "My project creates a Solana-based UPI alternative for crypto payments. User types: [full list]. Which 2-5 are most critical for POC?"

**AI Response:** Recommended individual users, merchants, and system administrators as core personas for demonstrating payment functionality.

**Decision:** Agreed with AI recommendations. Individual users prove core payment flow, merchants demonstrate real-world utility, administrators ensure system reliability.

#### **Function Mapping Results**

**AI Prompt:** "For crypto UPI app focusing on individual users, merchants, administrators - map key functions each performs."

Key functions identified: account creation, payment sending/receiving, QR generation/scanning, transaction monitoring, fraud prevention.

### **Part B Critique Process**

**AI Prompt:** "Review user stories and requirements for crypto UPI app. Are stories granular enough for technical mapping?"

**AI Feedback:** Stories needed more atomicity - "user creates account" should separate wallet connection from VPA creation.

#### **Refinements Made:**

- Split account creation into wallet connection + VPA selection
- Separated payment flow into amount entry + confirmation steps
- Added explicit validation steps for each user action

### **Part C Refinement Log**

**Before:** "User signs up and creates payment profile"
**After:** Split into "User connects wallet" and "User selects VPA identifier"
**Rationale:** Improved atomicity - each story represents single action

**Before:** "User makes payment to another user"
**After:** "User sends payment via VPA"
**Rationale:** Removed jargon, clarified specific payment method

**Before:** "Merchant processes customer payments"
**After:** Split into "Merchant generates payment QR" and "Merchant tracks payment status"
**Rationale:** Separated distinct merchant functions

### **Part D On-Chain Translation**

Each user story systematically converted to specific Solana program requirements:

- User actions → Program instruction definitions
- Data storage needs → Account struct specifications  
- Validation rules → Program constraint implementations
- Real-time updates → Event emission requirements

### **Key Technical Decisions:**

- PDA-based accounts for deterministic addressing
- SPL token integration for multi-currency support
- Event-driven architecture for real-time notifications
- Constraint-based validation for security

This approach ensures direct traceability from user needs to technical implementation, supporting rapid POC development while maintaining architectural integrity.

[1](https://solana.com/developers/courses/mobile/intro-to-solana-mobile)
[2](https://www.geeksforgeeks.org/system-design/designing-upi-system-design/)
[3](https://solana.com/developers/courses/onchain-development/anchor-pdas)
[4](https://www.anchor-lang.com/docs/basics/program-structure)