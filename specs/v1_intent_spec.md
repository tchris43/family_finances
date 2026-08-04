# Family Finance — V1 Intent Spec

Technology-free behavior contract. Derived from `vision.md` plus pinned rulings in chat (2026-08-04).  
**Status:** locked (Taylor 2026-08-04).

---

## WHY

Help our household answer money questions with confidence: where money is, where it goes, whether every dollar has a job, whether upcoming costs are covered, whether goals stay on track, and whether we can afford a decision.

V1 must be usable by us from day one. Manual entry only (no bank sync).

---

## WHO

- One shared login for the household.
- Everyone on that login can see and edit everything.

---

## CORE OBJECTS (behavior meaning, not schema)

| Object | Meaning |
| --- | --- |
| **Account** | Where money sits (checking, savings, card, etc.) with a balance. |
| **Transaction** | A movement of money: spend, income, or transfer. |
| **Plan bucket** | A job for dollars this month (Groceries, Rent, Fun). Has assigned, spent, remaining. |
| **Goal** | A longer-term target (House, Car). Separate from buckets. Funded only by assigning Available → Goal. Used for on-track and affordability impact. |
| **Planned expense** | A dated obligation (rent, insurance, Christmas). Links to one bucket. **Covered** when that bucket has enough assigned/remaining for the expense amount. |
| **Available to Assign** | Dollars that still need a job. |

---

## PINNED RULES

1. Entering a paycheck increases **Available to Assign**.
2. Spending before assigning decreases **Available to Assign** (not only the account balance).
3. A normal spend updates: the transaction, and the category’s plan bucket (spent / remaining). It does **not** change goals.
4. Transfers (including paying a credit card) move money between accounts only — they are **not** spending and do not hit plan buckets as spend.
5. “Can we afford this?” returns **two** answers: (a) cash / Available now, (b) impact on goals — shown separately.
6. Goals are funded **only** by assigning Available → Goal.
7. Overspending a bucket is allowed; remaining may go negative.
8. Assigning **more than Available** is allowed; Available may go negative.
9. Leftover assigned money in a bucket rolls into the next month’s same bucket.
10. Goals and plan buckets are separate objects.
11. Day one: show the home experience empty, with a short path to add a first account / paycheck — do not lock dashboards behind a mandatory setup wall.

---

## ACCEPTANCE CRITERIA

### 1. Paycheck

**Given** Available to Assign is $0  
**When** I enter a paycheck of $1000  
**Then** Available to Assign is $1000

### 2. Assign to bucket

**Given** Available to Assign is $1000 and a Groceries bucket exists  
**When** I assign $200 to Groceries  
**Then** Available to Assign is $800 and Groceries assigned increases by $200

### 3. Assign to goal

**Given** Available to Assign is $800 and a House goal exists  
**When** I assign $300 to House  
**Then** Available to Assign is $500 and House goal current progress increases by $300

### 4. Spend (from a funded bucket)

**Given** Groceries has $200 assigned and $0 spent  
**When** I record a $50 groceries spend  
**Then** a $50 transaction exists, Groceries spent is $50, Groceries remaining is $150

### 5. Spend before assigning

**Given** Available to Assign is $500  
**When** I record a $40 spend without assigning first  
**Then** Available to Assign is $460

### 6. Transfer

**Given** Checking has $1000 and Savings has $0  
**When** I transfer $200 Checking → Savings  
**Then** Checking is $800, Savings is $200, and spending / plan-bucket spent totals are unchanged

### 7. Overspend bucket

**Given** Groceries has $200 assigned  
**When** I record a $250 groceries spend  
**Then** the spend is allowed and Groceries remaining is −$50

### 8. Over-assign

**Given** Available to Assign is $100  
**When** I assign $150 to a bucket (or goal)  
**Then** the assign is allowed and Available to Assign is −$50

### 9. Covered planned expense

**Given** a planned expense “Rent” for $1200 linked to the Rent bucket, and Rent bucket has at least $1200 assigned/remaining  
**When** I view upcoming expenses  
**Then** Rent shows as covered

### 10. Not covered planned expense

**Given** the same Rent expense and the Rent bucket has only $400  
**When** I view upcoming expenses  
**Then** Rent shows as not covered

### 11. Afford

**Given** I am considering a purchase  
**When** I use affordability  
**Then** I see whether we can cover it from cash/Available **and**, separately, how it affects goal timelines / on-track status

### 12. Day one

**Given** a brand-new household with no accounts or transactions  
**When** I open the app  
**Then** I can see the home experience and a clear path to add an account or paycheck without being blocked from the app

---

## FAILURE / EDGE CASES (explicit)

| Case | Expected |
| --- | --- |
| Spend more than bucket assigned | Allowed; bucket remaining negative |
| Assign more than Available | Allowed; Available negative |
| Transfer | Not treated as spend |
| Pay credit card | Treated as transfer, not spend |
| Goal progress | Does not move from ordinary spends; only from Available → Goal assigns |
| Month boundary | Leftover in a bucket rolls to next month’s same bucket |

---

## V1 OUT OF SCOPE (from vision)

- Automatic bank sync  
- Receipt OCR  
- AI assistant  
- Investment optimization  
- Tax prep  
- Retirement forecasting  

---

## SUCCESS (from vision)

In a normal month we can confidently answer: where we are, net worth, where money went, whether every dollar has a job, whether upcoming expenses are covered, goal progress, affordability, and what to do with the next paycheck.
