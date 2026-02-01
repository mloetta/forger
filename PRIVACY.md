# Privacy Policy – Forger

**1. Overview**

Forger is a Discord bot that provides game content browsing and analytics features. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data. This policy is effective immediately and applies to all users of Forger, whether using it in Discord servers or as a personal User App.

**2. Information We Collect**

### 2.1 User Identification Data
- **Discord Username**: Your Discord display name
- **Discord User ID**: Your unique Discord numerical identifier
- **Discord Avatar**: Your profile picture (if displayed in interactions)

### 2.2 Contextual Information
- **Guild ID**: The Discord server where you use the Bot (if applicable)
- **Guild Owner ID**: The ID of the server owner (for permission verification)
- **Channel ID**: The specific channel where interactions occur
- **Member Roles**: Your roles in the server (for permission checks)
- **Interaction ID & Type**: Unique identifier and type of each interaction
- **Timestamps**: When interactions occur

### 2.3 Command Usage Data
- Command names you execute (e.g., `/ore`, `/armor`, `/weapon`, `/pickaxe`, `/ping`, `/help`)
- Parameters you provide (e.g., which weapon you searched for)
- Autocomplete suggestions you interact with

### 2.4 Bug Report Submissions
When you use the bug report feature, we collect:
- Your bug description (text you provide)
- Reproduction steps (text you provide)
- Screenshots and attachments you upload
- Your User ID (linked to the report)
- Submission timestamp

Bug reports are stored in a dedicated Discord forum channel in our support server for review and action.

### 2.5 Analytics & Performance Data
When enabled, the Bot collects:
- REST API request details: HTTP method, endpoint route, timestamp
- Rate-limiting bucket information
- Request latency and response timing
- Gateway latency measurements
- Shard information (for multi-shard operations)

### 2.6 Access Control Data
- **Blacklist Records**: User IDs of users restricted from using the Bot
- **Blacklist Actions**: When users are added/removed from the blacklist

**3. How We Use Your Information**

Your data is used exclusively for these purposes:

| Purpose | Data Used | Why |
|---------|-----------|-----|
| **Performance Improvement** | Username, User ID, Command usage, Analytics | Identify patterns and optimize bot speed/stability |
| **System Health Monitoring** | REST analytics, Gateway latency, Timestamps | Ensure reliable service availability |
| **Bug Resolution** | Bug reports, Screenshots, User context | Identify and fix issues reported by users |
| **Abuse Prevention** | User ID, Blacklist records, Command logs | Prevent misuse and enforce restrictions |
| **Service Maintenance** | All data types | Monitor resources and maintain operations |
| **Logging & Debugging** | Interaction data, Error logs | Track issues during active use |

**4. Data Storage & Infrastructure**

Your data is stored in the following systems under the developer's control:

| System | Data Stored | Purpose |
|--------|------------|---------|
| **Redis Database** | User IDs (Blacklist only) | Fast access control |
| **InfluxDB** | REST API analytics (if enabled) | Performance metrics and historical tracking |
| **Application Logs** | Interaction events, Command usage | Real-time debugging and monitoring |
| **Discord Forum** | Bug reports | Organized storage for review and action |

All systems maintain reasonable security measures including encrypted connections and access controls.

**5. Data Sharing & Third Parties**

**We do NOT share your personal data with external third parties.**

However, be aware:
- **Discord**: Bug reports are stored in Discord forum channel (visible to authorized moderators only)
- **Bot Developer & Staff**: Have access to all data for maintenance and support
- **Legal Requirements**: Data may be disclosed if legally required

**6. Data Retention & Deletion**

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Usernames & IDs (Active Users) | While bot is active | Ongoing analytics |
| Blacklist Records | Indefinite (until removal) | Access control requires permanent records |
| Bug Reports | Indefinite | Historical reference for future improvements |
| REST Analytics | 30-90 days (configurable) | Historical performance data |
| Command/Interaction Logs | Real-time only | Logs are cleared upon bot restart |
| Guild/Channel IDs | While bot active in server | Lost when bot removed |

**Users can request:**
- **Data Export**: A copy of all personal data we hold
- **Data Deletion**: Removal of identifying information (except where legally required)
- **Analytics Opt-Out**: Exclusion from future analytics collection

To request these, contact the bot developer via our support server.

**7. No Profiling or Automated Decision-Making**

- We do NOT create user profiles beyond what's necessary for access control
- We do NOT use data for profiling by server or individual users
- We do NOT make automated decisions that affect your access (except blacklisting)
- All automated decisions (blacklist enforcement) are subject to manual appeal

**8. Security Measures**

- ✅ Data encrypted in transit (HTTPS/secure connections)
- ✅ Database access restricted and password-protected
- ✅ Only authorized personnel can access stored data
- ✅ Regular security monitoring
- ✅ No data sharing with untrusted third parties

**9. Children's Privacy**

Forger is not directed to users under 13 years old (or applicable age in your jurisdiction). If we discover we've collected data from children, we will delete it immediately.

**10. Your Privacy Rights**

### 10.1 Right to Access
Request a copy of all personal data we've collected about you.

### 10.2 Right to Delete
Request deletion of your personal data (we will remove identifying information within 30 days, except where legally required to retain).

### 10.3 Right to Opt-Out
You can:
- Disable the Bot from your Discord app settings
- Leave servers where the Bot is active
- Request exclusion from future analytics
- Request removal from the blacklist (with justification)

### 10.4 Right to Complain
If you believe we're mishandling your data, you can:
- Contact the bot developer
- File a complaint with your regional data protection authority

**11. GDPR & International Users**

For users in the European Union, additional rights apply under GDPR:
- Right to data portability
- Right to restrict processing
- Right to object to processing

Although Forger is governed by Brazilian law, we respect GDPR rights. Please contact the developer to exercise these rights.

**12. Policy Changes**

We may update this Privacy Policy to reflect:
- Changes in data practices
- New features or functionalities
- Legal or regulatory requirements
- Improved transparency

Changes will be posted to this page. Continued use of Forger after updates constitutes acceptance of the new policy.

**13. Contacting Us**

For privacy concerns, data requests, or questions:

- **Support Server**: https://discord.gg/J3rbrfdFSV
- **Direct Message**: Contact the Bot developer via Discord
- **Include**: Your User ID to help us locate your data

**Response timeframe**: We aim to respond to privacy requests within 30 days.

**14. Governing Law**

This Privacy Policy is governed by the laws of Brazil. However, for users in jurisdictions with stricter privacy laws, those laws will be applied where applicable.

**Last Updated**: 2026-02-1
