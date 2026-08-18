# Meta App Review Submission Guide — Digital Growth Studio

This guide outlines the precise steps, scripts, and details required to successfully submit the application for Meta App Review. Use these details inside the [Meta App Dashboard console](https://developers.facebook.com).

---

## 1. Compliance URL Fields
Provide these URLs under the **App Settings > Basic** tab in the Meta Developer Console:
* **Privacy Policy URL**: `https://digital-growth-studio.web.app/privacy`
* **User Data Deletion Callback URL**: `https://digital-growth-studio.web.app/data-deletion`
* **Data Deletion Option**: Select *Data Deletion Instructions URL* and enter the link.

---

## 2. Permissions to Request
You must submit App Review cases for the following three permissions to unlock live Graph API access for standard users:

### A. `ads_read`
* **Use Case**: Allows the app to read campaign, adset, and ad-level performance metrics (Spend, ROAS, Purchases, impressions, clicks, CTR) to populate the analytics dashboard.
* **Submission text**:
  > Our app, Digital Growth Studio, synchronizes advertising campaign metrics from the Facebook Graph API. We calculate CTR, ROAS, and campaign CPA over the past 30 days to render overview trend charts and tables. This permission is critical for loading campaign data into our dashboard.

### B. `ads_management`
* **Use Case**: Required to execute recommendation card updates (such as pausing underperforming ads, scaling campaign budgets, or scaling bids) directly in the user's Meta Account.
* **Submission text**:
  > Digital Growth Studio utilizes a rules-based recommendation engine. When users click the "Apply" button on an AI warning card, the app uses this permission to automatically apply budget scales or pause ad creatives directly inside their Meta Ad Account.

### C. `business_management`
* **Use Case**: Enables listing the client's business accounts and connected ad accounts to complete active selectors.
* **Submission text**:
  > This permission allows our dashboard users to select which specific Ad Account or Business Account they want to synchronize data from. We list their connected Meta business structures to store and select active ad account profiles.

---

## 3. Screencast Video Recording Script
You must record a short screen-share video demonstrating the OAuth connection flow.

### Recording Steps:
1. **Login**: Show the login screen (`https://digital-growth-studio.web.app/login`). Log in using a test account.
2. **Meta Connect Trigger**: Navigate to the Settings tab > Meta Ad Accounts page. Click the **"Connect Facebook Account"** button.
3. **Facebook Dialog**: Show the Facebook OAuth pop-up login prompt. Enter credentials and click Continue, accepting permissions (`ads_read`, `ads_management`, `business_management`).
4. **Ad Account Selection**: Redirect back to Digital Growth Studio showing the list of fetched Ad Accounts. Toggle the switch to "Select" and active sync one.
5. **Dashboard Visuals**: Navigate back to the home route. Show the Recharts performance trend graphs (Spend, ROAS, Purchases) populated with synced statistics.
6. **AI Warning Actions**: Go to the **Recommendations** page. Click **"Apply"** on a low-CTR creative recommendation to show database state modification.
7. **Bypass Disclaimer**: Mention that budget and creative state transitions are updated in the SQL tables while the Meta Graph API changes are simulated in the sandbox.

---

## 4. Test User Seeding
Under the Developer Console > **Roles > Test Users** tab:
1. Click **Create** to seed a new FB Test User profile.
2. Assign the test user page permissions.
3. Provide the Test User credentials (login email, password) to the Meta App Reviewers during submission so they can log in and replicate the OAuth steps.
