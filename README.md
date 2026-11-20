# 🏔️ TripSplit UPI — Vacation Group Finance & Auto QR Payment Tracker

> Built for the group "finance lead" to automatically capture incoming UPI QR payments, manage a shared central kitty/pot, track 10-member vacation expenses, and simplify cross-debts down to the minimum direct payments.

---

## 🚀 Key Features

1. **Central Trip Treasury (Kitty / Pot Mode)**
   - Pre-fund a shared pool before or during the trip.
   - Dynamic QR codes generated on the fly for any custom amount with pre-filled transaction tags.
   - Instant 1-click mobile deep links (`upi://pay?pa=...&am=...`) for Google Pay, PhonePe, and Paytm.

2. **Automated UPI Payment Capture**
   - **Bank SMS & Push Notification Parser**: Reads raw bank credit alerts (SBI, HDFC, ICICI, Axis, GPay, PhonePe) and auto-extracts amount, sender, and 12-digit UPI UTR.
   - **Inbound Webhook Endpoint**: `POST /api/webhooks/upi` accepts forwarded SMS alerts from Android background tools (e.g., MacroDroid or Tasker) and credits the friend's account in real time.
   - **Interactive In-App Simulator**: Test and verify payment capture with preset bank SMS templates.

3. **10-Member Flexible Expense Tracking**
   - Pay either from the **Central Pot** or **Directly out of pocket** by any of the 10 members.
   - Split equally across all 10 friends, or select specific subsets (e.g., only 5 people went skiing or ordered drinks), or assign custom amounts.

4. **Greedy Minimum-Cash-Flow Debt Simplification**
   - Eliminates the messy spiderweb of 45 cross-debts.
   - Computes the mathematical minimum number of direct transfers needed to settle the entire vacation.
   - 1-click **"Pay via UPI QR"** button for debtors and **"Mark Settled"** with celebration confetti.

5. **WhatsApp & Group Export**
   - 1-click formatted summary ready to copy & paste directly into your friends' WhatsApp group.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Icons & UI**: Lucide React + Canvas Confetti
- **QR Generation**: `qrcode` (SVG / Canvas)
- **Local Persistence**: Browser LocalStorage + Server Webhooks

---

## 🏃 Getting Started

### 1. Install & Run Locally

```bash
cd trip-split-upi
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Automating Payment Capture from your Android Phone

To automatically record credits when friends scan your personal UPI QR:

1. Install **MacroDroid** (Free from Google Play Store).
2. Create a new Macro:
   - **Trigger**: *Notification Received* (Select PhonePe, GPay, or Messages).
   - **Action**: *HTTP Request* (Method: `POST`).
   - **URL**: `https://your-domain.com/api/webhooks/upi` (or your ngrok / local tunnel URL during dev).
   - **Content-Type**: `application/json`
   - **Body**:
     ```json
     {
       "rawMessage": "[notification_text]",
       "sender": "[notification_title]"
     }
     ```
3. Whenever an SMS or notification arrives (e.g. *"Rs. 4,000 credited from Rohan Sharma"*), the app catches it, matches the friend, and updates the pot within 3 seconds!

---

## 🔗 Push to Your GitHub

To publish this project to your GitHub account (`anupamyagnish676-debug`):

```bash
cd trip-split-upi
git init
git add .
git commit -m "feat: complete TripSplit UPI vacation finance and debt simplification app"
git branch -M main
git remote add origin https://github.com/anupamyagnish676-debug/trip-split-upi.git
git push -u origin main
```
